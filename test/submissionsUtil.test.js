// test/submissionsUtil.test.js
// submissionsUtil.js:
// Calls getSubmissions() immediately on load (GET /updateSubmissionsList)
// Groups submissions by challenge_title and renders grouped cards (with an image)
// Clicking a card sets selectedSubmission and opens approve/deny modal + backdrop
// Submitting approve/deny POSTs /approveDeny and closes modal + backdrop
//
// These tests use jsdom to simulate the browser DOM and mock fetch so no real
// network requests are made.

const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");

function loadRealScript(window, relPathFromRoot) {
  const scriptPath = path.join(__dirname, "..", relPathFromRoot);
  const code = fs.readFileSync(scriptPath, "utf8");
  window.eval(code);
}

async function tick() {
  await new Promise((r) => setTimeout(r, 0));
}

function makeWindow() {
  const dom = new JSDOM(
    `<!doctype html>
     <div id="submissions-container">OLD CONTENT</div>

     <div id="approveDeny-modal" style="display:none"></div>
     <div id="backdrop" style="display:none"></div>

     <form id="approveDenyForm">
       <input id="reason-input" value="" />
       <input type="radio" name="val" value="approve" />
       <input type="radio" name="val" value="deny" />
       <input type="checkbox" id="identifying-info" />
       <button type="submit">Submit</button>
     </form>`,
    { url: "https://example.com/mod.html", runScripts: "dangerously" }
  );

  return dom.window;
}

//TEST 1: getSubmissions groups by challenge_title and renders correct DOM /
test("SUBMISSIONS (real script): groups by challenge_title and renders submissions + cards + image", async () => {
  const window = makeWindow();

  let gotUrl = null;

  window.fetch = async (url, opts) => {
    if (url === "/updateSubmissionsList") {
      gotUrl = url;
      assert.ok(!opts || !opts.method || opts.method === "GET");
      return {
        async json() {
          // Two challenge titles: X has 2 logs, Y has 1 log
          return {
            title: ["Log 1", "Log 2", "Log 3"],
            id: ["A", "A", "B"],
            evidence: ["img1.png", "img2.png", "img3.png"],
            challenge_title: ["Challenge X", "Challenge X", "Challenge Y"],
            flag: [null, null, null]  // FIX: array instead of null, script does flag[i] in a loop
          };
        },
      };
    }

    if (url === "/approveDeny") return { status: 200, async json() { return {}; } };

    throw new Error("Unexpected fetch: " + url);
  };

  // Loading real script calls getSubmissions() immediately
  loadRealScript(window, "public/scripts/submissionsUtil.js");
  await tick();

  // Assert endpoint called
  assert.equal(gotUrl, "/updateSubmissionsList");

  // Assert 2 group containers created
  const groups = window.document.querySelectorAll("#submissions-container .challenge");
  assert.equal(groups.length, 2);

  // Challenge X should have challenge title "Challenge X" and 2 cards
  const groupX = [...groups].find((g) => g.dataset.id === "Challenge X");
  assert.ok(groupX, "Expected a group with data-id='Challenge X'");
  assert.equal(groupX.querySelector(".challenge_title").textContent, "Challenge X");
  assert.equal(groupX.querySelectorAll(".card").length, 2);

  // Check that each card contains an evidence img with correct src
  const imgsX = groupX.querySelectorAll("img.evidence-photo");
  assert.equal(imgsX.length, 2);
  assert.equal(imgsX[0].getAttribute("src"), "img1.png");
  assert.equal(imgsX[1].getAttribute("src"), "img2.png");

  // Challenge Y should have 1 card
  const groupY = [...groups].find((g) => g.dataset.id === "Challenge Y");
  assert.ok(groupY, "Expected a group with data-id='Challenge Y'");
  assert.equal(groupY.querySelector(".challenge_title").textContent, "Challenge Y");
  assert.equal(groupY.querySelectorAll(".card").length, 1);
});

test("SUBMISSIONS (real script): clicking a card opens modal/backdrop", async () => {
  const window = makeWindow();

  window.fetch = async (url) => {
    if (url === "/updateSubmissionsList") {
      return {
        async json() {
          return {
            title: ["Log 1", "Log 2"],
            id: ["A", "A"],
            evidence: ["img1.png", "img2.png"],
            challenge_title: ["Challenge X", "Challenge X"],
            flag: [null, null]  // FIX: array instead of null
          };
        },
      };
    }

    if (url === "/approveDeny") return { status: 200, async json() { return {}; } };

    throw new Error("Unexpected fetch: " + url);
  };

  loadRealScript(window, "public/scripts/submissionsUtil.js");
  await tick();

  // Pre-check: modal/backdrop hidden
  assert.equal(window.document.getElementById("approveDeny-modal").style.display, "none");
  assert.equal(window.document.getElementById("backdrop").style.display, "none");

  // Click first card
  const card = window.document.querySelector(".card");
  assert.ok(card);
  card.click();

  // Assert modal/backdrop show (this proves click handler ran)
  assert.equal(window.document.getElementById("approveDeny-modal").style.display, "block");
  assert.equal(window.document.getElementById("backdrop").style.display, "block");
});

