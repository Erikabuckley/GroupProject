const { JSDOM } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");

// Loads a real browser script into a JSDOM window by reading it from disk
// and passing it to eval — simulating how a browser would execute it.
function loadRealScript(window, relPathFromRoot) {
  const scriptPath = path.join(__dirname, "..", "..", relPathFromRoot);
  const code = fs.readFileSync(scriptPath, "utf8");
  window.eval(code);
}

// Reset all mocks between tests to prevent state leaking across tests.
beforeEach(() => {
  jest.clearAllMocks();
});

// On load, total.js calls /updateTotal, divides the total by 1000 to get
// a max counter value, then animates #total-carbon up to that value via setInterval.
// total: 3000 → max = 3 → counter runs 3 ticks × 10ms = ~30ms.
// We wait 150ms for a safe margin, then assert the final value is "3kg".
test("TOTAL: loads total.js and updates #total-carbon from /updateTotal", async () => {
  const dom = new JSDOM(`<!doctype html><div id="total-carbon"></div>`, {
    url: "https://example.com/index.html",
    runScripts: "dangerously",
  });
  const { window } = dom;

  window.fetch = jest.fn(async () => ({
    json: async () => ({ total: 3000 }),
  }));

  loadRealScript(window, "public/scripts/total.js");

  // Wait long enough for the setInterval animation to complete.
  await new Promise((r) => setTimeout(r, 150));

  expect(window.fetch).toHaveBeenCalledTimes(1);
  const calledUrls = window.fetch.mock.calls.map(([url]) => url);
  expect(calledUrls).toContain("/updateTotal");
  expect(window.document.getElementById("total-carbon").innerHTML).toBe("3kg");

  // Clean up the global set by the script to avoid leaking state.
  delete window.total;
});

// When total is 0, max = 0. The counter increments before the >= check,
// so current reaches 1 on the first tick (1 >= 0 is true) and sets "1kg".
// This also confirms that pre-existing text in #total-carbon is overwritten.
test("TOTAL: overwrites existing text in #total-carbon", async () => {
  const dom = new JSDOM(`<!doctype html><div id="total-carbon">old</div>`, {
    url: "https://example.com/index.html",
    runScripts: "dangerously",
  });
  const { window } = dom;

  window.fetch = jest.fn(async () => ({
    json: async () => ({ total: 0 }),
  }));

  loadRealScript(window, "public/scripts/total.js");

  await new Promise((r) => setTimeout(r, 50));

  // Minimum output is "1kg" due to the pre-increment in the counter loop.
  expect(window.document.getElementById("total-carbon").innerHTML).toBe("1kg");

  // Clean up the global set by the script to avoid leaking state.
  delete window.total;
});