// test/challengeUtil.test.js
// challengeUtil.js runs getChallenges() + getMissions() immediately on load.
// So in this test we:
// 1) Create a jsdom page with #challenges and #missions
// 2) Set localStorage name (used in Authorization header)
// 3) Mock window.fetch BEFORE loading the script (because it fetches on load)
// 4) Load and execute our real challengeUtil.js using window.eval()
// 5) Wait a tick, then assert both lists rendered correctly

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
  await new Promise((r) => setTimeout(r, 0));
}

test("CHALLENGES (real script): loads challengeUtil.js and renders challenge cards", async () => {
  const dom = new JSDOM(
    `<!doctype html>
     <div id="challenges"></div>
     <div id="missions"></div>`,
    { url: "https://example.com/page.html", runScripts: "dangerously" }
  );
  const { window } = dom;

  // Our script sends Authorization header from localStorage name
  window.localStorage.setItem("name", "tester@example.com");

  // Track calls to both endpoints
  let calledChallenge = false;
  let calledMission = false;

  window.fetch = async (url, opts) => {
    assert.equal(opts.method, "GET");
    assert.equal(opts.headers["Content-Type"], "application/json");
    assert.equal(opts.headers["Authorization"], "tester@example.com");

    if (url === "/updateChallengeList") {
      calledChallenge = true;
      return {
        async json() {
          return {
            title: ["Challenge A", "Challenge B"],
            date: ["2026-02-01", "2026-02-02"],
          };
        },
      };
    }

    if (url === "/updateMissionList") {
      calledMission = true;
      return {
        async json() {
          return {
            title: ["Mission 1", "Mission 2", "Mission 3"],
          };
        },
      };
    }

    throw new Error("Unexpected fetch call: " + url);
  };

  // Load our real script (it immediately calls getChallenges() and getMissions())
  loadRealScript(window, "public/scripts/challengeUtil.js");

  // Wait for both async calls to finish rendering
  await tick();

  assert.ok(calledChallenge, "Expected /updateChallengeList to be called on load");
  assert.ok(calledMission, "Expected /updateMissionList to be called on load");

  // Assert challenge DOM
  const challengeCards = window.document.querySelectorAll("#challenges .card");
  assert.equal(challengeCards.length, 2);
  assert.equal(challengeCards[0].querySelector(".title").textContent, "Challenge A");

  assert.ok(
  challengeCards[0].textContent.includes("2026-02-01"),
  `Expected first card to contain end date 2026-02-01, got:\n${challengeCards[0].textContent}`
);

  // Assert mission DOM
  const missionCards = window.document.querySelectorAll("#missions .card");
  assert.equal(missionCards.length, 3);
  assert.equal(missionCards[0].querySelector(".title").textContent, "Mission 1");
  assert.equal(missionCards[2].querySelector(".title").textContent, "Mission 3");
});

test("CHALLENGES (real script): clears existing content before rendering", async () => {
  const dom = new JSDOM(
    `<!doctype html>
     <div id="challenges">OLD</div>
     <div id="missions">OLD</div>`,
    { url: "https://example.com/page.html", runScripts: "dangerously" }
  );
  const { window } = dom;

  window.localStorage.setItem("name", "tester@example.com");

  window.fetch = async (url) => {
    if (url === "/updateChallengeList") {
      return { async json() { return { title: ["C"], date: ["D"] }; } };
    }
    if (url === "/updateMissionList") {
      return { async json() { return { title: ["M"] }; } };
    }
    throw new Error("Unexpected fetch call: " + url);
  };

  loadRealScript(window, "public/scripts/challengeUtil.js");
  await tick();

  // OLD should be gone because script sets innerHTML = ""
  assert.equal(window.document.getElementById("challenges").textContent.includes("OLD"), false);
  assert.equal(window.document.getElementById("missions").textContent.includes("OLD"), false);

  // And new cards exist
  assert.equal(window.document.querySelectorAll("#challenges .card").length, 1);
  assert.equal(window.document.querySelectorAll("#missions .card").length, 1);
});