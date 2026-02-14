// Real-script tests for our front-end file: public/scripts/auth.js
// auth.js runs checkAuth() immediately on load.
// In a real browser, setting window.location.href navigates.
// In jsdom, navigation is not implemented, so a redirect attempt shows up as a jsdomError.
// We use that jsdomError as our signal that redirect was attempted.

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
  await new Promise((r) => setTimeout(r, 0));
}

function madeNavigationAttempt(jsdomErrors) {
  return jsdomErrors.some((e) =>
    String(e?.message || e).includes("Not implemented: navigation")
  );
}

test("AUTH (real script): when auth is not '1', auth.js attempts redirect", async () => {
  const virtualConsole = new VirtualConsole();
  const jsdomErrors = [];
  virtualConsole.on("jsdomError", (e) => jsdomErrors.push(e));

  const dom = new JSDOM(`<!doctype html>`, {
    url: "https://example.com/private.html",
    runScripts: "dangerously",
    virtualConsole,
  });
  const { window } = dom;

  // Arrange: not logged in
  window.localStorage.setItem("auth", "0");

  // Act: load real auth.js (it calls checkAuth() immediately)
  loadRealScript(window, "public/scripts/auth.js");
  await tick();

  // Assert: redirect attempt happened (jsdom navigation error)
  assert.ok(madeNavigationAttempt(jsdomErrors), "Expected redirect attempt when auth !== '1'");
});

test("AUTH (real script): when auth is '1', auth.js does NOT attempt redirect", async () => {
  const virtualConsole = new VirtualConsole();
  const jsdomErrors = [];
  virtualConsole.on("jsdomError", (e) => jsdomErrors.push(e));

  const dom = new JSDOM(`<!doctype html>`, {
    url: "https://example.com/private.html",
    runScripts: "dangerously",
    virtualConsole,
  });
  const { window } = dom;

  // Arrange: logged in
  window.localStorage.setItem("auth", "1");

  // Act
  loadRealScript(window, "public/scripts/auth.js");
  await tick();

  // Assert: no redirect attempt
  assert.ok(!madeNavigationAttempt(jsdomErrors), "Did not expect redirect attempt when auth === '1'");
});
