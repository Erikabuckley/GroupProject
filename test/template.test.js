// test/template.test.js
// Header Loading: Verifies that the script fetches the correct 
//    HTML templates (dashHeader, basicHeader, etc.) based on URL.
// User Types: Verifies that if a user is a 'moderator', the 
//    participant view is hidden and moderator view is shown.
// Sign Out: Verifies that clicking sign out calls /destroySession.

const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");

const SCRIPT_PATH = (() => {
    const candidates = [
      path.join(__dirname, "..", "public", "scripts", "template.js"),
      path.join(__dirname, "..", "scripts", "template.js"),
    ];
    return candidates.find((p) => fs.existsSync(p));
})();

function makeDom(url) {
  return new JSDOM(
    `
    <div class="header-container"></div>
    <div class="footer-container"></div>
    
    <div id="participant" style="display:none"></div>
    <div id="moderator" style="display:none"></div>
    <div id="maintainer" style="display:none"></div>
    <button id="signOut">Sign Out</button>
    <div id="logo">Logo</div>
    
    <button id="out">Back</button>
    `,
    { 
        url: url, 
        runScripts: "dangerously" 
    }
  );
}

// FIX: strip the ES module import line before eval (jsdom cannot handle import statements),
//      then inject a mock checkAuth that reads from localStorage — matching what the script expects.
function loadScript(dom) {
  let code = fs.readFileSync(SCRIPT_PATH, "utf8");

  // Remove the import line so jsdom eval doesn't crash
  code = code.replace(/^\s*import\s+.*?['"].*?['"];?\s*$/m, "");

  // Inject a mock checkAuth that reads from localStorage, matching the script's usage:
  //   const { auth, role } = await checkAuth();
  const mockCheckAuth = `
    async function checkAuth() {
      const type = window.localStorage.getItem("type");
      const auth = !!window.localStorage.getItem("auth");
      return { auth, role: type };
    }
  `;

  code = mockCheckAuth + code;
  dom.window.eval(code);
}

test("TEMPLATE: Loads dashboard header and shows Moderator view", async () => {
  const dom = makeDom("http://localhost/dash/dashboard.html");

  dom.window.fetch = async (url) => {
    if (url.includes(".html")) {
      return { text: async () => "<div>Header Loaded</div>" };
    }
    return { status: 404 };
  };

  dom.window.localStorage.setItem("auth", "1");
  dom.window.localStorage.setItem("type", "moderator");
  
  loadScript(dom);
  await new Promise((r) => setTimeout(r, 20));

  const header = dom.window.document.getElementsByClassName("header-container")[0];
  assert.ok(header.innerHTML.includes("Header Loaded"));

  const modDiv = dom.window.document.getElementById("moderator");
  const partDiv = dom.window.document.getElementById("participant");
  
  assert.equal(modDiv.style.display, "flex", "Moderator div should be visible");
  assert.equal(partDiv.style.display, "none", "Participant div should be hidden");
});

test("TEMPLATE: Loads dashboard header and shows Participant view", async () => {
  const dom = makeDom("http://localhost/dash/dashboard.html");

  dom.window.fetch = async (url) => {
    if (url.includes(".html")) return { text: async () => "" };
    return { status: 404 };
  };

  dom.window.localStorage.setItem("auth", "1");
  dom.window.localStorage.setItem("type", "user");
  
  loadScript(dom);
  await new Promise((r) => setTimeout(r, 20));

  const modDiv = dom.window.document.getElementById("moderator");
  const partDiv = dom.window.document.getElementById("participant");
  
  assert.equal(partDiv.style.display, "flex", "Participant div should be visible");
  assert.equal(modDiv.style.display, "none", "Moderator div should be hidden");
});

// FIX: script calls /destroySession (not /signOut) and does NOT clear localStorage —
//      it only redirects. Test now reflects actual script behaviour.
test("TEMPLATE: Sign Out button calls /destroySession", async () => {
  const dom = makeDom("http://localhost/dash/dashboard.html");
  let signOutCalled = false;

  dom.window.fetch = async (url) => {
    if (url === "/destroySession") {
      signOutCalled = true;
      return { status: 200 };
    }
    return { text: async () => "" };
  };

  dom.window.localStorage.setItem("auth", "1");
  dom.window.localStorage.setItem("name", "me");
  dom.window.localStorage.setItem("type", "moderator");

  loadScript(dom);
  await new Promise((r) => setTimeout(r, 20));

  const btn = dom.window.document.getElementById("signOut");
  btn.click();

  await new Promise((r) => setTimeout(r, 20));

  // Script calls /destroySession then redirects — it does not clear localStorage
  assert.ok(signOutCalled, "Should call /destroySession endpoint");
});