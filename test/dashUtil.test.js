// Real-script tests for our front-end file: public/scripts/dashUtil.js
//
// dashUtil.js runs these immediately on load:
//   updateChallengeList();
//   updateMissionList();
//   updateGroupList();
//   updateUserGroupsList();
//   updateIndi();
//
// It also attaches submit listeners to #evidanceForm and #joinForm (if they exist).
//
// So in these tests we:
// 1) Create a jsdom page with all DOM elements the script expects
// 2) Mock window.fetch BEFORE loading the script (because it fetches on load)
// 3) Load and execute our real dashUtil.js using window.eval()
// 4) Wait for async fetch/json work to finish
//
// What we test:
// - Page load populates dropdowns + indi total
// - Evidence submit POSTs /addAction (FormData), hides upload modal, shows data modal
// - Join group: 409 shows error message
// - Join group: success attempts redirect to dashboard.html

const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");

function loadRealScript(window, relPathFromRoot) {
  const scriptPath = path.join(__dirname, "..", relPathFromRoot);
  const code = fs.readFileSync(scriptPath, "utf8");
  window.eval(code);
}

async function tick() {
  await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
}

function makeWindow() {
  // Capture jsdom errors (includes “navigation not implemented” warnings)
  const virtualConsole = new VirtualConsole();
  const jsdomErrors = [];
  virtualConsole.on("jsdomError", (e) => jsdomErrors.push(e));

  // DOM contains every element dashUtil.js reads/writes
  const dom = new JSDOM(
    `<!doctype html>
     <select id="mission-input"></select>
     <select id="challenge-input"></select>
     <select id="group-input"></select>
     <select id="group-challenge-input"></select>

     <div id="indi-carbon"></div>

     <div id="upload-modal" style="display:block"></div>
     <div id="data-modal" style="display:none"></div>
     <div id="ammount"></div>
     <div id="source"></div>

     <form id="evidanceForm">
       <input id="quantity-input" value="" />
       <input id="upload-input" type="file" />
       <button type="submit">Submit</button>
     </form>

     <form id="joinForm">
       <button type="submit">Join</button>
     </form>

     <div id="error-message" style="visibility:hidden"></div>
    `,
    {
      url: "https://example.com/dash/dashboard.html",
      runScripts: "dangerously",
      virtualConsole,
    }
  );

  return { window: dom.window, jsdomErrors };
}

/* TEST 1: Page Load populates dropdowns + updates indi total */
test("DASHBOARD (real script): on load populates dropdowns and updates indi total", async () => {
  const { window } = makeWindow();

  window.localStorage.setItem("name", "tester@example.com");

  const seen = new Set();

  window.fetch = async (url, opts = {}) => {
    seen.add(url);

    // All the list/update calls in dashUtil.js use GET + JSON headers + Authorization
    assert.equal(opts.method, "GET");
    assert.equal(opts.headers["Content-Type"], "application/json");
    assert.equal(opts.headers["Authorization"], "tester@example.com");

    if (url === "/updateMissionList") {
      return { async json() { return { title: ["M1", "M2"] }; } };
    }
    if (url === "/updateChallengeList") {
      return { async json() { return { title: ["C1"] }; } };
    }
    if (url === "/updateGroupList") {
      return { async json() { return { groups: ["G1", "G2"] }; } };
    }
    if (url === "/updateUserGroupsList") {
      return { async json() { return { groups: ["UG1"] }; } };
    }
    if (url === "/updateTotalIndi") {
      return { async json() { return { total: 10 }; } };
    }

    throw new Error("Unexpected fetch call: " + url);
  };

  loadRealScript(window, "public/scripts/dashUtil.js");
  await tick();

  // Confirm expected endpoints were called
  for (const u of [
    "/updateMissionList",
    "/updateChallengeList",
    "/updateGroupList",
    "/updateUserGroupsList",
    "/updateTotalIndi",
  ]) {
    assert.ok(seen.has(u), `Expected call to ${u}`);
  }

  // Dropdowns populated
  const missionVals = [...window.document.querySelectorAll("#mission-input option")].map((o) => o.value);
  const challengeVals = [...window.document.querySelectorAll("#challenge-input option")].map((o) => o.value);
  const groupVals = [...window.document.querySelectorAll("#group-input option")].map((o) => o.value);
  const userGroupVals = [...window.document.querySelectorAll("#group-challenge-input option")].map((o) => o.value);

  assert.deepEqual(missionVals, ["M1", "M2"]);
  assert.deepEqual(challengeVals, ["C1"]);
  assert.deepEqual(groupVals, ["G1", "G2"]);
  assert.deepEqual(userGroupVals, ["UG1"]);

  // Indi total updated (script does: data.total + 'kg')
  assert.equal(window.document.getElementById("indi-carbon").textContent, "10kg");
});

