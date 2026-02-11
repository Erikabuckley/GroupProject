// test/validationTest.js
// These tests run in Node using jsdom (a fake browser) to test our front-end validation script
// WITHOUT changing any app code.
//
// What we test:
// 1) Login: if backend returns 401 -> show error message
// 2) Login: if backend returns success -> set localStorage values (auth/type/name) + call correct endpoint
// 3) Sign up: if privacy/T&C not ticked -> should NOT call backend
// 4) Sign up: if backend returns 401 -> show error message
// 5) Sign up: if backend returns success -> calls /signUp endpoint (redirect not asserted because jsdom doesn't implement full navigation)

const test = require("node:test"); // Node’s built-in test runner
const assert = require("node:assert/strict"); // strict assertions (better error messages)
const { JSDOM } = require("jsdom"); // browser-like DOM inside Node
const fs = require("node:fs"); // read our real script from disk
const path = require("node:path"); // build safe file paths across OS

// Path to the real front-end script we are testing (runs as-is, no modifications)
const SCRIPT_PATH = path.join(__dirname, "..", "scripts", "validation.js");

// Creates a fake HTML page that contains the elements our script expects.
// If any expected element is missing, the script would crash, so we include them all.
function makeDom() {
  return new JSDOM(
    `
    <form id="form">
      <input id="email-input" />
      <input id="password-input" />
      <input id="firstname-input" />
      <input type="checkbox" id="priv" />
      <input type="checkbox" id="tandc" />

      <!-- Buttons must exist because the script uses e.submitter.value -->
      <button id="loginBtn" type="submit" value="Log in">Log in</button>
      <button id="signupBtn" type="submit" value="Sign up">Sign up</button>
    </form>

    <!-- These are the error containers the script toggles -->
    <div id="error" style="visibility:hidden"></div>
    <div id="error-message" style="visibility:hidden"></div>
    `,
    {
      // Starting URL for our fake page (matters for location.pathname)
      url: "http://localhost/login.html",
      // Allows us to execute the real script code using dom.window.eval(...)
      runScripts: "dangerously",
    }
  );
}

// Loads and executes the real validation.js file inside our jsdom window.
// This registers the event listener on the form exactly like in the real website.
function loadValidationScript(dom) {
  const code = fs.readFileSync(SCRIPT_PATH, "utf8");
  dom.window.eval(code);
}

// Helper to dispatch a "submit" event that includes e.submitter,
// because our production code uses: const action = e.submitter.value;
// In real browsers, submitter exists automatically; in jsdom we attach it manually.
function submitForm(dom, buttonId) {
  const form = dom.window.document.getElementById("form");
  const btn = dom.window.document.getElementById(buttonId);

  // Force the exact strings the production code checks against:
  // if (action === 'Log in') ... else if (action === 'Sign up') ...
  if (buttonId === "loginBtn") {
    btn.value = "Log in";
    btn.setAttribute("value", "Log in");
  } else {
    btn.value = "Sign up";
    btn.setAttribute("value", "Sign up");
  }

  // Create a standard submit event
  const ev = new dom.window.Event("submit", { bubbles: true, cancelable: true });

  // Attach submitter so e.submitter.value works inside the handler
  Object.defineProperty(ev, "submitter", { value: btn, configurable: true });

  // Dispatch the event on the form (triggers the event listener we registered)
  form.dispatchEvent(ev);
}

// ----------------------
// LOGIN TESTS
// ----------------------

test("LOGIN: status 401 shows #error", async () => {
  const dom = makeDom();

  // Fill inputs as a user would
  dom.window.document.getElementById("email-input").value = "a@a.com";
  dom.window.document.getElementById("password-input").value = "wrong";

  // Mock fetch so NO real network call happens
  // The script checks res.status === 401 to decide to show the error
  dom.window.fetch = async () => ({
    status: 401,
    // Our production code also reads res.body.type on success; include body to avoid surprises
    body: { type: "participant" },
  });

  // Load the real script (attaches form submit listener)
  loadValidationScript(dom);

  // Trigger a submit as if "Log in" button was used
  submitForm(dom, "loginBtn");

  // Wait one tick for the async handler to finish
  await new Promise((r) => setTimeout(r, 0));

  // Assert error becomes visible
  assert.equal(dom.window.document.getElementById("error").style.visibility, "visible");
});

