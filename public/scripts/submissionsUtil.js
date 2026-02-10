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

		titleDiv.innerHTML = title[i];
        nameDiv.innerHTML = email[i];
        evidenceDiv.innerHTML = evidence[i];
		cardDiv.appendChild(titleDiv);
		cardDiv.appendChild(nameDiv);
		cardDiv.appendChild(evidenceDiv);

		submissions.appendChild(cardDiv);
	}
}

async function approveDeny(email, date, name, outcome, reason){
    document.getElementById("approveDeny-modal").style.display.block;

    await fetch("/approveDeny",
        {
            method: "POST",
            headers: {
                "Content-Type" : "application/json"
            },
            body : JSON.stringify({email, date,name, outcome, reason}   
            )
        }
    
    );
    document.getElementById("approveDeny-modal").style.display.none;
}

var elements = document.getElementsByClassName("card");

for (var i = 0; i < elements.length; i++) {
    elements[i].addEventListener('click', 
        async (e) => { //wait till form has been submitted
        e.preventDefault(); // stop page reload
        document.getElementById('approveDeny-modal').style.display.block;
        const form = document.getElementById('approveDenyForm');
        form.addEventListener('submit', async (e) => { //wait till form has been submitted
            e.preventDefault(); // stop page reload
            const approve = document.getElementById("approve").value;
            const deny = document.getElementById("deny").value;
            const reason = document.getElementById("reason-input").value;
            if (approve){
                await approveDeny(reason, approve);         
            }else{
                await approveDeny(reason, deny);         
            }
        });
    });
};