getSubmissions();

async function getSubmissions(){
    const res = await fetch ("/updateSubmissionsList",
        {
            method: "GET",
            headers: {
                "Content-Type" : "application/json"
            }
        }
    );
    const data = await res.json();
    var title = data.title;
    var name = data.name;
    var evidence = data.evidence;

    var submissions = document.getElementById("submissions");
    submissions.innerHTML = "";

    for (let i = 0; i < title.length; i++) {
        let cardDiv = document.createElement("div")
		let titleDiv = document.createElement("div");
		let nameDiv = document.createElement("div");
        let evidenceDiv = document.createElement("div");
        let buttonDiv = document.createElement("div");

        cardDiv.className = "card";
		titleDiv.className = "title";
		nameDiv.className = "text";
		evidenceDiv.className = "evidance";
		buttonDiv.className = "evidance";

		titleDiv.innerHTML = title[i];
        nameDiv.innerHTML = name[i];
        evidenceDiv.innerHTML = evidence[i];
        buttonDiv.innerHTML = '<input type="button" value="Aprove" name="aprove" id="aprove" class="in-button"> <input type="button" value="Deny" name="deny" id="deny" class="in-button"> </div>'
		cardDiv.appendChild(titleDiv);
		cardDiv.appendChild(nameDiv);
		cardDiv.appendChild(evidenceDiv);
		cardDiv.appendChild(buttonDiv);

		submissions.appendChild(cardDiv);
	}
}