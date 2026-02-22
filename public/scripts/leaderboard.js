getLeaderboard();

async function getLeaderboard() {
    const res = await fetch("/updateLeaderboard",//route to backend
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        }
    );
    const data = await res.json();//gets challenge information
    var name = data.name;
    //var points = data.points;

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
        pointsDiv.innerHTML = 0; //points[i]
        cardDiv.appendChild(groupDiv);
        cardDiv.appendChild(pointsDiv);

        groups.appendChild(cardDiv);//adds each challenge to a card and adds them the the main div
    }
}
