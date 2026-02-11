// What we test:
// 1) Upgrade Success: If backend returns 200, script should set 
//    localStorage auth='1' and redirect (we verify the side effects).
// 2) Upgrade Failure: If backend returns 401, script should show 
//    the error message element.

const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");

const SCRIPT_PATH = (() => {
    const candidates = [
      path.join(__dirname, "..", "public", "scripts", "settingsUtil.js"),
      path.join(__dirname, "..", "scripts", "settingsUtil.js"),
    ];
    return candidates.find((p) => fs.existsSync(p));
})();

function makeDom() {
  return new JSDOM(
    `
    <button id="upgrade-status">Upgrade Account</button>
    
    <div id="error-message" style="visibility:hidden">Error</div>
    `,
    { 
        url: "http://localhost/dash/settings.html", 
        runScripts: "dangerously" 
    }
  );
}

function loadScript(dom) {
  const code = fs.readFileSync(SCRIPT_PATH, "utf8");
  dom.window.eval(code);
}

test("SETTINGS: Upgrade success updates localStorage and redirects", async () => {
  const dom = makeDom();
  let called = false;

  // Mock successful fetch
  dom.window.fetch = async (url, options) => {
    called = true;
    assert.equal(url, "/upgrade");
    const body = JSON.parse(options.body);
    // Ensure the email from localStorage was sent
    assert.equal(body.email, "test@test.com");
    return { status: 200 };
  };

  dom.window.localStorage.setItem("name", "test@test.com");
  loadScript(dom);

  // Click the button
  const btn = dom.window.document.getElementById("upgrade-status");
  btn.click(); 

  await new Promise((r) => setTimeout(r, 0));

  assert.ok(called, "Fetch should have been called");
  
  // The script sets 'auth' to '1' before redirecting. 
  // We check this side effect since we can't easily check actual window navigation.
  assert.equal(dom.window.localStorage.getItem("auth"), "1");
});

test("SETTINGS: Upgrade failure (401) displays error message", async () => {
  const dom = makeDom();

  // Mock failed fetch (Unauthorized)
  dom.window.fetch = async () => {
    return { status: 401 };
  };

  dom.window.localStorage.setItem("name", "fail@test.com");
  loadScript(dom);

  dom.window.document.getElementById("upgrade-status").click();

  await new Promise((r) => setTimeout(r, 0));

  // Verify that the error message became visible
  const errorDiv = dom.window.document.getElementById("error-message");
  assert.equal(errorDiv.style.visibility, "visible");
});