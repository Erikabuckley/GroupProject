getChallenges();
getMissions();

async function getChallenges() {
    const res = await fetch("/updateChallengeList",//route to backend
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": localStorage.getItem('name')
            }
        }
    );
    const data = await res.json();//gets challenge information
    var title = data.title;
    var date = data.date;

    var challenges = document.getElementById("challenges");
    challenges.innerHTML = "";

    for (let i = 0; i < title.length; i++) {
        let cardDiv = document.createElement("div")
        let titleDiv = document.createElement("div");
        let dateDiv = document.createElement("div");
        cardDiv.className = "card";
        titleDiv.className = "title";
        dateDiv.className = "date";

        titleDiv.innerHTML = title[i];
        dateDiv.innerHTML = date[i];
        cardDiv.appendChild(titleDiv);
        cardDiv.appendChild(dateDiv);

        challenges.appendChild(cardDiv);//adds each challenge to a card and adds them the the main div
    }
}

async function getMissions() {
    const res = await fetch("/updateMissionList",//route to backend
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": localStorage.getItem('name')
            }
        }
    );
    const data = await res.json();// gets all mission information
    var title = data.title;

    var challenges = document.getElementById("missions");
    challenges.innerHTML = "";

    for (let i = 0; i < title.length; i++) {
        let cardDiv = document.createElement("div")
        let titleDiv = document.createElement("div");
        cardDiv.className = "card";
        titleDiv.className = "title";

        titleDiv.innerHTML = title[i];
        cardDiv.appendChild(titleDiv);

        missions.appendChild(cardDiv);//adds each mission to a card then adds this to the main div
    }
}