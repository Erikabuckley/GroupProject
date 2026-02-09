getChallenges();
getMissions();

async function getChallenges(){
    const res = await fetch ("/updateChallengeList",
        {
            method: "GET",
            headers: {
                "Content-Type" : "application/json"
            }
        }
    );
    const data = await res.json();
    var title = data.title;
    var text = data.text;

    var challenges = document.getElementById("challenges");
    challenges.innerHTML = "";

    for (let i = 0; i < title.length; i++) {
        let cardDiv = document.createElement("div")
		let titleDiv = document.createElement("div");
		let textDiv = document.createElement("div");
        cardDiv.className = "card";
		titleDiv.className = "title";
		textDiv.className = "text";

		titleDiv.innerHTML = title[i];
        textDiv.innerHTML = text[i];
		cardDiv.appendChild(titleDiv);
		cardDiv.appendChild(textDiv);

		challenges.appendChild(cardDiv);
	}
}

async function getMissions(){
    const res = await fetch ("/updateMissionList",
        {
            method: "GET",
            headers: {
                "Content-Type" : "application/json"
            }
        }
    );
    const data = await res.json();
    var title = data.title;
    var text = data.text;

    var challenges = document.getElementById("missions");
    challenges.innerHTML = "";

    for (let i = 0; i < title.length; i++) {
        let cardDiv = document.createElement("div")
		let titleDiv = document.createElement("div");
		let textDiv = document.createElement("div");
        cardDiv.className = "card";
		titleDiv.className = "title";
		textDiv.className = "text";

		titleDiv.innerHTML = title[i];
        textDiv.innerHTML = text[i];
		cardDiv.appendChild(titleDiv);
		cardDiv.appendChild(textDiv);

		missions.appendChild(cardDiv);
	}
}