//TEST 3: form submit posts decision/reason/id and closes modal /
test("SUBMISSIONS (real script): approveDenyForm submit posts correct data and closes modal", async () => {
  const window = makeWindow();

  window.fetch = async (url) => {
    if (url === "/updateSubmissionsList") {
      return {
        async json() {
          return {
            title: ["Log 1"],
            id: ["A"],
            evidence: ["img1.png"],
            challenge_title: ["Challenge X"],
            flag: [null]  // FIX: array instead of null
          };
        },
      };
    }
    if (url === "/approveDeny") return { status: 200, async json() { return {}; } };
    throw new Error("Unexpected fetch: " + url);
  };

  loadRealScript(window, "public/scripts/submissionsUtil.js");
  await tick();

  // Click card to set selectedSubmission and open modal/backdrop
  window.document.querySelector(".card").click();

  // Put modal/backdrop in open state to confirm submit closes them
  window.document.getElementById("approveDeny-modal").style.display = "block";
  window.document.getElementById("backdrop").style.display = "block";

  // Fill form inputs
  window.document.getElementById("reason-input").value = "Looks good";
  window.document.querySelector('input[name="val"][value="approve"]').checked = true;
  window.document.getElementById("identifying-info").checked = false;


  // Mock fetch again so we can capture POST /approveDeny payload
  let lastRequest = null;
  window.fetch = async (url, opts) => {
    if (url === "/approveDeny") {
      lastRequest = { url, opts };
      return { status: 200, async json() { return {}; } };
    }
    throw new Error("Unexpected fetch: " + url);
  };

  // Submit
  const form = window.document.getElementById("approveDenyForm");
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await tick();

  // Assert request
  assert.ok(lastRequest, "Expected POST /approveDeny");
  assert.equal(lastRequest.url, "/approveDeny");
  assert.equal(lastRequest.opts.method, "POST");
  assert.equal(lastRequest.opts.headers["Content-Type"], "application/json");

  const payload = JSON.parse(lastRequest.opts.body);
  assert.deepEqual(payload, {
    outcome: "approve",
    reason: "Looks good",
    id: "A",
    info : false
  });

  // Assert modal/backdrop closed
  assert.equal(window.document.getElementById("approveDeny-modal").style.display, "none");
  assert.equal(window.document.getElementById("backdrop").style.display, "none");
});

//TEST 4: clears previous content before rendering new submissions /
test("SUBMISSIONS (real script): clears old submissions content before rendering", async () => {
  const window = makeWindow();

  window.fetch = async (url) => {
    if (url === "/updateSubmissionsList") {
      return {
        async json() {
          return {
            title: ["Log 1"],
            id: ["A"],
            evidence: ["img1.png"],
            challenge_title: ["Challenge X"],
            flag: [null]  // FIX: array instead of null
          };
        },
      };
    }
    if (url === "/approveDeny") return { status: 200, async json() { return {}; } };
    throw new Error("Unexpected fetch: " + url);
  };

  loadRealScript(window, "public/scripts/submissionsUtil.js");
  await tick();

  // OLD CONTENT should be gone because innerHTML is reset
  assert.ok(
    !window.document.getElementById("submissions-container").textContent.includes("OLD CONTENT")
  );

  // New group should exist
  const groups = window.document.querySelectorAll("#submissions-container .challenge");
  assert.equal(groups.length, 1);
});

//TEST 5: groups correctly even when challenge titles are mixed order /
test("SUBMISSIONS (real script): groups correctly even when challenge titles are mixed order", async () => {
  const window = makeWindow();

  window.fetch = async (url) => {
    if (url === "/updateSubmissionsList") {
      return {
        async json() {
          // Mixed order: A, B, A
          return {
            title: ["A1", "B1", "A2"],
            id: ["A", "B", "A"],
            evidence: ["a1.png", "b1.png", "a2.png"],
            challenge_title: ["Challenge A", "Challenge B", "Challenge A"],
            flag: [null, null, null]  // FIX: array instead of null
          };
        },
      };
    }
    if (url === "/approveDeny") return { status: 200, async json() { return {}; } };
    throw new Error("Unexpected fetch: " + url);
  };

  loadRealScript(window, "public/scripts/submissionsUtil.js");
  await tick();

  const groups = window.document.querySelectorAll("#submissions-container .challenge");
  assert.equal(groups.length, 2);

  const groupA = window.document.querySelector('.challenge[data-id="Challenge A"]');
  const groupB = window.document.querySelector('.challenge[data-id="Challenge B"]');

  assert.ok(groupA);
  assert.ok(groupB);

  // A should have 2 cards, B should have 1
  assert.equal(groupA.querySelectorAll(".card").length, 2);
  assert.equal(groupB.querySelectorAll(".card").length, 1);
});