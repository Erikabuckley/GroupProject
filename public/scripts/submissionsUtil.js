let selectedSubmission = null;

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
    var id = data.id;
    var evidence = data.evidence;
    var challenge_title = data.challenge_title;
    var flag = data.flag;
    var title = data.title; // ERIKA LOOK AT THIS!!


    var submissions = document.getElementById("submissions-container");
    submissions.innerHTML = "";

    const grouped = {};
    // groups submissions by their submission id 
    for (let i = 0; i < id.length; i++) {
        if (!grouped[id[i]]) {
            grouped[id[i]] = [];
        }

        grouped[id[i]].push({
            title: title[i],
            id: id[i],
            evidence: evidence[i],
            challenge_title: challenge_title[i],
            index: i
        });
    }
    Object.keys(grouped).forEach(groupId => {

        // Group container
        const submissionDiv = document.createElement("div");
        const challengeTitleDiv = document.createElement("div");

        submissionDiv.className = "submission";
        challengeTitleDiv.className = "challenge_title"

        challengeTitleDiv.textContent = grouped[groupId][0].challenge_title;
        submissionDiv.dataset.id = groupId;

        submissionDiv.appendChild(challengeTitleDiv);


        grouped[groupId].forEach(item => {

            const cardDiv = document.createElement("div");
            const titleDiv = document.createElement("div");
            const evidenceDiv = document.createElement("div");
            const flagDiv = document.createElement("div");

            cardDiv.className = "card";
            titleDiv.className = "title";
            evidenceDiv.className = "evidence";
            flagDiv.className = "flag";


            titleDiv.textContent = item.title;

            if (flag != null){
                flagDiv.textContent = flag; //change to itteration no. flag
            } else{
                flagDiv.textContent = "";
            }

            if (item.evidence && item.evidence !== "no file") {
                const img = document.createElement("img");
                img.src = item.evidence; // this should be the full URL from backend
                img.alt = "Submission evidence";
                img.className = "evidence-photo";
                evidenceDiv.appendChild(img);
            } else {
                evidenceDiv.textContent = "No evidence uploaded"; // fallback text
            }

            cardDiv.appendChild(titleDiv);
            cardDiv.appendChild(evidenceDiv);
            cardDiv.appendChild(flagDiv);


            submissionDiv.appendChild(cardDiv);// adds each card to the submission div
        });

        submissionDiv.addEventListener('click', () => {// checks if a submission has been clicked on and pop up will show
            selectedSubmission = {
                id: groupId,
                challenge_title: grouped[groupId][0].challenge_title,
                logs: grouped[groupId]
            };
            document.getElementById('approveDeny-modal').style.display = 'block';
            document.getElementById('backdrop').style.display = "block";

        });

        submissions.appendChild(submissionDiv);
    });
}

getSubmissions();

async function approveDeny(outcome, reason, id,challenge_name) {// sends the moderators decision to backend which updates the database
    await fetch("/approveDeny",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ outcome, reason, id, challenge_name}
            )
        }

    );
}

const form = document.getElementById('approveDenyForm');
form.addEventListener('submit', async (e) => { //wait till form has been submitted
    e.preventDefault(); // stop page reload
    const reason = document.getElementById("reason-input").value;
    const decision = document.querySelector('input[name="val"]:checked')?.value;
    await approveDeny(decision, reason, selectedSubmission.id, selectedSubmission.challenge_title);  //calls function to subbmit information to database
    form.reset();
    document.getElementById('approveDeny-modal').style.display = 'none';

    document.getElementById('backdrop').style.display = "none";
});