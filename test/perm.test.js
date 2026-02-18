// test/perm.test.js
// perm.js runs checkPerm() immediately on load.
// checkPerm():
// GETs /checkPerm with Authorization header from localStorage name
// reads JSON { perm: "..." }
// if perm !== "moderator" it redirects to ../index.html
//
// In jsdom, navigation is not implemented, so a redirect attempt may show up as:
// a jsdomError "Not implemented: navigation to another Document", OR
// a change in window.location.href (depending on jsdom behaviour)
//
// So we assert redirect using either signal.

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

function sawNavigationError(jsdomErrors) {
  return jsdomErrors.some((e) =>
    String(e?.message || e).includes("Not implemented: navigation")
  );
}

test("PERM (real script): non-moderator triggers redirect to ../index.html", async () => {
  const virtualConsole = new VirtualConsole();
  const jsdomErrors = [];
  virtualConsole.on("jsdomError", (e) => jsdomErrors.push(e));

  const dom = new JSDOM(`<!doctype html>`, {
    url: "https://example.com/mod.html",
    runScripts: "dangerously",
    virtualConsole,
  });
  const { window } = dom;

  // Our script uses this for Authorization header
  window.localStorage.setItem("name", "tester@example.com");

  // Mock fetch BEFORE loading script (perm.js calls checkPerm() immediately)
  window.fetch = async (url, opts) => {
    assert.equal(url, "/checkPerm");
    assert.equal(opts.method, "GET");
    assert.equal(opts.headers["Content-Type"], "application/json");
    assert.equal(opts.headers["Authorization"], "tester@example.com");

    return {
      async json() {
        return { perm: "member" };
      },
    };
  };

  loadRealScript(window, "public/scripts/perm.js");
  await tick();

  // Redirect proof: either navigation error OR href includes index.html
  const redirected =
    sawNavigationError(jsdomErrors) || window.location.href.includes("index.html");

  assert.ok(redirected, "Expected redirect attempt to ../index.html for non-moderator");
});

test("PERM (real script): moderator does NOT redirect", async () => {
  const virtualConsole = new VirtualConsole();
  const jsdomErrors = [];
  virtualConsole.on("jsdomError", (e) => jsdomErrors.push(e));

  const dom = new JSDOM(`<!doctype html>`, {
    url: "https://example.com/mod.html",
    runScripts: "dangerously",
    virtualConsole,
  });
  const { window } = dom;

  window.localStorage.setItem("name", "tester@example.com");

  window.fetch = async () => ({
    async json() {
      return { perm: "moderator" };
    },
  });

  loadRealScript(window, "public/scripts/perm.js");
  await tick();

  // Moderator should not attempt navigation and should not end up on index.html
  assert.ok(!sawNavigationError(jsdomErrors), "Did not expect navigation error for moderator");
  assert.ok(!window.location.href.includes("index.html"), "Did not expect href to change to index.html");
});
