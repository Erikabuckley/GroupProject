const { JSDOM } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");

// Loads a browser-targeted script into a JSDOM window.
// Strips the `export` keyword from checkAuth so it can be evaluated in JSDOM,
// then attaches it to window so tests can call window.checkAuth().
function loadBrowserScript(window, relPathFromProjectRoot) {
  const absolutePath = path.join(__dirname, "..", "..", relPathFromProjectRoot);
  let scriptCode = fs.readFileSync(absolutePath, "utf8");

  scriptCode = scriptCode.replace(
    /export\s+async\s+function\s+checkAuth\s*\(/,
    "async function checkAuth("
  );

  scriptCode += "\nwindow.checkAuth = checkAuth;";

  window.eval(scriptCode);
}

// Creates a minimal JSDOM environment that mimics a browser page.
function makeDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://example.com/private.html",
    runScripts: "dangerously",
  });

  return { window: dom.window };
}

// Reset all mocks between tests to prevent state leaking across tests.
beforeEach(() => {
  jest.clearAllMocks();
});

// When the server returns authenticated: false, checkAuth should
// return { auth: false, role: null } and make exactly one GET to /getSession.
test("AUTH: checkAuth returns auth false and null role when unauthenticated", async () => {
  const { window } = makeDom();

  window.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({
      authenticated: false,
      role: null,
    }),
  }));

  loadBrowserScript(window, "public/scripts/auth.js");

  const result = await window.checkAuth();

  expect(window.fetch).toHaveBeenCalledTimes(1);
  expect(window.fetch).toHaveBeenCalledWith("/getSession");
  expect(result).toEqual({ auth: false, role: null });
});

// When the server returns authenticated: true with a role, checkAuth should
// return { auth: true, role: "user" }.
test("AUTH: checkAuth returns auth true and role when authenticated", async () => {
  const { window } = makeDom();

  window.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({
      authenticated: true,
      role: "user",
    }),
  }));

  loadBrowserScript(window, "public/scripts/auth.js");

  const result = await window.checkAuth();

  expect(window.fetch).toHaveBeenCalledTimes(1);
  expect(window.fetch).toHaveBeenCalledWith("/getSession");
  expect(result).toEqual({ auth: true, role: "user" });
});

// When the server returns a non-ok response (e.g. 401, 500), checkAuth
// should catch the thrown error, log it, and return the safe fallback.
test("AUTH: checkAuth returns auth false and null role when response is not ok", async () => {
  const { window } = makeDom();

  window.fetch = jest.fn(async () => ({
    ok: false,
    json: async () => ({}),
  }));

  // Spy on console.error to assert it was called, and suppress output.
  const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  loadBrowserScript(window, "public/scripts/auth.js");

  const result = await window.checkAuth();

  expect(window.fetch).toHaveBeenCalledTimes(1);
  expect(window.fetch).toHaveBeenCalledWith("/getSession");
  expect(result).toEqual({ auth: false, role: null });
  expect(consoleErrorSpy).toHaveBeenCalled();

  consoleErrorSpy.mockRestore();
});

// When fetch itself throws (e.g. network failure), checkAuth should
// catch the error, log it, and return the safe fallback.
test("AUTH: checkAuth returns auth false and null role when fetch throws", async () => {
  const { window } = makeDom();

  window.fetch = jest.fn(async () => {
    throw new Error("Network error");
  });

  // Spy on console.error to assert it was called, and suppress output.
  const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  loadBrowserScript(window, "public/scripts/auth.js");

  const result = await window.checkAuth();

  expect(window.fetch).toHaveBeenCalledTimes(1);
  expect(window.fetch).toHaveBeenCalledWith("/getSession");
  expect(result).toEqual({ auth: false, role: null });
  expect(consoleErrorSpy).toHaveBeenCalled();

  consoleErrorSpy.mockRestore();
});