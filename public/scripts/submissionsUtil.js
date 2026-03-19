let selectedSubmission = null;

// gets the past submissions
async function getSubmissions() {
    try {
        const res = await fetch("/updateSubmissionsList");
        const data = await res.json();
        var title = data.title;
        var id = data.id;
        var evidence = data.evidence;
        var challenge_title = data.challenge_title;
        var flag = data.flag;


        var submissions = document.getElementById("submissions-container");
        submissions.innerHTML = "";

        const grouped = {};
        // groups submissions by their challenge title
        for (let i = 0; i < id.length; i++) {
            if (!grouped[challenge_title[i]]) {
                grouped[challenge_title[i]] = [];
            }

            grouped[challenge_title[i]].push({
                title: title[i],
                id: id[i],
                evidence: evidence[i],
                challenge_title: challenge_title[i],
                flag : flag[i],
                index: i
            });
        }
        Object.keys(grouped).forEach(groupId => {

            // Group container
            const challengeDiv = document.createElement("div");
            const challengeTitleDiv = document.createElement("div");

            challengeDiv.className = "challenge";
            challengeTitleDiv.className = "challenge_title"

            challengeTitleDiv.textContent = groupId;            
            challengeDiv.dataset.id = groupId;

            challengeDiv.appendChild(challengeTitleDiv);


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

                if (flag != "No automatic flags triggered"){
                    flagDiv.textContent = item.flag; //change to iteration no. flag
                } else{
                    flagDiv.textContent = "";
                }

                if (item.evidence) {
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

                cardDiv.addEventListener('click', () => {// checks if a submission has been clicked on and pop up will show
                    selectedSubmission = {
                        id: item.id,
                        challenge_title: item.challenge_title
                    };
                    document.getElementById('approveDeny-modal').style.display = 'block';
                    document.getElementById('backdrop').style.display = "block";

                });

                challengeDiv.appendChild(cardDiv);// adds each card to the submission div
            });

            submissions.appendChild(challengeDiv);
        });
    } catch (err) {
        console.error("updatePoints error:", err);
        document.getElementById("submissions-container").textContent = "Error loading submissions";
    }
}

getSubmissions();

async function approveDeny(outcome, reason, id, info) {// sends the moderators decision to backend which updates the database
    await fetch("/approveDeny",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ outcome, reason, id, info}
            )
        }

    );
}

const form = document.getElementById('approveDenyForm');
form.addEventListener('submit', async (e) => { //wait till form has been submitted
    e.preventDefault(); // stop page reload
    const reason = document.getElementById("reason-input").value;
    const decision = document.querySelector('input[name="val"]:checked')?.value;
    const info = document.getElementById("identifying-info").checked;
    if(decision === 'Approved' && info){
        document.getElementById("approval-error").textContent = "You must deny submissions with identifying information";
        document.getElementById("approval-error").style.visibility = 'visible'
        return;
    }
    await approveDeny(decision, reason, selectedSubmission.id, info);  //calls function to subbmit information to database
    form.reset();
    document.getElementById('approveDeny-modal').style.display = 'none';

    document.getElementById('backdrop').style.display = "none";
});