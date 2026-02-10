let selectedCard = null;

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
    var email = data.name;
    var evidence = data.evidence;

    var submissions = document.getElementById("submissions");
    submissions.innerHTML = "";

    for (let i = 0; i < title.length; i++) {
        let cardDiv = document.createElement("div")
		let titleDiv = document.createElement("div");
		let nameDiv = document.createElement("div");
        let evidenceDiv = document.createElement("div");

        cardDiv.className = "card";
        cardDiv.id = "submission" + String(i);
		titleDiv.className = "title";
		nameDiv.className = "text";
		evidenceDiv.className = "evidance";

        cardDiv.dataset.index = i;
        cardDiv.dataset.title = title[i];
        cardDiv.dataset.email = email[i];
        cardDiv.dataset.evidence = evidence[i];

		titleDiv.textContent = title[i];
        nameDiv.textContent = email[i];
        evidenceDiv.textContent = evidence[i];

		cardDiv.appendChild(titleDiv);
		cardDiv.appendChild(nameDiv);
		cardDiv.appendChild(evidenceDiv);

		submissions.appendChild(cardDiv);

        cardDiv.addEventListener('click', () => { //wait till form has been submitted
            selectedCard = {
            index: i,
            title: title[i],
            email: email[i],
            evidence: evidence[i]
            };                   
            document.getElementById('approveDeny-modal').style.display = 'block';
        });
    }
};

getSubmissions();

async function approveDeny(name, outcome, reason){
    await fetch("/approveDeny",
        {
            method: "POST",
            headers: {
                "Content-Type" : "application/json"
            },
            body : JSON.stringify({name, outcome, reason}   
            )
        }
    
    );
}

const form = document.getElementById('approveDenyForm');
form.addEventListener('submit', async (e) => { //wait till form has been submitted
    e.preventDefault(); // stop page reload
    const reason = document.getElementById("reason-input").value;
    const decision = document.querySelector('input[name="val"]:checked')?.value;
    await approveDeny(selectedCard.title, decision, reason);  
    form.reset();
    document.getElementById('approveDeny-modal').style.display = 'none';
});