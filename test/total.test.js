//test/total.test.js
// total.js calls updateTotal() immediately on load.
// updateTotal():
//   GET /updateTotal
//   reads JSON { total: number }
//   divides total by 1000 to get max counter value
//   animates #total-carbon from 0 up to max via setInterval (10ms per tick)
//   sets innerHTML to "<count>kg" on each tick
//
// NOTE on counter behaviour:
//   current starts at 0, then current++ runs BEFORE the >= check.
//   So for total:0  → max=0,  first tick: current=1, 1>=0 → sets "1kg"
//   For total:3000  → max=3,  after 3 ticks: current=3, 3>=3 → sets "3kg"

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

test("TOTAL (real script): loads total.js and updates #total-carbon from /updateTotal", async () => {
  const dom = new JSDOM(`<!doctype html><div id="total-carbon"></div>`, {
    url: "https://example.com/index.html",
    runScripts: "dangerously",
  });
  const { window } = dom;

  let fetchCall = null;

  window.fetch = async (url, opts) => {
    fetchCall = { url, opts };

    assert.equal(url, "/updateTotal");
    assert.equal(opts.method, "GET");
    assert.equal(opts.headers["Content-Type"], "application/json");

    return {
      async json() {
        // FIX: use total:3000 → max=3, only 3 ticks × 10ms needed.
        // Finishes in ~30ms, well within the 150ms wait below.
        return { total: 3000 };
      },
    };
  };

  loadRealScript(window, "public/scripts/total.js");

  // FIX: 3 ticks × 10ms = 30ms. Wait 150ms for safe margin.
  await new Promise((r) => setTimeout(r, 150));

  assert.ok(fetchCall, "Expected fetch to be called by total.js");
  // Script appends "kg": counter reaches 3, sets "3kg"
  assert.equal(window.document.getElementById("total-carbon").innerHTML, "3kg");

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
      // FIX: total:0 → max=0. Counter does current++ first (→1), then checks 1>=0 (true).
      // So innerHTML is set to "1kg", not "0kg".
      return { total: 0 };
    },
  });

  loadRealScript(window, "public/scripts/total.js");

  await new Promise((r) => setTimeout(r, 50));

  // FIX: expect "1kg" — counter increments before the >= check, so min output is "1kg"
  assert.equal(window.document.getElementById("total-carbon").innerHTML, "1kg");

  delete window.total;
});