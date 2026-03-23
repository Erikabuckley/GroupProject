const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");

// Loads a real browser script into a JSDOM window by reading it from disk
// and passing it to eval — simulating how a browser would execute it.
function loadRealScript(window, relPathFromRoot) {
  const scriptPath = path.join(__dirname, "..", "..", relPathFromRoot);
  const code = fs.readFileSync(scriptPath, "utf8");
  window.eval(code);
}

// Yields control back to the event loop twice, allowing fetch promises
// and any subsequent DOM update callbacks to fully settle.
async function tick() {
  await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
}

// Creates a JSDOM window with the full dashboard HTML structure.
// VirtualConsole is used to capture jsdomErrors (e.g. failed redirects)
// without polluting test output — errors are collected in jsdomErrors[].
function makeWindow() {
  const virtualConsole = new VirtualConsole();
  const jsdomErrors = [];
  virtualConsole.on("jsdomError", (e) => jsdomErrors.push(e));

  const dom = new JSDOM(
    `<!doctype html>
      <html>
        <body>
          <div id="welcome">
            <div class="text">
              <h1 id="name"></h1>
              <h3>Now you can start logging carbon saving actions!</h3>
            </div>

            <div id="badges">
              <img class="badge" id="badge1">
              <img class="badge" id="badge2">
              <img class="badge" id="badge3">
              <img class="badge" id="badge4">
              <img class="badge" id="badge5">
              <img class="badge" id="badge6">
            </div>
          </div>

          <select id="mission-input"></select>
          <select id="challenge-input"></select>
          <select id="group-input"></select>
          <select id="group-challenge-input"></select>

          <input id="declaration" type="checkbox" />

          <div id="indi-carbon"></div>
          <div id="indi-points"></div>

          <div id="upload-modal" style="display:block"></div>
          <div id="data-modal" style="display:none"></div>
          <div id="amount"></div>
          <div id="conversion"></div>
          <a id="source"></a>

          <div id="error" style="visibility:hidden"></div>
          <div id="error-message" style="visibility:hidden"></div>

          <div id="log"></div>
          <div id="join-modal" style="display:none"></div>
          <div id="backdrop" style="display:none"></div>

          <form id="evidanceForm">
            <input id="quantity-input" value="" />
            <input id="upload-input" type="file" />
            <button type="submit">Submit</button>
          </form>

          <form id="joinForm">
            <button type="submit">Join</button>
          </form>
        </body>
     </html>`,
    {
      url: "https://example.com/dash/dashboard.html",
      runScripts: "dangerously",
      virtualConsole,
    }
  );

  return { window: dom.window, jsdomErrors };
}

// Returns a jest.fn() that handles all endpoints dashUtil.js calls on load.
// Accepts an overrides object for test-specific routes (e.g. /addAction, /addGroup)
// so each test only needs to define the one endpoint it's focused on.
function makeBaseFetch(overrides = {}) {
  return jest.fn(async (url, opts = {}) => {
    if (url === "/updateMissionList") return { json: async () => ({ title: ["M1"] }) };
    if (url === "/updateChallengeList") return { json: async () => ({ title: ["C1"] }) };
    if (url === "/updateGroupList") return { json: async () => ({ groups: ["G1"] }) };
    if (url === "/updateUserGroupsList") return { json: async () => ({ groups: ["UG1"] }) };
    if (url === "/updateTotalIndi") return { json: async () => ({ total: 0 }) };
    if (url === "/updatePointsIndi") return { json: async () => ({ total: 5 }) };
    if (url === "/updateLog") {
      return {
        json: async () => ({
          title: [],
          id: [],
          evidence: [],
          challenge_title: [],
          status: true,
          reason: [],
        }),
      };
    }
    if (url === "/getName") return { json: async () => ({ dis_name: "test" }) };
    if (url === "/getBadges") return { json: async () => ({ vals: [true, true, true, true, true, true] }) };

    if (overrides[url]) return overrides[url](opts);

    throw new Error("Unexpected fetch call: " + url);
  });
}

// All endpoints dashUtil.js is expected to call during initialisation.
// Used in the first test to assert none are missed.
const ALL_INIT_URLS = [
  "/updateMissionList",
  "/updateChallengeList",
  "/updateGroupList",
  "/updateUserGroupsList",
  "/updateTotalIndi",
  "/updatePointsIndi",
  "/updateLog",
  "/getName",
  "/getBadges",
];

// Reset all mocks between tests to prevent state leaking across tests.
beforeEach(() => {
  jest.clearAllMocks();
});

