const { JSDOM } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");

// Loads a real browser script into a JSDOM window by reading it from disk
// and passing it to eval, simulating how a browser would execute it.
function loadRealScript(window, relPathFromRoot) {
  const scriptPath = path.join(__dirname, "..", "..", relPathFromRoot);
  const code = fs.readFileSync(scriptPath, "utf8");
  window.eval(code);
}

// Yields control back to the event loop, allowing any pending
// microtasks and macrotasks (e.g. fetch callbacks) to settle.
async function tick() {
  await new Promise((r) => setTimeout(r, 0));
}

// Creates a JSDOM window with the given HTML string,
// configured to run scripts and resolve relative URLs correctly.
function makeDom(html) {
  const dom = new JSDOM(html, {
    url: "https://example.com/page.html",
    runScripts: "dangerously",
  });
  return dom.window;
}

// Returns a jest.fn() that mocks fetch for the two endpoints
// challengeUtil.js calls on load: /updateChallengeList and /updateMissionList.
function makeFetch({ challenges, missions }) {
  return jest.fn(async (url) => {
    if (url === "/updateChallengeList") {
      return { json: async () => challenges };
    }
    if (url === "/updateMissionList") {
      return { json: async () => missions };
    }
    throw new Error("Unexpected fetch call: " + url);
  });
}

// Reset all mocks between tests to prevent state leaking across tests.
beforeEach(() => {
  jest.clearAllMocks();
});

// On load, challengeUtil.js should fetch both endpoints and render
// one card per challenge and one card per mission into the DOM.
test("CHALLENGES: loads challengeUtil.js and renders challenge cards", async () => {
  const window = makeDom(`<!doctype html>
    <div id="challenges"></div>
    <div id="missions"></div>`);

  window.fetch = makeFetch({
    challenges: {
      title: ["Challenge A", "Challenge B"],
      date: ["01/02/2026", "02/02/2026"],
      evidence: [true, false],
    },
    missions: {
      title: ["Mission 1", "Mission 2", "Mission 3"],
    },
  });

  loadRealScript(window, "public/scripts/challengeUtil.js");

  // Two ticks: first lets the fetch promises resolve,
  // second lets the DOM updates from those callbacks settle.
  await tick();
  await tick();

  expect(window.fetch).toHaveBeenCalledWith("/updateChallengeList");
  expect(window.fetch).toHaveBeenCalledWith("/updateMissionList");

  const challengeCards = window.document.querySelectorAll("#challenges .card");
  expect(challengeCards.length).toBe(2);
  expect(challengeCards[0].querySelector(".title").textContent).toBe("Challenge A");
  expect(challengeCards[0].textContent).toContain("01/02/2026");

  const missionCards = window.document.querySelectorAll("#missions .card");
  expect(missionCards.length).toBe(3);
  expect(missionCards[0].querySelector(".title").textContent).toBe("Mission 1");
  expect(missionCards[2].querySelector(".title").textContent).toBe("Mission 3");
});

// Before rendering new cards, challengeUtil.js should wipe any
// existing content in #challenges and #missions to avoid duplicates.
test("CHALLENGES: clears existing content before rendering", async () => {
  const window = makeDom(`<!doctype html>
    <div id="challenges">OLD</div>
    <div id="missions">OLD</div>`);

  window.fetch = makeFetch({
    challenges: {
      title: ["C"],
      date: ["D"],
      evidence: [false],
    },
    missions: {
      title: ["M"],
    },
  });

  loadRealScript(window, "public/scripts/challengeUtil.js");
  await tick();
  await tick();

  expect(window.document.getElementById("challenges").textContent).not.toContain("OLD");
  expect(window.document.getElementById("missions").textContent).not.toContain("OLD");

  expect(window.document.querySelectorAll("#challenges .card").length).toBe(1);
  expect(window.document.querySelectorAll("#missions .card").length).toBe(1);
});