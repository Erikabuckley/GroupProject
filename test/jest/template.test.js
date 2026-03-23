const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");

// Resolves the path to template.js, checking both possible locations.
// Throws early if the file cannot be found rather than failing mid-test.
const SCRIPT_PATH = (() => {
  const candidates = [
    path.join(__dirname, "..", "..", "public", "scripts", "template.js"),
    path.join(__dirname, "..", "..", "scripts", "template.js"),
  ];
  return candidates.find((p) => fs.existsSync(p));
})();

// Creates a JSDOM environment with the shared page shell that template.js
// expects to find, header/footer containers, role divs, and nav buttons.
// VirtualConsole with omitJSDOMErrors: true suppresses navigation "not implemented"
// errors that fire when the script attempts a redirect after sign out.
function makeDom(url) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.sendTo(console, { omitJSDOMErrors: true });
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
    { url, runScripts: "dangerously", virtualConsole }
  );
}

// Loads template.js into the JSDOM window with two adjustments:
// 1. Strips the ES module `import` statement so jsdom can eval the file.
// 2. Injects a mock checkAuth() that reads from localStorage instead of
//    fetching /getSession, keeping auth state fully under test control.
function loadScript(dom) {
  let code = fs.readFileSync(SCRIPT_PATH, "utf8");

  code = code.replace(/^\s*import\s+.*?['"].*?['"];?\s*$/m, "");

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

// Waits for async operations (fetch, DOM updates) to complete.
// Uses a real timeout rather than tick() because template.js relies
// on timing for header injection after checkAuth resolves.
async function wait(ms = 20) {
  await new Promise((r) => setTimeout(r, ms));
}

// Reset all mocks between tests to prevent state leaking across tests.
beforeEach(() => {
  jest.clearAllMocks();
});

// When the user is a moderator, template.js should fetch and inject the
// header HTML, then show #moderator and keep #participant hidden.
test("TEMPLATE: loads dashboard header and shows moderator view", async () => {
  const dom = makeDom("http://localhost/dash/dashboard.html");

  // Fetch mock returns header HTML for any .html request (the header template),
  // and 404 for anything else so unexpected calls fail loudly.
  dom.window.fetch = jest.fn(async (url) => {
    if (url.includes(".html")) return { text: async () => "<div>Header Loaded</div>" };
    return { status: 404 };
  });

  dom.window.localStorage.setItem("auth", "1");
  dom.window.localStorage.setItem("type", "moderator");

  loadScript(dom);
  await wait();

  const header = dom.window.document.getElementsByClassName("header-container")[0];
  expect(header.innerHTML).toContain("Header Loaded");

  expect(dom.window.document.getElementById("moderator").style.display).toBe("flex");
  expect(dom.window.document.getElementById("participant").style.display).toBe("none");
});

// When the user is a regular participant, template.js should show #participant
// and keep #moderator hidden.
test("TEMPLATE: loads dashboard header and shows participant view", async () => {
  const dom = makeDom("http://localhost/dash/dashboard.html");

  dom.window.fetch = jest.fn(async (url) => {
    if (url.includes(".html")) return { text: async () => "" };
    return { status: 404 };
  });

  dom.window.localStorage.setItem("auth", "1");
  dom.window.localStorage.setItem("type", "user");

  loadScript(dom);
  await wait();

  expect(dom.window.document.getElementById("participant").style.display).toBe("flex");
  expect(dom.window.document.getElementById("moderator").style.display).toBe("none");
});

// Clicking the sign out button should call /destroySession.
// The subsequent redirect attempt is expected but not asserted,
// JSDOM cannot follow navigation, and the error is suppressed by VirtualConsole.
test("TEMPLATE: sign out button calls /destroySession", async () => {
  const dom = makeDom("http://localhost/dash/dashboard.html");

  dom.window.fetch = jest.fn(async (url) => {
    if (url === "/destroySession") return { status: 200 };
    return { text: async () => "" };
  });

  dom.window.localStorage.setItem("auth", "1");
  dom.window.localStorage.setItem("name", "me");
  dom.window.localStorage.setItem("type", "moderator");

  loadScript(dom);
  await wait();

  dom.window.document.getElementById("signOut").click();
  await wait();

  const calledUrls = dom.window.fetch.mock.calls.map(([url]) => url);
  expect(calledUrls).toContain("/destroySession");
});