const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");

function loadRealScript(window, relPathFromRoot) {
  const scriptPath = path.join(__dirname, "..", "..", relPathFromRoot);
  const code = fs.readFileSync(scriptPath, "utf8");
  window.eval(code);
}

async function tick() {
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
       <button id="upgrade-status">Upgrade</button>
       <button id="delete-account">Delete</button>
       <div id="error-message" style="visibility:hidden"></div>
     </body>
     </html>`,
    {
      url: "https://example.com/settings.html",
      runScripts: "dangerously",
      virtualConsole,
    }
  );

  return { window: dom.window, jsdomErrors };
}

test("SETTINGS (real script): upgrade success posts correctly and keeps error hidden", async () => {
  const { window, jsdomErrors } = makeWindow();

  let lastRequest = null;

  window.fetch = async (url, opts = {}) => {
    lastRequest = { url, opts };

    assert.equal(url, "/upgrade");
    assert.equal(opts.method, "POST");
    assert.equal(opts.headers["Content-Type"], "application/json");
    assert.equal(opts.body, undefined);

    return {
      status: 200,
      async json() {
        return {};
      },
    };
  };

  loadRealScript(window, "public/scripts/settingsUtil.js");
  await tick();

  window.document.getElementById("upgrade-status").click();
  await tick();
  await tick();

  assert.ok(lastRequest, "Expected POST /upgrade to be called");

  assert.equal(
    window.document.getElementById("error-message").style.visibility,
    "hidden"
  );

  const hrefChanged = window.location.href.includes("../validation/login.html")
    || window.location.href.includes("/validation/login.html");

  const navError = jsdomErrors.some((e) =>
    String(e && e.message ? e.message : e).includes("navigation")
  );

  assert.ok(
    hrefChanged || navError,
    "Expected redirect attempt to login page on successful upgrade"
  );
});

test("SETTINGS (real script): upgrade failure (401) shows error message", async () => {
  const { window } = makeWindow();

  window.fetch = async (url, opts = {}) => {
    assert.equal(url, "/upgrade");
    assert.equal(opts.method, "POST");
    assert.equal(opts.headers["Content-Type"], "application/json");
    assert.equal(opts.body, undefined);

    return {
      status: 401,
      async json() {
        return {};
      },
    };
  };

  loadRealScript(window, "public/scripts/settingsUtil.js");
  await tick();

  window.document.getElementById("upgrade-status").click();
  await tick();

  assert.equal(
    window.document.getElementById("error-message").style.visibility,
    "visible"
  );
});