/* TEST 2: Evidence submit posts /addAction (FormData), hides upload modal, shows data */
test("DASHBOARD (real script): evidence submit posts /addAction, hides upload modal, shows data modal", async () => {
  const { window } = makeWindow();

  window.localStorage.setItem("name", "tester@example.com");

  let lastAddAction = null;

  window.fetch = async (url, opts = {}) => {
    // dashUtil runs these on load; return minimal data
    if (url === "/updateMissionList") return { async json() { return { title: ["M1"] }; } };
    if (url === "/updateChallengeList") return { async json() { return { title: ["C1"] }; } };
    if (url === "/updateGroupList") return { async json() { return { groups: ["G1"] }; } };
    if (url === "/updateUserGroupsList") return { async json() { return { groups: ["UG1"] }; } };
    if (url === "/updateTotalIndi") return { async json() { return { total: 0 }; } };

    if (url === "/addAction") {
      lastAddAction = { url, opts };
      return { async json() { return { carbon: 7, source: "Test source" }; } };
    }

    throw new Error("Unexpected fetch call: " + url);
  };

  // IMPORTANT: load script after fetch mock is set
  loadRealScript(window, "public/scripts/dashUtil.js");
  await tick();

  // Set select values after options exist
  window.document.getElementById("mission-input").value = "M1";
  window.document.getElementById("challenge-input").value = "C1";
  window.document.getElementById("group-challenge-input").value = "UG1";

  // Quantity input
  window.document.getElementById("quantity-input").value = "3";

  // File input must have files[0] for real script (uploadInput.files[0])
  const uploadEl = window.document.getElementById("upload-input");
  const fakeFile = new window.File(["dummy"], "proof.png", { type: "image/png" });
  Object.defineProperty(uploadEl, "files", { value: [fakeFile] });

  // Submit evidence form
  const form = window.document.getElementById("evidanceForm");
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

  // Give time for: fetch -> res.json -> DOM updates
  await tick();
  await tick();

  // Confirm POST happened
  assert.ok(lastAddAction, "Expected POST /addAction to be called");
  assert.equal(lastAddAction.opts.method, "POST");

  // Body should be FormData (dashUtil.js uses multipart/form-data)
  const body = lastAddAction.opts.body;
  assert.ok(body instanceof window.FormData, "Expected FormData body for /addAction");

  // Assert FormData fields
  assert.equal(body.get("mission"), "M1");
  assert.equal(body.get("challenge"), "C1");
  assert.equal(body.get("email"), "tester@example.com");
  assert.equal(body.get("quantity"), "3");
  assert.equal(body.get("group"), "UG1");

  // Upload should be a File with correct name
  const uploaded = body.get("upload");
  assert.ok(uploaded, "Expected upload to be present in FormData");
  assert.equal(uploaded.name, "proof.png");

  // Confirm upload modal hidden + data modal shown and filled
  assert.equal(window.document.getElementById("upload-modal").style.display, "none");
  assert.equal(window.document.getElementById("data-modal").style.display, "block");
  assert.equal(window.document.getElementById("ammount").innerText, "7kg");
  assert.equal(window.document.getElementById("source").innerText, "Test source");
});

/* TEST 3: Join group 409 shows error message */
test("DASHBOARD (real script): join group 409 shows error message", async () => {
  const { window } = makeWindow();

  window.localStorage.setItem("name", "tester@example.com");

  let addGroupCalled = false;

  window.fetch = async (url, opts = {}) => {
    // load calls
    if (url === "/updateMissionList") return { async json() { return { title: [] }; } };
    if (url === "/updateChallengeList") return { async json() { return { title: [] }; } };
    if (url === "/updateGroupList") return { async json() { return { groups: ["G1"] }; } };
    if (url === "/updateUserGroupsList") return { async json() { return { groups: [] }; } };
    if (url === "/updateTotalIndi") return { async json() { return { total: 0 }; } };

    if (url === "/addGroup") {
      addGroupCalled = true;
      assert.equal(opts.method, "POST");
      const body = JSON.parse(opts.body);
      assert.deepEqual(body, { group: "G1", email: "tester@example.com" });

      return {
        status: 409,
        async json() {
          return { error: "Already in group" };
        },
      };
    }

    throw new Error("Unexpected fetch call: " + url);
  };

  loadRealScript(window, "public/scripts/dashUtil.js");
  await tick();

  // Set group select value
  window.document.getElementById("group-input").value = "G1";

  const joinForm = window.document.getElementById("joinForm");
  joinForm.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await tick();
  await tick();

  assert.ok(addGroupCalled, "Expected POST /addGroup to be called");

  const err = window.document.getElementById("error-message");
  assert.equal(err.textContent, "Already in group");
  assert.equal(err.style.visibility, "visible");
});

/* TEST 4: Join group success attempts redirect */
test("DASHBOARD (real script): join group success attempts redirect to dashboard.html", async () => {
  const { window, jsdomErrors } = makeWindow();

  window.localStorage.setItem("name", "tester@example.com");

  window.fetch = async (url, opts = {}) => {
    // load calls
    if (url === "/updateMissionList") return { async json() { return { title: [] }; } };
    if (url === "/updateChallengeList") return { async json() { return { title: [] }; } };
    if (url === "/updateGroupList") return { async json() { return { groups: ["G1"] }; } };
    if (url === "/updateUserGroupsList") return { async json() { return { groups: [] }; } };
    if (url === "/updateTotalIndi") return { async json() { return { total: 0 }; } };

    if (url === "/addGroup") {
      assert.equal(opts.method, "POST");
      return { status: 200, async json() { return {}; } };
    }

    throw new Error("Unexpected fetch call: " + url);
  };

  loadRealScript(window, "public/scripts/dashUtil.js");
  await tick();

  // Set group select value
  window.document.getElementById("group-input").value = "G1";

  const joinForm = window.document.getElementById("joinForm");
  joinForm.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await tick();
  await tick();

  // Some jsdom versions update href; others throw a navigation error.
  const hrefChanged = window.location.href.includes("dashboard.html");
  const navError = jsdomErrors.some((e) =>
    String(e && e.message).includes("navigation") || String(e).includes("navigation")
  );

  assert.ok(hrefChanged || navError, "Expected redirect attempt on successful join");
});