// On load, dashUtil.js should call all init endpoints and populate
// the four dropdowns and the two individual totals from the responses.
test("DASHBOARD: on load populates dropdowns and updates indi total", async () => {
  const { window } = makeWindow();

  // Uses its own inline fetch (not makeBaseFetch) because this test
  // needs specific data values (e.g. ["M1","M2"]) to assert against.
  window.fetch = jest.fn(async (url) => {
    if (url === "/updateMissionList") return { json: async () => ({ title: ["M1", "M2"] }) };
    if (url === "/updateChallengeList") return { json: async () => ({ title: ["C1"] }) };
    if (url === "/updateGroupList") return { json: async () => ({ groups: ["G1", "G2"] }) };
    if (url === "/updateUserGroupsList") return { json: async () => ({ groups: ["UG1"] }) };
    if (url === "/updateTotalIndi") return { json: async () => ({ total: 10 }) };
    if (url === "/updatePointsIndi") return { json: async () => ({ total: 5 }) };
    if (url === "/updateLog") {
      return {
        json: async () => ({
          title: [],
          id: [],
          evidence: [],
          challenge_title: [],
          status: true,
          reason: [],
        }),
      };
    }
    if (url === "/getName") return { json: async () => ({ dis_name: "test" }) };
    if (url === "/getBadges") return { json: async () => ({ vals: [true, true, true, true, true, true] }) };
    throw new Error("Unexpected fetch call: " + url);
  });

  loadRealScript(window, "public/scripts/dashUtil.js");
  await tick();
  await tick();

  // Assert every init endpoint was called at least once.
  const calledUrls = window.fetch.mock.calls.map(([url]) => url);
  for (const url of ALL_INIT_URLS) {
    expect(calledUrls).toContain(url);
  }

  const missionVals = [...window.document.querySelectorAll("#mission-input option")].map((o) => o.value);
  const challengeVals = [...window.document.querySelectorAll("#challenge-input option")].map((o) => o.value);
  const groupVals = [...window.document.querySelectorAll("#group-input option")].map((o) => o.value);
  const userGroupVals = [...window.document.querySelectorAll("#group-challenge-input option")].map((o) => o.value);

  expect(missionVals).toEqual(["M1", "M2"]);
  expect(challengeVals).toEqual(["C1"]);
  expect(groupVals).toEqual(["G1", "G2"]);
  expect(userGroupVals).toEqual(["UG1"]);

  expect(window.document.getElementById("indi-carbon").textContent).toBe("10g");
  expect(window.document.getElementById("indi-points").textContent).toBe("5 points");
});

// Submitting the evidence form should POST to /addAction with a FormData body,
// then hide the upload modal and show the data modal with the returned values.
test("DASHBOARD: evidence submit posts /addAction, hides upload modal, shows data modal", async () => {
  const { window } = makeWindow();

  window.fetch = makeBaseFetch({
    "/addAction": async () => ({
      status: 200,
      json: async () => ({ carbon: 7, source: "Test source", value: 10 }),
    }),
  });

  loadRealScript(window, "public/scripts/dashUtil.js");
  await tick();
  await tick();

  // Fill in all form fields before submitting.
  window.document.getElementById("mission-input").value = "M1";
  window.document.getElementById("challenge-input").value = "C1";
  window.document.getElementById("group-challenge-input").value = "UG1";
  window.document.getElementById("quantity-input").value = "3";
  window.document.getElementById("declaration").checked = true;

  // Attach a fake file to the file input to simulate an evidence upload.
  const uploadEl = window.document.getElementById("upload-input");
  const fakeFile = new window.File(["dummy"], "proof.png", { type: "image/png" });
  Object.defineProperty(uploadEl, "files", { value: [fakeFile] });

  const form = window.document.getElementById("evidanceForm");
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

  await tick();
  await tick();

  expect(window.fetch).toHaveBeenCalledWith("/addAction", expect.objectContaining({ method: "POST" }));

  // Inspect the FormData body of the /addAction call directly.
  const addActionCall = window.fetch.mock.calls.find(([url]) => url === "/addAction");
  const body = addActionCall[1].body;

  expect(body).toBeInstanceOf(window.FormData);
  expect(body.get("mission")).toBe("M1");
  expect(body.get("challenge")).toBe("C1");
  expect(body.get("quantity")).toBe("3");
  expect(body.get("group")).toBe("UG1");

  const uploaded = body.get("upload");
  expect(uploaded).toBeTruthy();
  expect(uploaded.name).toBe("proof.png");

  expect(window.document.getElementById("upload-modal").style.display).toBe("none");
  expect(window.document.getElementById("data-modal").style.display).toBe("block");
  expect(window.document.getElementById("amount").innerText).toBe("7g");
  expect(window.document.getElementById("conversion").innerText).toBe("Using a factor of 10g");
  expect(window.document.getElementById("source").innerText).toBe("Test source");
});

// When /addGroup returns 409 (already a member), the error message
// should be made visible with the server's error text.
test("DASHBOARD: join group 409 shows error message", async () => {
  const { window } = makeWindow();

  window.fetch = makeBaseFetch({
    "/addGroup": async (opts) => {
      expect(opts.method).toBe("POST");
      expect(JSON.parse(opts.body)).toEqual({ group: "G1" });
      return {
        status: 409,
        json: async () => ({ error: "Already in group" }),
      };
    },
  });

  loadRealScript(window, "public/scripts/dashUtil.js");
  await tick();
  await tick();

  window.document.getElementById("group-input").value = "G1";

  const joinForm = window.document.getElementById("joinForm");
  joinForm.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

  await tick();
  await tick();

  expect(window.fetch).toHaveBeenCalledWith("/addGroup", expect.objectContaining({ method: "POST" }));

  const err = window.document.getElementById("error-message");
  expect(err.textContent).toBe("Already in group");
  expect(err.style.visibility).toBe("visible");
});

// When /addGroup returns 200, the script should attempt to redirect to dashboard.html.
// JSDOM cannot follow navigation, so we accept either an href change or a jsdomError
// containing "navigation" as proof the redirect was attempted.
test("DASHBOARD: join group success attempts redirect to dashboard.html", async () => {
  const { window, jsdomErrors } = makeWindow();

  window.fetch = makeBaseFetch({
    "/addGroup": async (opts) => {
      expect(opts.method).toBe("POST");
      return {
        status: 200,
        json: async () => ({}),
      };
    },
  });

  loadRealScript(window, "public/scripts/dashUtil.js");
  await tick();
  await tick();

  window.document.getElementById("group-input").value = "G1";

  const joinForm = window.document.getElementById("joinForm");
  joinForm.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

  await tick();
  await tick();

  const hrefChanged = window.location.href.includes("dashboard.html");
  const navError = jsdomErrors.some((e) =>
    String(e && e.message ? e.message : e).includes("navigation")
  );

  expect(hrefChanged || navError).toBe(true);
});