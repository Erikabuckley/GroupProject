// test/auth.test.js
//
// Real-script tests for: public/scripts/auth.js
//
// What auth.js does:
// It runs checkAuth() immediately when the script loads.
// If localStorage.auth !== "1", it tries to redirect by setting window.location.href.
//
// What to pay attention about JSDOM?:
// In a real browser, changing window.location.href navigates.
// In JSDOM, navigation isn't implemented, so it throws a "Not implemented: navigation" jsdomError.
// We treat that jsdomError as our signal: "a redirect was attempted".

const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");

// Loads the *real* browser script into the JSDOM window (so it behaves like in production).
function loadBrowserScript(window, relPathFromProjectRoot) {
  const absolutePath = path.join(__dirname, "..", relPathFromProjectRoot);
  const scriptCode = fs.readFileSync(absolutePath, "utf8");
  window.eval(scriptCode);
}

// Let any "on load" side effects finish (auth.js runs immediately, but we give the event loop a beat).
async function nextMicrotask() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

// Detect whether our script tried to navigate away (JSDOM reports this as a jsdomError).
function redirectWasAttempted(jsdomErrors) {
  return jsdomErrors.some((err) =>
    String(err?.message || err).includes("Not implemented: navigation")
  );
}

// Helper to build a JSDOM environment that captures JSDOM errors (including navigation attempts).
function makeDomThatCapturesJsdomErrors() {
  const virtualConsole = new VirtualConsole();
  const jsdomErrors = [];

  virtualConsole.on("jsdomError", (err) => jsdomErrors.push(err));

  const dom = new JSDOM(`<!doctype html>`, {
    url: "https://example.com/private.html",
    runScripts: "dangerously",
    virtualConsole,
  });

  return { window: dom.window, jsdomErrors };
}

test("AUTH (real script): redirects if auth !== '1'", async () => {
  const { window, jsdomErrors } = makeDomThatCapturesJsdomErrors();

  // Given: user is NOT logged in
  window.localStorage.setItem("auth", "0");

  // When: auth.js is loaded (it runs checkAuth immediately)
  loadBrowserScript(window, "public/scripts/auth.js");
  await nextMicrotask();

  // Then: it should have tried to redirect
  assert.ok(
    redirectWasAttempted(jsdomErrors),
    "Expected a redirect attempt when auth !== '1'"
  );
});

test("AUTH (real script): does NOT redirect if auth === '1'", async () => {
  const { window, jsdomErrors } = makeDomThatCapturesJsdomErrors();

  // Given: user IS logged in
  window.localStorage.setItem("auth", "1");

  // When: auth.js is loaded
  loadBrowserScript(window, "public/scripts/auth.js");
  await nextMicrotask();

  // Then: it should NOT have tried to redirect
  assert.ok(
    !redirectWasAttempted(jsdomErrors),
    "Did not expect a redirect attempt when auth === '1'"
  );
});
