let selectedCard = null;

async function getSubmissions() {
    const res = await fetch("/updateSubmissionsList",//gets current submission information
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        }
    );
    const data = await res.json();
    var title = data.title;
    var id = data.id;
    var evidence = data.evidence;

    var submissions = document.getElementById("submissions");
    submissions.innerHTML = "";

    for (let i = 0; i < title.length; i++) {// creates a card for each one of them
        let cardDiv = document.createElement("div")
        let titleDiv = document.createElement("div");
        let idDiv = document.createElement("div");
        let evidenceDiv = document.createElement("div");

        cardDiv.className = "card";
        cardDiv.id = "submission" + String(i);
        titleDiv.className = "title";
        idDiv.className = "id";
        evidenceDiv.className = "evidance";

        cardDiv.dataset.index = i;
        cardDiv.dataset.title = title[i];
        cardDiv.dataset.id = id[i];
        cardDiv.dataset.evidence = evidence[i];

        titleDiv.textContent = title[i];
        idDiv.textContent = id[i];
        evidenceDiv.textContent = evidence[i];

        idDiv.style.display = "none";// hides the id to make it annonamous

        cardDiv.appendChild(titleDiv);
        cardDiv.appendChild(idDiv);
        cardDiv.appendChild(evidenceDiv);

        submissions.appendChild(cardDiv);//adds each card to the list of cards

        cardDiv.addEventListener('click', () => { //checks if a card has been clicked
            selectedCard = {
                index: i,
                title: title[i],
                id: id[i],
                evidence: evidence[i]
            };
            document.getElementById('approveDeny-modal').style.display = 'block';//display approval screen
        });
    }
};

getSubmissions();

async function approveDeny(name, outcome, reason, id) {
    await fetch("/approveDeny",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, outcome, reason, id }
            )
        }

    );
}

const form = document.getElementById('approveDenyForm');
form.addEventListener('submit', async (e) => { //wait till form has been submitted
    e.preventDefault(); // stop page reload
    const reason = document.getElementById("reason-input").value;
    const decision = document.querySelector('input[name="val"]:checked')?.value;
    await approveDeny(selectedCard.title, decision, reason, selectedCard.id);  //calls function to subbmit information to database
    form.reset();
    document.getElementById('approveDeny-modal').style.display = 'none';
});