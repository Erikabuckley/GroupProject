updatePoints();
getMembers();

async function getMembers() { // gets the numbers of participants in the game
    try {
        const res = await fetch("/getMembers", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        });

        if (!res.ok) throw new Error("Failed to fetch members");

        const data = await res.json();
        document.getElementById("members").textContent = data.total + " members";

    } catch (err) {
        console.error("getMembers error:", err);
        document.getElementById("members").textContent = "Error loading members";
    }
}

async function updatePoints() { // gets the total number of points gained
    try {
        const res = await fetch("/updatePoints", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        });

        if (!res.ok) throw new Error("Failed to fetch points");

        const data = await res.json();
        document.getElementById("points").textContent = data.total + " points";

    } catch (err) {
        console.error("updatePoints error:", err);
        document.getElementById("points").textContent = "Error loading points";
    }
}