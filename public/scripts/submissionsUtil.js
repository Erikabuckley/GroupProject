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

    var submissions = document.getElementById("submissions-container");
    submissions.innerHTML = "";

    const grouped = {};

    for (let i = 0; i < id.length; i++) {
        if (!grouped[id[i]]) {
            grouped[id[i]] = [];
        }

        grouped[id[i]].push({
            title: title[i],
            id: id[i],
            evidence: evidence[i],
            index: i
        });
    }
       Object.keys(grouped).forEach(groupId => {

        // Group container
        const submissionDiv = document.createElement("div");
        submissionDiv.className = "submission";
        submissionDiv.dataset.id = groupId;

        grouped[groupId].forEach(item => {

            const cardDiv = document.createElement("div");
            const titleDiv = document.createElement("div");
            const evidenceDiv = document.createElement("div");

            cardDiv.className = "card";
            titleDiv.className = "title";
            evidenceDiv.className = "evidence";

            titleDiv.textContent = item.title;
            evidenceDiv.textContent = item.evidence;

            cardDiv.appendChild(titleDiv);
            cardDiv.appendChild(evidenceDiv);

            submissionDiv.appendChild(cardDiv);
        });
         
        submissionDiv.addEventListener('click', () => {
            selectedCard = grouped[groupId];
            document.getElementById('approveDeny-modal').style.display = 'block';
        });

        submissions.appendChild(submissionDiv);
    });
}

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