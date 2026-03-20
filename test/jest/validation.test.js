const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");

// Resolves the path to validation.js, checking both possible locations.
// Throws early if the file cannot be found rather than failing mid-test.
const SCRIPT_PATH = (() => {
  const candidates = [
    path.join(__dirname, "..", "..", "public", "scripts", "validation.js"),
    path.join(__dirname, "..", "..", "scripts", "validation.js"),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error(`validation.js not found. Looked in:\n${candidates.join("\n")}`);
  return found;
})();

// Yields control back to the event loop twice, allowing fetch promises
// and any subsequent DOM update callbacks to fully settle.
async function tick() {
  await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
}

// Creates a JSDOM environment with the login/signup form structure.
// VirtualConsole with omitJSDOMErrors: true suppresses navigation errors
// that fire when validation.js redirects after a successful login or signup.
function makeDom() {
  const virtualConsole = new VirtualConsole();
  virtualConsole.sendTo(console, { omitJSDOMErrors: true });
  return new JSDOM(
    `<!doctype html>
     <form id="form">
       <input id="email-input" />
       <input id="password-input" />
       <input id="firstname-input" />
       <input type="checkbox" id="priv" />
       <input type="checkbox" id="tandc" />
       <button id="loginBtn" type="submit" value="Log in">Log in</button>
       <button id="signupBtn" type="submit" value="Sign up">Sign up</button>
     </form>

     <div id="error-message" style="visibility:hidden"></div>`,
    { url: "http://localhost/validation/login.html", runScripts: "dangerously", virtualConsole }
  );
}

// Loads validation.js into the JSDOM window via eval.
function loadValidationScript(dom) {
  const code = fs.readFileSync(SCRIPT_PATH, "utf8");
  dom.window.eval(code);
}

// Dispatches a submit event on #form and manually sets e.submitter to the
// given button, JSDOM does not set submitter automatically, but validation.js
// reads e.submitter.value to determine whether to run login or signup logic.
function submitForm(dom, buttonId) {
  const form = dom.window.document.getElementById("form");
  const btn = dom.window.document.getElementById(buttonId);

  btn.value = buttonId === "loginBtn" ? "Log in" : "Sign up";
  btn.setAttribute("value", btn.value);

  const ev = new dom.window.Event("submit", { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "submitter", { value: btn, configurable: true });
  form.dispatchEvent(ev);
}

// Reset all mocks between tests to prevent state leaking across tests.
beforeEach(() => {
  jest.clearAllMocks();
});

// When /login returns 401, the error message element should become visible
// with the server's error text, and auth should not be set in localStorage.
test("LOGIN: status 401 shows #error-message", async () => {
  const dom = makeDom();

  dom.window.document.getElementById("email-input").value = "a@exeter.ac.uk";
  dom.window.document.getElementById("password-input").value = "wrong";

  dom.window.fetch = jest.fn(async () => ({
    status: 401,
    json: async () => ({ error: "Invalid login" }),
  }));

  loadValidationScript(dom);
  submitForm(dom, "loginBtn");
  await tick();

  expect(dom.window.fetch).toHaveBeenCalledTimes(1);

  // Inspect the /login request arguments directly from mock.calls.
  const call = dom.window.fetch.mock.calls[0];
  expect(call[0]).toBe("/login");
  expect(call[1].method).toBe("POST");
  expect(call[1].headers["Content-Type"]).toBe("application/json");

  const err = dom.window.document.getElementById("error-message");
  expect(err.style.visibility).toBe("visible");
  expect(err.textContent).toBe("Invalid login");

  // Session is server-managed, auth should never be written to localStorage.
  expect(dom.window.localStorage.getItem("auth")).not.toBe("1");
});

// On successful login, validation.js should call /login first, then /setSession.
// The subsequent redirect is expected but not asserted, JSDOM cannot follow it.
test("LOGIN: success calls /login then /setSession", async () => {
  const dom = makeDom();

  dom.window.document.getElementById("email-input").value = "user@exeter.ac.uk";
  dom.window.document.getElementById("password-input").value = "pass";

  dom.window.fetch = jest.fn(async (url) => {
    if (url === "/login") return { status: 200, json: async () => ({ type: "moderator" }) };
    if (url === "/setSession") return { status: 200, json: async () => ({}) };
    throw new Error("Unexpected fetch: " + url);
  });

  loadValidationScript(dom);
  submitForm(dom, "loginBtn");
  await tick();

  const calledUrls = dom.window.fetch.mock.calls.map(([url]) => url);
  expect(calledUrls).toContain("/login");
  expect(calledUrls).toContain("/setSession");

  // Also verify the /login request was well-formed.
  const loginCall = dom.window.fetch.mock.calls.find(([url]) => url === "/login");
  expect(loginCall[1].method).toBe("POST");
  expect(loginCall[1].headers["Content-Type"]).toBe("application/json");
});

// If the user tries to sign up without accepting the privacy policy and
// terms, validation.js should block the request entirely, no fetch call made.
test("SIGN UP: if priv/tandc not checked, it should NOT call fetch", async () => {
  const dom = makeDom();

  dom.window.document.getElementById("email-input").value = "new@exeter.ac.uk";
  dom.window.document.getElementById("password-input").value = "pw";
  dom.window.document.getElementById("firstname-input").value = "Nehir";

  // Checkboxes intentionally left unchecked.
  dom.window.fetch = jest.fn(async () => ({
    status: 200,
    json: async () => ({ ok: true }),
  }));

  loadValidationScript(dom);
  submitForm(dom, "signupBtn");
  await tick();

  expect(dom.window.fetch).not.toHaveBeenCalled();
});

// When /signUp returns 401 (e.g. email already registered), the error message
// should become visible with the server's error text.
test("SIGN UP: status 401 shows #error-message when checkboxes ticked", async () => {
  const dom = makeDom();

  dom.window.document.getElementById("email-input").value = "new@exeter.ac.uk";
  dom.window.document.getElementById("password-input").value = "pw";
  dom.window.document.getElementById("firstname-input").value = "Nehir";
  dom.window.document.getElementById("priv").checked = true;
  dom.window.document.getElementById("tandc").checked = true;

  dom.window.fetch = jest.fn(async () => ({
    status: 401,
    json: async () => ({ error: "Email already exists" }),
  }));

  loadValidationScript(dom);
  submitForm(dom, "signupBtn");
  await tick();

  const call = dom.window.fetch.mock.calls[0];
  expect(call[0]).toBe("/signUp");
  expect(call[1].method).toBe("POST");

  const err = dom.window.document.getElementById("error-message");
  expect(err.style.visibility).toBe("visible");
  expect(err.textContent).toBe("Email already exists");
});

// On a successful signup, validation.js should POST to /signUp with the
// correct JSON payload containing email, password, and display name.
test("SIGN UP: success calls /signUp with correct payload", async () => {
  const dom = makeDom();

  dom.window.document.getElementById("email-input").value = "new@exeter.ac.uk";
  dom.window.document.getElementById("password-input").value = "pw";
  dom.window.document.getElementById("firstname-input").value = "Nehir";
  dom.window.document.getElementById("priv").checked = true;
  dom.window.document.getElementById("tandc").checked = true;

  dom.window.fetch = jest.fn(async () => ({
    status: 200,
    json: async () => ({ ok: true }),
  }));

  loadValidationScript(dom);
  submitForm(dom, "signupBtn");
  await tick();

  expect(dom.window.fetch).toHaveBeenCalledTimes(1);

  // Inspect the full /signUp request from mock.calls.
  const call = dom.window.fetch.mock.calls[0];
  expect(call[0]).toBe("/signUp");
  expect(call[1].method).toBe("POST");
  expect(call[1].headers["Content-Type"]).toBe("application/json");
  expect(JSON.parse(call[1].body)).toEqual({
    email: "new@exeter.ac.uk",
    password: "pw",
    name: "Nehir",
  });
});