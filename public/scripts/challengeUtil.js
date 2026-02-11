getChallenges();
getMissions();

async function getChallenges(){
    const res = await fetch ("/updateChallengeList",
        {
            method: "GET",
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : localStorage.getItem('name')
            }
        }
    );
    const data = await res.json();
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

		challenges.appendChild(cardDiv);
	}
}

async function getMissions(){
    const res = await fetch ("/updateMissionList",
        {
            method: "GET",
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : localStorage.getItem('name')
            }
        }
    );
    const data = await res.json();
    var title = data.title;
    var date = data.date;

    var challenges = document.getElementById("missions");
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

		missions.appendChild(cardDiv);
	}
}