test("LOGIN: success sets localStorage (redirect not asserted in jsdom)", async () => {
  const dom = makeDom();

  dom.window.document.getElementById("email-input").value = "user@test.com";
  dom.window.document.getElementById("password-input").value = "pass";

  // Capture the fetch call to prove correct endpoint/method used
  let called = null;

  // Mock fetch to return a successful response
  dom.window.fetch = async (url, options) => {
    called = { url, options };
    return {
      status: 200,
      // IMPORTANT: production code uses res.body.type (not res.json()) so we provide it
      body: { type: "moderator" },
    };
  };

  loadValidationScript(dom);

  submitForm(dom, "loginBtn");
  await new Promise((r) => setTimeout(r, 0));

  // Proves the success branch ran: localStorage values are set
  assert.equal(dom.window.localStorage.getItem("auth"), "1");
  assert.equal(dom.window.localStorage.getItem("name"), "user@test.com");
  assert.equal(dom.window.localStorage.getItem("type"), "moderator");

  // Proves we called the right endpoint with the right shape
  assert.equal(called.url, "http://127.0.0.1:8080/login");
  assert.equal(called.options.method, "POST");
  assert.equal(called.options.headers["Content-Type"], "application/json");
});

// ----------------------
// SIGN UP TESTS
// ----------------------

test("SIGN UP: if priv/tandc not checked, it should NOT call fetch", async () => {
  const dom = makeDom();

  // If our code mistakenly calls fetch, this will flip to true and fail the test
  let called = false;

  dom.window.fetch = async () => {
    called = true;
    return { status: 200 };
  };

  loadValidationScript(dom);

  // Submit signup WITHOUT checking priv/tandc — should not call fetch
  submitForm(dom, "signupBtn");
  await new Promise((r) => setTimeout(r, 0));

  assert.equal(called, false);
});

test("SIGN UP: status 401 shows #error-message (when checkboxes ticked)", async () => {
  const dom = makeDom();

  // Fill inputs + tick checkboxes so signup request is allowed
  dom.window.document.getElementById("email-input").value = "new@test.com";
  dom.window.document.getElementById("password-input").value = "pw";
  dom.window.document.getElementById("firstname-input").value = "Nehir";
  dom.window.document.getElementById("priv").checked = true;
  dom.window.document.getElementById("tandc").checked = true;

  // Mock backend returning 401 (e.g., account exists)
  dom.window.fetch = async () => ({ status: 401 });

  loadValidationScript(dom);

  submitForm(dom, "signupBtn");
  await new Promise((r) => setTimeout(r, 0));

  // Assert correct error message is shown
  assert.equal(dom.window.document.getElementById("error-message").style.visibility, "visible");
});

test("SIGN UP: success calls /signUp (redirect not asserted in jsdom)", async () => {
  const dom = makeDom();

  dom.window.document.getElementById("email-input").value = "new@test.com";
  dom.window.document.getElementById("password-input").value = "pw";
  dom.window.document.getElementById("firstname-input").value = "Nehir";
  dom.window.document.getElementById("priv").checked = true;
  dom.window.document.getElementById("tandc").checked = true;

  // Capture the fetch call so we can assert endpoint/method/headers were correct
  let called = null;

  dom.window.fetch = async (url, options) => {
    called = { url, options };
    return { status: 200 };
  };

  loadValidationScript(dom);

  submitForm(dom, "signupBtn");
  await new Promise((r) => setTimeout(r, 0));

  // Assert correct endpoint was called
  assert.equal(called.url, "http://127.0.0.1:8080/signUp");
  assert.equal(called.options.method, "POST");
  assert.equal(called.options.headers["Content-Type"], "application/json");

  // NOTE: production code sets window.location.href on success,
  // but jsdom doesn't implement real navigation between documents.
  // So we verify the backend call instead of asserting redirect.
});
