const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");

function loadBrowserScript(window, relPathFromProjectRoot) {
  const absolutePath = path.join(__dirname, "..", relPathFromProjectRoot);
  let scriptCode = fs.readFileSync(absolutePath, "utf8");

  scriptCode = scriptCode.replace(
    /export\s+async\s+function\s+checkAuth\s*\(/,
    "async function checkAuth("
  );

  scriptCode += "\nwindow.checkAuth = checkAuth;";

  window.eval(scriptCode);
}

function makeDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://example.com/private.html",
    runScripts: "dangerously",
  });

  return { window: dom.window };
}

test("AUTH: checkAuth returns auth false and null role when unauthenticated", async () => {
  const { window } = makeDom();

  let fetchCalled = false;

  window.fetch = async (url, opts = {}) => {
    fetchCalled = true;

    assert.equal(url, "/getSession");
    assert.equal(opts.method, "GET");

    return {
      ok: true,
      json: async () => ({
        authenticated: false,
        role: null,
      }),
    };
  };

  loadBrowserScript(window, "public/scripts/auth.js");

  const result = await window.checkAuth();

  assert.ok(fetchCalled, "Expected /getSession to be called");
  assert.equal(result.auth, false);
  assert.equal(result.role, null);
});

test("AUTH: checkAuth returns auth true and role when authenticated", async () => {
  const { window } = makeDom();

  let fetchCalled = false;

  window.fetch = async (url, opts = {}) => {
    fetchCalled = true;

    assert.equal(url, "/getSession");
    assert.ok(!opts || !opts.method || opts.method === "GET");
    return {
      ok: true,
      json: async () => ({
        authenticated: true,
        role: "user",
      }),
    };
  };

  loadBrowserScript(window, "public/scripts/auth.js");

  const result = await window.checkAuth();

  assert.ok(fetchCalled, "Expected /getSession to be called");
  assert.equal(result.auth, true);
  assert.equal(result.role, "user");
});