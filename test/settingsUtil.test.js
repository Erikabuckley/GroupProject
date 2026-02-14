// Real-script tests for our front-end file: public/scripts/settingsUtil.js
// settingsUtil.js:
// - Looks for button #upgrade-status
// - On click, POSTs /upgrade with { email } (email from localStorage name)
// - If status === 401: shows #error-message
// - Else: sets localStorage auth='1' and attempts redirect to ../validation/login.html
//
// Important:
// jsdom navigation is not reliable for window.location.href in this setup.
// So for success we prove the success branch ran by checking:
// - auth is set to '1'
// - error message stays hidden
// Redirect is covered by manual browser testing.

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
     <button id="upgrade-status">Upgrade</button>
     <div id="error-message" style="visibility:hidden"></div>`,
    {
      url: "https://example.com/settings.html",
      runScripts: "dangerously",
    }
  );
  return dom.window;
}

test("SETTINGS (real script): upgrade success sets auth and keeps error hidden", async () => {
  const window = makeWindow();

  // Email comes from localStorage name
  window.localStorage.setItem("name", "tester@example.com");

  // Capture request so we can assert endpoint + payload
  let lastRequest = null;

  window.fetch = async (url, opts) => {
    lastRequest = { url, opts };

    // Assert request is correct
    assert.equal(url, "/upgrade");
    assert.equal(opts.method, "POST");
    assert.equal(opts.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(opts.body), { email: "tester@example.com" });

    // Success response
    return { status: 200, async json() { return {}; } };
  };

  // Load our real script (attaches click handler)
  loadRealScript(window, "public/scripts/settingsUtil.js");
  await tick();

  // Click the upgrade button
  window.document.getElementById("upgrade-status").click();
  await tick();

  // Prove fetch happened
  assert.ok(lastRequest, "Expected POST /upgrade to be called");

  // Prove we hit the success branch
  assert.equal(window.localStorage.getItem("auth"), "1");

  // Error should remain hidden on success
  assert.equal(window.document.getElementById("error-message").style.visibility, "hidden");
});

test("SETTINGS (real script): upgrade failure (401) shows error message and does not set auth", async () => {
  const window = makeWindow();

  window.localStorage.setItem("name", "tester@example.com");

  window.fetch = async () => ({ status: 401, async json() { return {}; } });

  loadRealScript(window, "public/scripts/settingsUtil.js");
  await tick();

  window.document.getElementById("upgrade-status").click();
  await tick();

  // Error should be visible
  assert.equal(window.document.getElementById("error-message").style.visibility, "visible");

  // Auth should not be set to 1
  assert.notEqual(window.localStorage.getItem("auth"), "1");
});