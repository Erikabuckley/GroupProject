updatePoints();
getMembers();

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