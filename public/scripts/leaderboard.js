getLeaderboard();

// gets the number of points per group
async function getLeaderboard() {
    const res = await fetch("/updateLeaderboard");

    //gets challenge information
    const data = await res.json();
    var name = data.name;
    var points = data.total;

    var groups = document.getElementById("groups");
    groups.innerHTML = "";

    for (let i = 0; i < name.length; i++) {
        let cardDiv = document.createElement("div")
        let groupDiv = document.createElement("div");
        let pointsDiv = document.createElement("div");
        cardDiv.className = "card";
        groupDiv.className = "title";
        pointsDiv.className = "text";

        groupDiv.innerHTML = name[i];
        pointsDiv.innerHTML = points[i]
        cardDiv.appendChild(groupDiv);
        cardDiv.appendChild(pointsDiv);
        //adds each challenge to a card and adds them the the main div
        groups.appendChild(cardDiv);
    }
}
