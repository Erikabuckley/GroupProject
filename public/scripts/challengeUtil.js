// calls the 2 functions to populate the page with challenges and missions
getChallenges();
console.log("Added challenges")
getMissions();
console.log("Added missions")

// gets the list of current challenges that a user can take part in
async function getChallenges() {
    try {
        const res = await fetch("/updateChallengeList");
        const data = await res.json();

        var title = data.title;
        var date = data.date;
        var evidence = data.evidence;

        var challenges = document.getElementById("challenges");
        challenges.innerHTML = "";

        // for every challenge we create a div and add information to it
        for (let i = 0; i < title.length; i++) {
            let cardDiv = document.createElement("div")
            let titleDiv = document.createElement("div");
            let dateDiv = document.createElement("div");
            let evidenceDiv = document.createElement("div");
            let img = document.createElement("img");

            // adds a camera icon if evidence is required
            if (evidence[i] === 'true') {
                img.src = "../images/camera.png"
            }

            cardDiv.className = "card";
            titleDiv.className = "title";
            dateDiv.className = "date";
            evidenceDiv.className = "evidence";

            titleDiv.innerHTML = title[i];
            dateDiv.innerHTML = "End date: " + date[i];
            evidenceDiv.appendChild(img);
            cardDiv.appendChild(titleDiv);
            cardDiv.appendChild(dateDiv);
            cardDiv.appendChild(evidenceDiv)

            //adds each challenge to a card and adds them the the main div
            challenges.appendChild(cardDiv);
        }
    } catch (err) {
        console.error("getMembers error:", err);
        document.getElementById("challenges").textContent = "Error loading challenges";
    }
}

// gets the list of current missions that a user can take part in
async function getMissions() {
    try {
        const res = await fetch("/updateMissionList");
        const data = await res.json();
        var title = data.title;

        var missions = document.getElementById("missions");
        missions.innerHTML = "";
        // creates a div for every mission and adds the information to it
        for (let i = 0; i < title.length; i++) {
            let cardDiv = document.createElement("div")
            let titleDiv = document.createElement("div");
            cardDiv.className = "card";
            titleDiv.className = "title";

            titleDiv.innerHTML = title[i];
            cardDiv.appendChild(titleDiv);

            //adds each mission to a card then adds this to the main div
            missions.appendChild(cardDiv);
        }
    } catch (err) {
        console.error("updatePoints error:", err);
        document.getElementById("missions").textContent = "Error loading missions";
    }
}