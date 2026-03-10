getChallenges();
getMissions();

async function getChallenges() {
    try{
        const res = await fetch("/updateChallengeList");
        const data = await res.json();
        
        var title = data.title;
        var date = data.date;
        var evidence = data.evidence;

        var challenges = document.getElementById("challenges");
        challenges.innerHTML = "";

        for (let i = 0; i < title.length; i++) {
            let cardDiv = document.createElement("div")
            let titleDiv = document.createElement("div");
            let dateDiv = document.createElement("div");
            let evidenceDiv = document.createElement("div");
            let img = document.createElement("img");

            if (evidence[i]){
                img.src= "../images/image.png"
            }

            cardDiv.className = "card";
            titleDiv.className = "title";
            dateDiv.className = "date";
            evidenceDiv.className = "evidence";

            titleDiv.innerHTML = title[i];
            dateDiv.innerHTML = "End date: "+ date[i];
            evidenceDiv.appendChild(img);
            cardDiv.appendChild(titleDiv);
            cardDiv.appendChild(dateDiv);
            cardDiv.appendChild(evidenceDiv)

            challenges.appendChild(cardDiv);//adds each challenge to a card and adds them the the main div
        }
    } catch (err) {
        console.error("getMembers error:", err);
        document.getElementById("challenges").textContent = "Error loading challenges";
    }
}

async function getMissions() {
    try {
        const res = await fetch("/updateMissionList");
        const data = await res.json();// gets all mission information
        var title = data.title;

        var missions = document.getElementById("missions");
        missions.innerHTML = "";

        for (let i = 0; i < title.length; i++) {
            let cardDiv = document.createElement("div")
            let titleDiv = document.createElement("div");
            cardDiv.className = "card";
            titleDiv.className = "title";

            titleDiv.innerHTML = title[i];
            cardDiv.appendChild(titleDiv);

            missions.appendChild(cardDiv);//adds each mission to a card then adds this to the main div
        }
    } catch (err) {
        console.error("updatePoints error:", err);
        document.getElementById("missions").textContent = "Error loading missions";
    }
}