//test/total.test.js
// total.js calls updateTotal() immediately on load.
// updateTotal():
// GET /updateTotal
// reads JSON { total: number }
// sets #total-carbon textContent to "<total>g"

const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");

function loadRealScript(window, relPathFromRoot) {
  const scriptPath = path.join(__dirname, "..", relPathFromRoot);
  const code = fs.readFileSync(scriptPath, "utf8");
  window.eval(code);
}

async function tick() {
  // Slightly safer than only setTimeout in some jsdom + async chains
  await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
}

test("TOTAL (real script): loads total.js and updates #total-carbon from /updateTotal", async () => {
  const dom = new JSDOM(`<!doctype html><div id="total-carbon"></div>`, {
    url: "https://example.com/index.html",
    runScripts: "dangerously",
  });
  const { window } = dom;

  // Mock fetch BEFORE loading total.js (because total.js runs immediately)
  let fetchCall = null;

  window.fetch = async (url, opts) => {
    fetchCall = { url, opts };

    assert.equal(url, "/updateTotal");
    assert.equal(opts.method, "GET");
    assert.equal(opts.headers["Content-Type"], "application/json");

    return {
      async json() {
        return { total: 42 };
      },
    };
  };

  loadRealScript(window, "public/scripts/total.js");
  await tick();

  assert.ok(fetchCall, "Expected fetch to be called by total.js");
  assert.equal(window.document.getElementById("total-carbon").textContent, "42g");

  // Cleanup: total.js assigns `total = ...` without let/const
  delete window.total;
});

test("TOTAL (real script): overwrites existing text in #total-carbon", async () => {
  const dom = new JSDOM(`<!doctype html><div id="total-carbon">old</div>`, {
    url: "https://example.com/index.html",
    runScripts: "dangerously",
  });
  const { window } = dom;

  window.fetch = async () => ({
    async json() {
      return { total: 0 };
    },
  });

  loadRealScript(window, "public/scripts/total.js");
  await tick();

  assert.equal(window.document.getElementById("total-carbon").textContent, "0g");

  delete window.total;
});