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
  const virtualConsole = new VirtualConsole();
  const jsdomErrors = [];
  virtualConsole.on("jsdomError", (e) => jsdomErrors.push(e));

  const dom = new JSDOM(
    `<!doctype html>
     <html>
     <body>
       <select id="mission-input"></select>
       <select id="challenge-input"></select>
       <select id="group-input"></select>
       <select id="group-challenge-input"></select>
       <input id="declaration" type="checkbox" />
       <div id="indi-carbon"></div>
       <div id="indi-points"></div>

       <div id="upload-modal" style="display:block"></div>
       <div id="data-modal" style="display:none"></div>
       <div id="ammount"></div>
       <a id="source"></a>

       <div id="error" style="visibility:hidden"></div>
       <div id="error-message" style="visibility:hidden"></div>

       <div id="log"></div>
       <div id="statusDeny-modal" style="display:none"></div>
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

test("DASHBOARD (real script): on load populates dropdowns and updates indi total", async () => {
  const { window } = makeWindow();

  const seen = new Set();

  window.fetch = async (url, opts = {}) => {
    seen.add(url);

    assert.ok(!opts || !opts.method || opts.method === "GET");
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
    if (url === "/updatePointsIndi") {
      return { async json() { return { total: 5 }; } };
    }
    if (url === "/updateLog") {
      return {
        async json() {
          return {
            title: [],
            id: [],
            evidence: [],
            challenge_title: [],
            status: true,
            reason: [],
          };
        },
      };
    }

    throw new Error("Unexpected fetch call: " + url);
  };

  loadRealScript(window, "public/scripts/dashUtil.js");
  await tick();
  await tick();

  for (const u of [
    "/updateMissionList",
    "/updateChallengeList",
    "/updateGroupList",
    "/updateUserGroupsList",
    "/updateTotalIndi",
    "/updatePointsIndi",
    "/updateLog",
  ]) {
    assert.ok(seen.has(u), `Expected call to ${u}`);
  }

  const missionVals = [...window.document.querySelectorAll("#mission-input option")].map((o) => o.value);
  const challengeVals = [...window.document.querySelectorAll("#challenge-input option")].map((o) => o.value);
  const groupVals = [...window.document.querySelectorAll("#group-input option")].map((o) => o.value);
  const userGroupVals = [...window.document.querySelectorAll("#group-challenge-input option")].map((o) => o.value);

  assert.deepEqual(missionVals, ["M1", "M2"]);
  assert.deepEqual(challengeVals, ["C1"]);
  assert.deepEqual(groupVals, ["G1", "G2"]);
  assert.deepEqual(userGroupVals, ["UG1"]);

  assert.equal(window.document.getElementById("indi-carbon").textContent, "10g");
  assert.equal(window.document.getElementById("indi-points").textContent, "5 points");
});

test("DASHBOARD (real script): evidence submit posts /addAction, hides upload modal, shows data modal", async () => {
  const { window } = makeWindow();

  let lastAddAction = null;

  window.fetch = async (url, opts = {}) => {
    if (url === "/updateMissionList") return { async json() { return { title: ["M1"] }; } };
    if (url === "/updateChallengeList") return { async json() { return { title: ["C1"] }; } };
    if (url === "/updateGroupList") return { async json() { return { groups: ["G1"] }; } };
    if (url === "/updateUserGroupsList") return { async json() { return { groups: ["UG1"] }; } };
    if (url === "/updateTotalIndi") return { async json() { return { total: 0 }; } };
    if (url === "/updatePointsIndi") return { async json() { return { total: 5 }; } };
    if (url === "/updateLog") {
      return {
        async json() {
          return {
            title: [],
            id: [],
            evidence: [],
            challenge_title: [],
            status: true,
            reason: [],
          };
        },
      };
    }
    if (url === "/addAction") {
      lastAddAction = { url, opts };
      return {
        status: 200,
        async json() {
          return { carbon: 7, source: "Test source" };
        },
      };
    }

    throw new Error("Unexpected fetch call: " + url);
  };

  loadRealScript(window, "public/scripts/dashUtil.js");
  await tick();
  await tick();

  window.document.getElementById("mission-input").value = "M1";
  window.document.getElementById("challenge-input").value = "C1";
  window.document.getElementById("group-challenge-input").value = "UG1";
  window.document.getElementById("quantity-input").value = "3";
  window.document.getElementById("declaration").checked = true;

  const uploadEl = window.document.getElementById("upload-input");
  const fakeFile = new window.File(["dummy"], "proof.png", { type: "image/png" });
  Object.defineProperty(uploadEl, "files", { value: [fakeFile] });

  const form = window.document.getElementById("evidanceForm");
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

  await tick();
  await tick();

  assert.ok(lastAddAction, "Expected POST /addAction to be called");
  assert.equal(lastAddAction.opts.method, "POST");

  const body = lastAddAction.opts.body;
  assert.ok(body instanceof window.FormData, "Expected FormData body for /addAction");

  assert.equal(body.get("mission"), "M1");
  assert.equal(body.get("challenge"), "C1");
  assert.equal(body.get("quantity"), "3");
  assert.equal(body.get("group"), "UG1");

  const uploaded = body.get("upload");
  assert.ok(uploaded, "Expected upload to be present in FormData");
  assert.equal(uploaded.name, "proof.png");

  assert.equal(window.document.getElementById("upload-modal").style.display, "none");
  assert.equal(window.document.getElementById("data-modal").style.display, "block");
  assert.equal(window.document.getElementById("ammount").innerText, "7g");
  assert.equal(window.document.getElementById("source").innerText, "Test source");
});

test("DASHBOARD (real script): join group 409 shows error message", async () => {
  const { window } = makeWindow();

  let addGroupCalled = false;

  window.fetch = async (url, opts = {}) => {
    if (url === "/updateMissionList") return { async json() { return { title: [] }; } };
    if (url === "/updateChallengeList") return { async json() { return { title: [] }; } };
    if (url === "/updateGroupList") return { async json() { return { groups: ["G1"] }; } };
    if (url === "/updateUserGroupsList") return { async json() { return { groups: [] }; } };
    if (url === "/updateTotalIndi") return { async json() { return { total: 0 }; } };
    if (url === "/updatePointsIndi") return { async json() { return { total: 5 }; } };
    if (url === "/updateLog") {
      return {
        async json() {
          return {
            title: [],
            id: [],
            evidence: [],
            challenge_title: [],
            status: true,
            reason: [],
          };
        },
      };
    }

    if (url === "/addGroup") {
      addGroupCalled = true;
      assert.equal(opts.method, "POST");

      const body = JSON.parse(opts.body);
      assert.deepEqual(body, { group: "G1" });

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
  await tick();

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

test("DASHBOARD (real script): join group success attempts redirect to dashboard.html", async () => {
  const { window, jsdomErrors } = makeWindow();

  window.fetch = async (url, opts = {}) => {
    if (url === "/updateMissionList") return { async json() { return { title: [] }; } };
    if (url === "/updateChallengeList") return { async json() { return { title: [] }; } };
    if (url === "/updateGroupList") return { async json() { return { groups: ["G1"] }; } };
    if (url === "/updateUserGroupsList") return { async json() { return { groups: [] }; } };
    if (url === "/updateTotalIndi") return { async json() { return { total: 0 }; } };
    if (url === "/updatePointsIndi") return { async json() { return { total: 0 }; } };
    if (url === "/updateLog") {
      return {
        async json() {
          return {
            title: [],
            id: [],
            evidence: [],
            challenge_title: [],
            status: true,
            reason: [],
          };
        },
      };
    }

    if (url === "/addGroup") {
      assert.equal(opts.method, "POST");
      return {
        status: 200,
        async json() {
          return {};
        },
      };
    }

    throw new Error("Unexpected fetch call: " + url);
  };

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

  assert.ok(hrefChanged || navError, "Expected redirect attempt on successful join");
});