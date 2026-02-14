// Real-script tests for our front-end file: public/scripts/validation.js
// validation.js attaches a submit handler to #form and branches on
// e.submitter.value ("Log in" vs "Sign up").
//
// What we test:
// 1) LOGIN 401 -> shows #error-message (text + visibility)
// 2) LOGIN success -> sets localStorage (type/auth/name) + calls /login
// 3) SIGN UP with priv/tandc NOT checked -> does NOT call fetch
// 4) SIGN UP 401 -> shows #error-message (text + visibility)
// 5) SIGN UP success -> calls /signUp (redirect not asserted in jsdom)

const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");

const SCRIPT_PATH = (() => {
  const candidates = [
    path.join(__dirname, "..", "public", "scripts", "validation.js"),
    path.join(__dirname, "..", "scripts", "validation.js"),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error(`validation.js not found. Looked in:\n${candidates.join("\n")}`);
  return found;
})();

async function tick() {
  await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
}

function makeDom() {
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

     <!-- Our real script uses ONLY #error-message -->
     <div id="error-message" style="visibility:hidden"></div>`,
    { url: "http://localhost/validation/login.html", runScripts: "dangerously" }
  );
}

function loadValidationScript(dom) {
  const code = fs.readFileSync(SCRIPT_PATH, "utf8");
  dom.window.eval(code);
}

// Dispatch submit event and attach e.submitter (jsdom doesn’t set it automatically)
function submitForm(dom, buttonId) {
  const form = dom.window.document.getElementById("form");
  const btn = dom.window.document.getElementById(buttonId);

  // Ensure the exact strings the production code checks
  btn.value = buttonId === "loginBtn" ? "Log in" : "Sign up";
  btn.setAttribute("value", btn.value);

  const ev = new dom.window.Event("submit", { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "submitter", { value: btn, configurable: true });
  form.dispatchEvent(ev);
}

test("LOGIN: status 401 shows #error-message", async () => {
  const dom = makeDom();

  dom.window.document.getElementById("email-input").value = "a@a.com";
  dom.window.document.getElementById("password-input").value = "wrong";

  let called = null;

  dom.window.fetch = async (url, options) => {
    called = { url, options };
    assert.equal(url, "/login");
    assert.equal(options.method, "POST");
    assert.equal(options.headers["Content-Type"], "application/json");
    return {
      status: 401,
      json: async () => ({ error: "Invalid login" }),
    };
  };

  loadValidationScript(dom);
  submitForm(dom, "loginBtn");
  await tick();

  assert.ok(called, "Expected fetch to be called for login");

  const err = dom.window.document.getElementById("error-message");
  assert.equal(err.style.visibility, "visible");
  assert.equal(err.textContent, "Invalid login");

  // Should NOT set auth on failure
  assert.notEqual(dom.window.localStorage.getItem("auth"), "1");
});

test("LOGIN: success sets localStorage (redirect not asserted in jsdom)", async () => {
  const dom = makeDom();

  dom.window.document.getElementById("email-input").value = "user@test.com";
  dom.window.document.getElementById("password-input").value = "pass";

  let called = null;

  dom.window.fetch = async (url, options) => {
    called = { url, options };
    return {
      status: 200,
      json: async () => ({ type: "moderator" }),
    };
  };

  loadValidationScript(dom);
  submitForm(dom, "loginBtn");
  await tick();

  assert.ok(called, "Expected fetch to be called for login");
  assert.equal(String(called.url), "/login");
  assert.equal(called.options.method, "POST");
  assert.equal(called.options.headers["Content-Type"], "application/json");

  // Success branch effects
  assert.equal(dom.window.localStorage.getItem("type"), "moderator");
  assert.equal(dom.window.localStorage.getItem("auth"), "1");
  assert.equal(dom.window.localStorage.getItem("name"), "user@test.com");
});

test("SIGN UP: if priv/tandc not checked, it should NOT call fetch", async () => {
  const dom = makeDom();

  dom.window.document.getElementById("email-input").value = "new@test.com";
  dom.window.document.getElementById("password-input").value = "pw";
  dom.window.document.getElementById("firstname-input").value = "Nehir";

  let called = false;
  dom.window.fetch = async () => {
    called = true;
    return { status: 200, json: async () => ({ ok: true }) };
  };

  loadValidationScript(dom);
  submitForm(dom, "signupBtn");
  await tick();

  assert.equal(called, false, "Expected no fetch when priv/tandc are not checked");
});

test("SIGN UP: status 401 shows #error-message (when checkboxes ticked)", async () => {
  const dom = makeDom();

  dom.window.document.getElementById("email-input").value = "new@test.com";
  dom.window.document.getElementById("password-input").value = "pw";
  dom.window.document.getElementById("firstname-input").value = "Nehir";
  dom.window.document.getElementById("priv").checked = true;
  dom.window.document.getElementById("tandc").checked = true;

  dom.window.fetch = async (url, options) => {
    assert.equal(url, "/signUp");
    assert.equal(options.method, "POST");
    return {
      status: 401,
      json: async () => ({ error: "Email already exists" }),
    };
  };

  loadValidationScript(dom);
  submitForm(dom, "signupBtn");
  await tick();

  const err = dom.window.document.getElementById("error-message");
  assert.equal(err.style.visibility, "visible");
  assert.equal(err.textContent, "Email already exists");
});

test("SIGN UP: success calls /signUp (redirect not asserted in jsdom)", async () => {
  const dom = makeDom();

  dom.window.document.getElementById("email-input").value = "new@test.com";
  dom.window.document.getElementById("password-input").value = "pw";
  dom.window.document.getElementById("firstname-input").value = "Nehir";
  dom.window.document.getElementById("priv").checked = true;
  dom.window.document.getElementById("tandc").checked = true;

  let called = null;

  dom.window.fetch = async (url, options) => {
    called = { url, options };
    return { status: 200, json: async () => ({ ok: true }) };
  };

  loadValidationScript(dom);
  submitForm(dom, "signupBtn");
  await tick();

  assert.ok(called, "Expected fetch to be called for signup");
  assert.equal(String(called.url), "/signUp");
  assert.equal(called.options.method, "POST");
  assert.equal(called.options.headers["Content-Type"], "application/json");

  // Payload shape check (matches JSON.stringify({ email, password, name }))
  const payload = JSON.parse(called.options.body);
  assert.deepEqual(payload, {
    email: "new@test.com",
    password: "pw",
    name: "Nehir",
  });
});