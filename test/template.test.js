// test/template.test.js
// Header Loading: Verifies that the script fetches the correct 
//    HTML templates (dashHeader, basicHeader, etc.) based on URL.
// User Types: Verifies that if a user is a 'moderator', the 
//    participant view is hidden and moderator view is shown.
// Sign Out: Verifies that clicking sign out clears localStorage.

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

// We need a flexible DOM maker because template.js acts differently 
// depending on the current page URL.
function makeDom(url) {
  return new JSDOM(
    `
    <div class="header-container"></div>
    <div class="footer-container"></div>
    
    <div id="participant" style="display:none"></div>
    <div id="moderator" style="display:none"></div>
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

function loadScript(dom) {
  const code = fs.readFileSync(SCRIPT_PATH, "utf8");
  dom.window.eval(code);
}

test("TEMPLATE: Loads dashboard header and shows Moderator view", async () => {
  // 1. Setup DOM as if we are on the dashboard
  const dom = makeDom("http://localhost/dash/dashboard.html");

  // 2. Mock Fetch
  dom.window.fetch = async (url) => {
    // Return dummy text for templates
    if (url.includes(".html")) {
      return { text: async () => "<div>Header Loaded</div>" };
    }
    return { status: 404 };
  };

  // 3. Set user type to moderator
  dom.window.localStorage.setItem("type", "moderator");
  
  loadScript(dom);
  
  // Wait for fetches
  await new Promise((r) => setTimeout(r, 20));

  // 4. Verify Header content was injected
  const header = dom.window.document.getElementsByClassName("header-container")[0];
  assert.ok(header.innerHTML.includes("Header Loaded"));

  // 5. Verify logic: Moderator div should be visible (flex), Participant hidden
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

  // Set user type to standard participant
  dom.window.localStorage.setItem("type", "user");
  
  loadScript(dom);
  await new Promise((r) => setTimeout(r, 20));

  const modDiv = dom.window.document.getElementById("moderator");
  const partDiv = dom.window.document.getElementById("participant");
  
  assert.equal(partDiv.style.display, "flex", "Participant div should be visible");
  assert.equal(modDiv.style.display, "none", "Moderator div should be hidden");
});

test("TEMPLATE: Sign Out button clears session", async () => {
  const dom = makeDom("http://localhost/dash/dashboard.html");
  let signOutCalled = false;

  dom.window.fetch = async (url) => {
    if (url === "/signOut") {
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

  // Simulate click
  const btn = dom.window.document.getElementById("signOut");
  btn.click();
  
  await new Promise((r) => setTimeout(r, 0));

  // Verify backend call and localStorage clearing
  assert.ok(signOutCalled, "Should call /signOut endpoint");
  assert.equal(dom.window.localStorage.getItem("auth"), null);
  assert.equal(dom.window.localStorage.getItem("name"), null);
    assert.equal(dom.window.localStorage.getItem("type"), null);

});