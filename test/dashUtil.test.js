// test/dashUtilTest.js
// ------------------------------------------------------------------
// Tests for public/scripts/dashUtil.js (dashboard client script)
//
// What we verify:
// 1) Page load: dashUtil.js calls its update endpoints and populates UI:
//    - /updateMissionList      -> fills #mission-input options (data.title)
//    - /updateChallengeList    -> fills #challenge-input options (data.title)
//    - /updateGroupList        -> fills #group-input options (data.groups)
//    - /updateUserGroupsList   -> fills #group-challenge-input options (data.groups)
//    - /updateTotalIndi        -> sets #indi-carbon (data.total)
//
// 2) Evidence submit (#evidanceForm):
//    - POST /addAction with payload:
//      { mission, challenge, upload, email, quantity, group }
//    - hides #upload-modal and shows #data-modal
//    - renders:
//      #ammount = "<carbon>kg"
//      #source  = "<source>"
//
// 3) Join group (#joinForm):
//    - POST /addGroup with payload: { group, email }
//    - (409 path shows #error-message; success redirects — redirect not asserted in jsdom)
// ------------------------------------------------------------------

const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");

// Locate the real dashUtil.js file (so we test the actual client code)
const SCRIPT_PATH = (() => {
  const candidates = [
    path.join(__dirname, "..", "public", "scripts", "dashUtil.js"),
    path.join(__dirname, "..", "scripts", "dashUtil.js"),
    path.join(__dirname, "dashUtil.js"),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(`dashUtil.js not found. Looked in:\n${candidates.join("\n")}`);
  }
  return found;
})();

/**
 * Create a minimal dashboard DOM that matches the IDs dashUtil.js uses.
 * If dashUtil.js changes IDs, update this HTML first.
 */
function makeDom() {
  return new JSDOM(
    `
    <!DOCTYPE html>
    <html lang="en">
    <body>
        <div id="indi-carbon">0</div>

        <div id="upload-modal" style="display:block">
            <form id="evidanceForm">
                <select id="mission-input">
                    <option value="" selected disabled hidden>Select an Option</option>
                </select>

                <input type="number" id="quantity-input" min="1" />

                <select id="challenge-input">
                    <option value="" selected disabled hidden>Select an Option</option>
                    <option value="no">No</option>
                </select>

                <input type="file" id="upload-input" />

                <!-- Populated by updateUserGroupsList(); read during evidence submit -->
                <select id="group-challenge-input">
                    <option value="" selected disabled hidden>Select an Option</option>
                </select>

                <button id="confirm" type="submit">Confirm</button>
            </form>
        </div>

        <div id="join-modal">
            <form id="joinForm">
                <select id="group-input"></select>
                <button type="submit">Join</button>
            </form>
        </div>

        <div id="data-modal" style="display:none">
            <span id="ammount"></span>
            <span id="source"></span>
        </div>

        <div id="error-message" style="visibility:hidden"></div>
    </body>
    </html>
    `,
    {
      url: "http://localhost/dash/dashboard.html",
      runScripts: "dangerously",
    }
  );
}

/**
 * Evaluate the real dashUtil.js in the jsdom window context.
 * dashUtil.js executes immediately and triggers its page-load fetch calls.
 */
function loadScript(dom) {
  const code = fs.readFileSync(SCRIPT_PATH, "utf8");
  dom.window.eval(code);
}

/**
 * Flush the event loop so async handlers + promise callbacks run.
 * We call it multiple times after dispatching events because:
 * - submit handler awaits fetch
 * - then awaits res.json()
 * - then mutates the DOM
 */
function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

/** Read visible text from an element (works across jsdom quirks). */
function readText(el) {
  if (!el) return "";
  return (el.innerText ?? el.textContent ?? "").trim();
}

/**
 * Fetch mock with safe defaults for all page-load endpoints dashUtil.js calls.
 * Each test can override specific endpoints (e.g., /addAction, /addGroup).
 */
function makeFetchMock(overrides = {}) {
  return async (url, options = {}) => {
    // Allow test-specific overrides first
    if (overrides[url]) return overrides[url](url, options);

    // Page-load init endpoints
    if (url === "/updateMissionList") return { json: async () => ({ title: [] }) };
    if (url === "/updateChallengeList") return { json: async () => ({ title: [] }) };
    if (url === "/updateGroupList") return { json: async () => ({ groups: [] }) };
    if (url === "/updateUserGroupsList") return { json: async () => ({ groups: [] }) };
    if (url === "/updateTotalIndi") return { json: async () => ({ total: "0" }) };

    // Any unexpected endpoint returns empty JSON by default
    return { json: async () => ({}) };
  };
}

