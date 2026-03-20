const { JSDOM } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");

// Loads a real browser script into a JSDOM window by reading it from disk
// and passing it to eval — simulating how a browser would execute it.
function loadRealScript(window, relPathFromRoot) {
  const scriptPath = path.join(__dirname, "..", "..", relPathFromRoot);
  const code = fs.readFileSync(scriptPath, "utf8");
  window.eval(code);
}

// Yields control back to the event loop, allowing any pending
// fetch callbacks and DOM updates to settle.
async function tick() {
  await new Promise((r) => setTimeout(r, 0));
}

// Creates a JSDOM window with the moderator submissions page structure.
// Includes the submissions container, approve/deny modal, backdrop, and form.
function makeWindow() {
  const dom = new JSDOM(
    `<!doctype html>
     <div id="submissions-container">OLD CONTENT</div>

     <div id="approveDeny-modal" style="display:none"></div>
     <div id="backdrop" style="display:none"></div>

     <form id="approveDenyForm">
      <span class="error" id="approval-error"></span>
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

// Returns a jest.fn() that handles the two endpoints submissionsUtil.js uses:
// - /updateSubmissionsList: returns the provided submissions data object
// - /approveDeny: uses an optional override for tests that need to inspect the POST,
//   otherwise returns a default 200 response
function makeSubmissionsFetch(submissions, overrides = {}) {
  return jest.fn(async (url, opts = {}) => {
    if (url === "/updateSubmissionsList") {
      return { json: async () => submissions };
    }
    if (url === "/approveDeny") {
      if (overrides["/approveDeny"]) return overrides["/approveDeny"](opts);
      return { status: 200, json: async () => ({}) };
    }
    throw new Error("Unexpected fetch: " + url);
  });
}

// Reset all mocks between tests to prevent state leaking across tests.
beforeEach(() => {
  jest.clearAllMocks();
});

// On load, submissionsUtil.js should fetch /updateSubmissionsList and group
// the results by challenge_title, rendering one .challenge container per group
// with a .card and evidence image for each submission.
test("SUBMISSIONS: groups by challenge_title and renders submissions + cards + image", async () => {
  const window = makeWindow();

  // Two submissions for Challenge X, one for Challenge Y.
  window.fetch = makeSubmissionsFetch({
    title: ["Log 1", "Log 2", "Log 3"],
    id: ["A", "A", "B"],
    evidence: ["img1.png", "img2.png", "img3.png"],
    challenge_title: ["Challenge X", "Challenge X", "Challenge Y"],
    flag: [null, null, null],
  });

  loadRealScript(window, "public/scripts/submissionsUtil.js");
  await tick();

  const calledUrls = window.fetch.mock.calls.map(([url]) => url);
  expect(calledUrls).toContain("/updateSubmissionsList");

  const groups = window.document.querySelectorAll("#submissions-container .challenge");
  expect(groups.length).toBe(2);

  const groupX = [...groups].find((g) => g.dataset.id === "Challenge X");
  expect(groupX).toBeTruthy();
  expect(groupX.querySelector(".challenge_title").textContent).toBe("Challenge X");
  expect(groupX.querySelectorAll(".card").length).toBe(2);

  // Each card should contain an evidence image with the correct src.
  const imgsX = groupX.querySelectorAll("img.evidence-photo");
  expect(imgsX.length).toBe(2);
  expect(imgsX[0].getAttribute("src")).toBe("img1.png");
  expect(imgsX[1].getAttribute("src")).toBe("img2.png");

  const groupY = [...groups].find((g) => g.dataset.id === "Challenge Y");
  expect(groupY).toBeTruthy();
  expect(groupY.querySelector(".challenge_title").textContent).toBe("Challenge Y");
  expect(groupY.querySelectorAll(".card").length).toBe(1);
});

// Clicking a submission card should set the selected submission and
// open the approve/deny modal and backdrop.
test("SUBMISSIONS: clicking a card opens modal and backdrop", async () => {
  const window = makeWindow();

  window.fetch = makeSubmissionsFetch({
    title: ["Log 1", "Log 2"],
    id: ["A", "A"],
    evidence: ["img1.png", "img2.png"],
    challenge_title: ["Challenge X", "Challenge X"],
    flag: [null, null],
  });

  loadRealScript(window, "public/scripts/submissionsUtil.js");
  await tick();

  // Pre-check: both modal and backdrop should be hidden before any interaction.
  expect(window.document.getElementById("approveDeny-modal").style.display).toBe("none");
  expect(window.document.getElementById("backdrop").style.display).toBe("none");

  const card = window.document.querySelector(".card");
  expect(card).toBeTruthy();
  card.click();

  expect(window.document.getElementById("approveDeny-modal").style.display).toBe("block");
  expect(window.document.getElementById("backdrop").style.display).toBe("block");
});

// Submitting the approve/deny form should POST to /approveDeny with the
// correct JSON payload, then close the modal and backdrop.
test("SUBMISSIONS: approveDenyForm submit posts correct data and closes modal", async () => {
  const window = makeWindow();

  window.fetch = makeSubmissionsFetch({
    title: ["Log 1"],
    id: ["A"],
    evidence: ["img1.png"],
    challenge_title: ["Challenge X"],
    flag: [null],
  });

  loadRealScript(window, "public/scripts/submissionsUtil.js");
  await tick();

  // Click the card to set selectedSubmission, then manually open modal/backdrop
  // to confirm that submitting the form closes them.
  window.document.querySelector(".card").click();
  window.document.getElementById("approveDeny-modal").style.display = "block";
  window.document.getElementById("backdrop").style.display = "block";

  // Fill in the form fields before submitting.
  window.document.getElementById("reason-input").value = "Looks good";
  window.document.querySelector('input[name="val"][value="approve"]').checked = true;
  window.document.getElementById("identifying-info").checked = false;

  // Replace fetch after initial load so mock.calls only captures the POST,
  // not the earlier /updateSubmissionsList call.
  window.fetch = makeSubmissionsFetch({}, {
    "/approveDeny": async (opts) => {
      return { status: 200, json: async () => ({}) };
    },
  });

  const form = window.document.getElementById("approveDenyForm");
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await tick();

  expect(window.fetch).toHaveBeenCalledWith("/approveDeny", expect.objectContaining({ method: "POST" }));

  // Inspect the request body directly from mock.calls.
  const approveDenyCall = window.fetch.mock.calls.find(([url]) => url === "/approveDeny");
  const opts = approveDenyCall[1];

  expect(opts.headers["Content-Type"]).toBe("application/json");
  expect(JSON.parse(opts.body)).toEqual({
    outcome: "approve",
    reason: "Looks good",
    id: "A",
    info: false,
  });

  expect(window.document.getElementById("approveDeny-modal").style.display).toBe("none");
  expect(window.document.getElementById("backdrop").style.display).toBe("none");
});

// Before rendering new submissions, the script should clear any existing
// content in #submissions-container to avoid stale entries accumulating.
test("SUBMISSIONS: clears old submissions content before rendering", async () => {
  const window = makeWindow();

  window.fetch = makeSubmissionsFetch({
    title: ["Log 1"],
    id: ["A"],
    evidence: ["img1.png"],
    challenge_title: ["Challenge X"],
    flag: [null],
  });

  loadRealScript(window, "public/scripts/submissionsUtil.js");
  await tick();

  expect(window.document.getElementById("submissions-container").textContent).not.toContain("OLD CONTENT");

  const groups = window.document.querySelectorAll("#submissions-container .challenge");
  expect(groups.length).toBe(1);
});

// Submissions arriving in mixed challenge_title order should still be
// grouped correctly — all entries for the same title end up in one container.
test("SUBMISSIONS: groups correctly even when challenge titles are mixed order", async () => {
  const window = makeWindow();

  // Entries arrive as A, B, A: the script must group the two A entries together.
  window.fetch = makeSubmissionsFetch({
    title: ["A1", "B1", "A2"],
    id: ["A", "B", "A"],
    evidence: ["a1.png", "b1.png", "a2.png"],
    challenge_title: ["Challenge A", "Challenge B", "Challenge A"],
    flag: [null, null, null],
  });

  loadRealScript(window, "public/scripts/submissionsUtil.js");
  await tick();

  const groups = window.document.querySelectorAll("#submissions-container .challenge");
  expect(groups.length).toBe(2);

  const groupA = window.document.querySelector('.challenge[data-id="Challenge A"]');
  const groupB = window.document.querySelector('.challenge[data-id="Challenge B"]');

  expect(groupA).toBeTruthy();
  expect(groupB).toBeTruthy();
  expect(groupA.querySelectorAll(".card").length).toBe(2);
  expect(groupB.querySelectorAll(".card").length).toBe(1);
});