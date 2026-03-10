// test/submissionsUtil.test.js
// submissionsUtil.js:
// Calls getSubmissions() immediately on load (GET /updateSubmissionsList)
// Groups submissions by id and renders grouped cards (with an image)
// Clicking a group sets selectedSubmission and opens approve/deny modal + backdrop
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
       <button type="submit">Submit</button>
     </form>`,
    { url: "https://example.com/mod.html", runScripts: "dangerously" }
  );

  return dom.window;
}

//TEST 1: getSubmissions groups by id and renders correct DOM /
test("SUBMISSIONS (real script): groups by id and renders submissions + cards + image", async () => {
  const window = makeWindow();

  let gotUrl = null;

  window.fetch = async (url, opts) => {
    if (url === "/updateSubmissionsList") {
      gotUrl = url;
      assert.equal(opts.method, "GET");

      return {
        async json() {
          // Two ids: A has 2 logs, B has 1 log
          return {
            title: ["Log 1", "Log 2", "Log 3"],
            id: ["A", "A", "B"],
            evidence: ["img1.png", "img2.png", "img3.png"],
            challenge_title: ["Challenge X", "Challenge X", "Challenge Y"],
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
  const groups = window.document.querySelectorAll("#submissions-container .submission");
  assert.equal(groups.length, 2);

  // Group A should have challenge title "Challenge X" and 2 cards
  const groupA = [...groups].find((g) => g.dataset.id === "A");
  assert.ok(groupA, "Expected a group with data-id='A'");
  assert.equal(groupA.querySelector(".challenge_title").textContent, "Challenge X");
  assert.equal(groupA.querySelectorAll(".card").length, 2);

  // Check that each card contains an evidence img with correct src
  const imgsA = groupA.querySelectorAll("img.evidence-photo");
  assert.equal(imgsA.length, 2);
  assert.equal(imgsA[0].getAttribute("src"), "img1.png");
  assert.equal(imgsA[1].getAttribute("src"), "img2.png");

  // Group B should have 1 card
  const groupB = [...groups].find((g) => g.dataset.id === "B");
  assert.ok(groupB, "Expected a group with data-id='B'");
  assert.equal(groupB.querySelector(".challenge_title").textContent, "Challenge Y");
  assert.equal(groupB.querySelectorAll(".card").length, 1);
});

test("SUBMISSIONS (real script): clicking a group opens modal/backdrop", async () => {
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

  // Click group A
  const groupA = window.document.querySelector('.submission[data-id="A"]');
  assert.ok(groupA);
  groupA.click();

  // Assert modal/backdrop show (this proves click handler ran)
  assert.equal(window.document.getElementById("approveDeny-modal").style.display, "block");
  assert.equal(window.document.getElementById("backdrop").style.display, "block");
});

//TEST 3: form submit posts decision/reason/id/challenge_name and closes modal /
// FIX: removed mod_email from expected payload — approveDeny(outcome, reason, id, challenge_name)
//      never reads localStorage or includes mod_email in the JSON body.
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
          };
        },
      };
    }
    if (url === "/approveDeny") return { status: 200, async json() { return {}; } };
    throw new Error("Unexpected fetch: " + url);
  };

  loadRealScript(window, "public/scripts/submissionsUtil.js");
  await tick();

  // Click group to set selectedSubmission and open modal/backdrop
  window.document.querySelector('.submission[data-id="A"]').click();

  // Put modal/backdrop in open state to confirm submit closes them
  window.document.getElementById("approveDeny-modal").style.display = "block";
  window.document.getElementById("backdrop").style.display = "block";

  // Fill form inputs
  window.document.getElementById("reason-input").value = "Looks good";
  window.document.querySelector('input[name="val"][value="approve"]').checked = true;

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

  // FIX: payload matches JSON.stringify({ outcome, reason, id, challenge_name }) exactly —
  //      no mod_email field (script never reads localStorage or adds mod_email).
  const payload = JSON.parse(lastRequest.opts.body);
  assert.deepEqual(payload, {
    outcome: "approve",
    reason: "Looks good",
    id: "A",
    challenge_name: "Challenge X",
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
  const groups = window.document.querySelectorAll("#submissions-container .submission");
  assert.equal(groups.length, 1);
});

//TEST 5: groups correctly even when ids are mixed order /
test("SUBMISSIONS (real script): groups correctly even when ids are mixed order", async () => {
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
          };
        },
      };
    }
    if (url === "/approveDeny") return { status: 200, async json() { return {}; } };
    throw new Error("Unexpected fetch: " + url);
  };

  loadRealScript(window, "public/scripts/submissionsUtil.js");
  await tick();

  const groups = window.document.querySelectorAll("#submissions-container .submission");
  assert.equal(groups.length, 2);

  const groupA = window.document.querySelector('.submission[data-id="A"]');
  const groupB = window.document.querySelector('.submission[data-id="B"]');

  assert.ok(groupA);
  assert.ok(groupB);

  // A should have 2 cards, B should have 1
  assert.equal(groupA.querySelectorAll(".card").length, 2);
  assert.equal(groupB.querySelectorAll(".card").length, 1);
});

//TEST 6: submit still posts even if no decision radio selected /
// FIX: removed mod_email from expected payload — script never includes it.
//      outcome is omitted by JSON.stringify when decision is undefined (standard JS behaviour).
test("SUBMISSIONS (real script): submit works even if no decision radio selected", async () => {
  const window = makeWindow();

  window.fetch = async (url, opts) => {
    if (url === "/updateSubmissionsList") {
      return {
        async json() {
          return {
            title: ["Log 1"],
            id: ["A"],
            evidence: ["img1.png"],
            challenge_title: ["Challenge X"],
          };
        },
      };
    }

    if (url === "/approveDeny") {
      const payload = JSON.parse(opts.body);

      // NOTE: If no radio is selected, `decision` becomes undefined.
      // When we do JSON.stringify({ outcome: undefined, ... }),
      // JavaScript omits the `outcome` key entirely because `undefined` is not valid JSON.
      // So the backend receives { reason, id, challenge_name } with NO "outcome" field.
      // In the real UI this should be prevented by requiring the user to pick approve/deny,
      // but we test it here to document current behaviour.
      assert.ok(!("outcome" in payload), "Expected outcome to be omitted when decision is undefined");

      // FIX: payload only contains fields the script actually sends — no mod_email.
      assert.deepEqual(payload, {
        reason: "No decision picked",
        id: "A",
        challenge_name: "Challenge X",
      });

      return { status: 200, async json() { return {}; } };
    }

    throw new Error("Unexpected fetch: " + url);
  };

  loadRealScript(window, "public/scripts/submissionsUtil.js");
  await tick();

  // Click group to set selectedSubmission and open modal/backdrop
  window.document.querySelector('.submission[data-id="A"]').click();

  // Fill reason, but do NOT check any radio
  window.document.getElementById("reason-input").value = "No decision picked";

  // Submit
  window.document
    .getElementById("approveDenyForm")
    .dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

  await tick();

  // Modal/backdrop should be closed after submit
  assert.equal(window.document.getElementById("approveDeny-modal").style.display, "none");
  assert.equal(window.document.getElementById("backdrop").style.display, "none");
});