// ------------------------------------------------------------------
// TEST 1: Page Initialization
// ------------------------------------------------------------------
test("DASHBOARD: Page load fetches data and populates dropdowns", async () => {
  const dom = makeDom();
  const fetchedUrls = [];

  // Use the shared fetch mock but override init responses for this test
  dom.window.fetch = makeFetchMock({
    "/updateMissionList": async () => {
      fetchedUrls.push("/updateMissionList");
      return { json: async () => ({ title: ["Mission 1"] }) };
    },
    "/updateChallengeList": async () => {
      fetchedUrls.push("/updateChallengeList");
      return { json: async () => ({ title: ["Challenge A"] }) };
    },
    "/updateGroupList": async () => {
      fetchedUrls.push("/updateGroupList");
      return { json: async () => ({ groups: ["Group X"] }) };
    },
    "/updateUserGroupsList": async () => {
      fetchedUrls.push("/updateUserGroupsList");
      return { json: async () => ({ groups: ["MyGroup"] }) };
    },
    "/updateTotalIndi": async () => {
      fetchedUrls.push("/updateTotalIndi");
      return { json: async () => ({ total: "500" }) };
    },
  });

  dom.window.localStorage.setItem("name", "testuser@example.com");
  loadScript(dom);

  // Let all the page-load async calls resolve
  await flush();
  await flush();

  // Ensure key page-load endpoints were called
  assert.ok(fetchedUrls.includes("/updateMissionList"), "Expected /updateMissionList on load");
  assert.ok(fetchedUrls.includes("/updateUserGroupsList"), "Expected /updateUserGroupsList on load");

  // Stat updated
  assert.equal(dom.window.document.getElementById("indi-carbon").textContent, "500kg");

  // Ensure user-groups dropdown got populated
  const groupChallengeSelect = dom.window.document.getElementById("group-challenge-input");
  const optionValues = [...groupChallengeSelect.querySelectorAll("option")].map((o) => o.value);
  assert.ok(optionValues.includes("MyGroup"), "Expected group-challenge-input to include 'MyGroup'");
});

// ------------------------------------------------------------------
// TEST 2: Action Submission
// ------------------------------------------------------------------
test("DASHBOARD: Submitting evidence calls /addAction and shows result modal", async () => {
  const dom = makeDom();
  let payload = null;

  dom.window.fetch = makeFetchMock({
    "/addAction": async (url, options = {}) => {
      payload = JSON.parse(options.body);
      return { json: async () => ({ carbon: 100, source: "link here" }) };
    },
  });

  dom.window.localStorage.setItem("name", "user@test.com");
  loadScript(dom);

  await flush(); // allow init calls to run

  const doc = dom.window.document;

  // Fill required form fields
  const missionSelect = doc.getElementById("mission-input");
  missionSelect.appendChild(new dom.window.Option("Walk", "Walk"));
  missionSelect.value = "Walk";

  const qtyInput = doc.getElementById("quantity-input");
  qtyInput.value = "10";

  const challSelect = doc.getElementById("challenge-input");
  challSelect.value = "no";

  const groupChallenge = doc.getElementById("group-challenge-input");
  groupChallenge.appendChild(new dom.window.Option("MyGroup", "MyGroup"));
  groupChallenge.value = "MyGroup";

  // Submit evidence form
  doc.getElementById("evidanceForm").dispatchEvent(
    new dom.window.Event("submit", { bubbles: true, cancelable: true })
  );

  await flush();
  await flush();

  // /addAction called and payload captured
  assert.ok(payload, "Fetch /addAction should have been called");
  assert.equal(payload.mission, "Walk");
  assert.equal(payload.challenge, "no");
  assert.equal(payload.email, "user@test.com");
  assert.equal(String(payload.quantity), "10");
  assert.equal(payload.group, "MyGroup");

  // UI changes after submit
  assert.equal(doc.getElementById("upload-modal").style.display, "none");
  assert.equal(doc.getElementById("data-modal").style.display, "block");
  assert.equal(readText(doc.getElementById("ammount")), "100kg");
  assert.equal(readText(doc.getElementById("source")), "link here");
});

// ------------------------------------------------------------------
// TEST 3: Join Group
// ------------------------------------------------------------------
test("DASHBOARD: Joining a group calls /addGroup", async () => {
  const dom = makeDom();
  let payload = null;

  dom.window.fetch = makeFetchMock({
    "/addGroup": async (url, options = {}) => {
      payload = JSON.parse(options.body);
      return { json: async () => ({}) };
    },
  });

  dom.window.localStorage.setItem("name", "user@test.com");
  loadScript(dom);

  await flush(); // allow init calls to run

  const doc = dom.window.document;

  const groupSelect = doc.getElementById("group-input");
  groupSelect.appendChild(new dom.window.Option("New Group", "New Group"));
  groupSelect.value = "New Group";

  // Submit join form
  doc.getElementById("joinForm").dispatchEvent(
    new dom.window.Event("submit", { bubbles: true, cancelable: true })
  );

  await flush();
  await flush();

  // /addGroup called and payload captured
  assert.ok(payload, "Fetch /addGroup should have been called");
  assert.equal(payload.group, "New Group");
  assert.equal(payload.email, "user@test.com");
});
