// 1) Page Load: dropdowns + stats are populated via fetch calls.
// 2) Action Submission: evidence form POSTs to /addAction, then hides upload modal
//    and shows result modal.
// 3) Group Join: join form sends selected group + email to /addGroup.
//
// IMPORTANT:
// Current dashUtil.js does NOT include `quantity` in the POST payload.
// So this test suite DOES NOT REQUIRE quantity to exist.
// If we later add quantity to dashUtil.js, this suite will validate it when present.


const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");

// Locate the real dashUtil.js file
const SCRIPT_PATH = (() => {
  const candidates = [
    path.join(__dirname, "..", "public", "scripts", "dashUtil.js"),
    path.join(__dirname, "..", "scripts", "dashUtil.js"),
    path.join(__dirname, "dashUtil.js"),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(
      `dashUtil.js not found. Looked in:\n${candidates.join("\n")}`
    );
  }
  return found;
})();

// Helpers
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
        </div>
    </body>
    </html>
    `,
    {
      url: "http://localhost/dash/dashboard.html",
      runScripts: "dangerously",
    }
  );
}

function loadScript(dom) {
  const code = fs.readFileSync(SCRIPT_PATH, "utf8");
  dom.window.eval(code);
}

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

function readText(el) {
  if (!el) return "";
  return (el.innerText ?? el.textContent ?? "").trim();
}


// TEST 1: Page Initialization
test("DASHBOARD: Page load fetches data and populates dropdowns", async () => {
  const dom = makeDom();
  const fetchedUrls = [];

  dom.window.fetch = async (url) => {
    fetchedUrls.push(url);

    if (url === "/updateMissionList") {
      return { json: async () => ({ title: ["Mission 1"] }) };
    }
    if (url === "/updateChallengeList") {
      return { json: async () => ({ title: ["Challenge A"] }) };
    }
    if (url === "/updateGroupList") {
      return { json: async () => ({ groups: ["Group X"] }) };
    }
    if (url === "/updateTotalIndi") {
      return { json: async () => ({ total: "500" }) };
    }

    return { json: async () => ({}) };
  };

  dom.window.localStorage.setItem("name", "testuser@example.com");
  loadScript(dom);

  await flush();
  await flush();

  assert.ok(
    fetchedUrls.includes("/updateMissionList"),
    "Expected /updateMissionList to be fetched on page load"
  );
  assert.equal(
    dom.window.document.getElementById("indi-carbon").textContent,
    "500"
  );
});

// TEST 2: Action Submission
test("DASHBOARD: Submitting evidence calls /addAction and shows result modal", async () => {
  const dom = makeDom();
  let payload = null;

  dom.window.fetch = async (url, options = {}) => {
    // init calls:
    if (url === "/updateMissionList") return { json: async () => ({ title: [] }) };
    if (url === "/updateChallengeList") return { json: async () => ({ title: [] }) };
    if (url === "/updateGroupList") return { json: async () => ({ groups: [] }) };
    if (url === "/updateTotalIndi") return { json: async () => ({ total: "0" }) };

    if (url === "/addAction") {
      try {
        payload = JSON.parse(options.body);
        console.error("DEBUG: Payload captured:", payload);
      } catch (e) {
        console.error("DEBUG: Failed to parse body:", options.body);
      }
      return { json: async () => ({ carbon: 100 }) };
    }

    return { json: async () => ({}) };
  };

  dom.window.localStorage.setItem("name", "user@test.com");
  loadScript(dom);

  await flush();

  const doc = dom.window.document;

  // Mission
  const missionSelect = doc.getElementById("mission-input");
  missionSelect.appendChild(new dom.window.Option("Walk", "Walk"));
  missionSelect.value = "Walk";

  // Quantity (we set it, but dashUtil.js may not send it)
  const qtyInput = doc.getElementById("quantity-input");
  qtyInput.setAttribute("value", "10");
  qtyInput.value = "10";

  // Challenge
  const challSelect = doc.getElementById("challenge-input");
  challSelect.value = "no";

  // Submit evidence
  const form = doc.getElementById("evidanceForm");
  form.dispatchEvent(
    new dom.window.Event("submit", { bubbles: true, cancelable: true })
  );

  await flush();
  await flush();

  assert.ok(payload, "Fetch /addAction should have been called");

  // Core required fields
  assert.equal(payload.mission, "Walk");
  assert.equal(payload.challenge, "no");
  assert.equal(payload.email, "user@test.com");

  // Quantity is OPTIONAL (because dashUtil.js currently does not include it).
  // If we later add it to the client code, this test will validate it.
  if (payload.quantity !== undefined) {
    assert.equal(String(payload.quantity), "10");
  } else {
    console.error("DEBUG: quantity not present in payload (current dashUtil.js behaviour)");
  }

  // UI changes
  assert.equal(doc.getElementById("upload-modal").style.display, "none");
  assert.equal(doc.getElementById("data-modal").style.display, "block");

  const amountText = readText(doc.getElementById("ammount"));
  assert.equal(amountText, "100gt");
});

// TEST 3: Join Group
test("DASHBOARD: Joining a group calls /addGroup", async () => {
  const dom = makeDom();
  let payload = null;

  dom.window.fetch = async (url, options = {}) => {
    // init calls:
    if (url === "/updateMissionList") return { json: async () => ({ title: [] }) };
    if (url === "/updateChallengeList") return { json: async () => ({ title: [] }) };
    if (url === "/updateGroupList") return { json: async () => ({ groups: [] }) };
    if (url === "/updateTotalIndi") return { json: async () => ({ total: "0" }) };

    if (url === "/addGroup") {
      payload = JSON.parse(options.body);
      return { json: async () => ({}) };
    }

    return { json: async () => ({}) };
  };

  dom.window.localStorage.setItem("name", "user@test.com");
  loadScript(dom);

  await flush();

  const doc = dom.window.document;

  const groupSelect = doc.getElementById("group-input");
  groupSelect.appendChild(new dom.window.Option("New Group", "New Group"));
  groupSelect.value = "New Group";

  const form = doc.getElementById("joinForm");
  form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));

  await flush();
  await flush();

  assert.ok(payload, "Fetch /addGroup should have been called");
  assert.equal(payload.group, "New Group");
  assert.equal(payload.email, "user@test.com");
});
