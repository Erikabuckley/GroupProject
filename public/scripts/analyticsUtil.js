updatePoints();
getMembers();
updateStats();

// gets the numbers of participants in the game
async function getMembers() {
    try {
        const res = await fetch("/getMembers");

        if (!res.ok) throw new Error("Failed to fetch members");

        const data = await res.json();
        document.getElementById("members").textContent = data.total + " members";

    } catch (err) {
        console.error("getMembers error:", err);
        // updates the members element with the total from the db query
        document.getElementById("members").textContent = "Error loading members";
    }
}

// gets the total number of points gained
async function updatePoints() {
    try {
        const res = await fetch("/updatePoints");

        if (!res.ok) throw new Error("Failed to fetch points");

        const data = await res.json();
        // updates the points element with the result from the db query
        document.getElementById("points").textContent = data.total + " points";

    } catch (err) {
        console.error("updatePoints error:", err);
        document.getElementById("points").textContent = "Error loading points";
    }
}

//updates stats at the bottom of the page
async function updateStats() {
    try {
        const res = await fetch("/updateSubmissionsCount");

        if (!res.ok) throw new Error("Failed to fetch points");

        const data = await res.json();
        //gets total number of challenge submissions
        document.getElementById("challenge-stat").textContent = data[0]["COUNT(submission_id)"];

    } catch (err) {
        document.getElementById("points").textContent = "Error loading stat";
    }

    try {
        const res = await fetch("/updateActionsCount");

        if (!res.ok) throw new Error("Failed to fetch points");
        //gets total number of actions made
        const data = await res.json();
        document.getElementById("mission-stat").textContent = data[0]["total"];

    } catch (err) {
        console.error("update mission stat error:", err);
        document.getElementById("points").textContent = "Error loading stat";
    }
}