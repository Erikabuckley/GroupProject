updateChallengeList();
updateMissionList();
updateGroupList();
updateUserGroupsList();
updateIndi();
updatePoints();
updateLog();

const form = document.getElementById('evidanceForm')
if (form) {
    form.addEventListener('submit', async (e) => { //wait till form has been submitted
        e.preventDefault(); // stop page reload
        const mission = document.getElementById("mission-input").value;
        const quantity = document.getElementById("quantity-input").value;
        const challenge = document.getElementById("challenge-input").value;
        const group = document.getElementById("group-challenge-input").value;

        const uploadInput = document.getElementById("upload-input");
        const file = uploadInput.files[0];
        if (challenge != 'No' && group === 'None'){
            error = document.getElementById("error")
            error.textContent = "You must select a group if the action is for a challenge"
            error.style.visibility = "visible"
        } else{
            const formData = new FormData();
            formData.append("mission", mission);
            formData.append("challenge", challenge);
            formData.append("quantity", quantity);
            formData.append("group", group);
            if (file) formData.append("upload", file);

            const res = await fetch("/addAction", {
                method: "POST",
                body: formData, // send as multipart/form-data
            });
            const data = await res.json();

            if (res.status === 400) {
                document.getElementById('error').textContent = data.error;
                document.getElementById('error').style.visibility = 'visible';  // if there is an error then the erro message will be displayed
            }
            document.getElementById("upload-modal").style.display = "none";
            showData(String(data.carbon), String(data.source));
        }
    });
};

const joinForm = document.getElementById('joinForm')
if (joinForm) {
    joinForm.addEventListener('submit', async (e) => { //wait till form has been submitted
        e.preventDefault(); // stop page reload
        const group = document.getElementById("group-input").value;
        const res = await fetch("/addGroup",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ group }
                )
            }
        );
        if (res.status === 409) {
            const data = await res.json();
            document.getElementById('error-message').textContent = data.error;
            document.getElementById('error-message').style.visibility = 'visible';  // if there is an error then the erro message will be displayed
        }
        else {
            window.location.href = "dashboard.html";//redirect
        }
    });
};

async function updateMissionList() {
    const res = await fetch("/updateMissionList",// gets the current missions
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        }
    );
    const data = await res.json();
    var vals = data.title;
    var selectElement = document.getElementById('mission-input');
    for (let v of vals) {
        selectElement.appendChild(new Option(v, v));// adds each one to the drop down box

    };
}
async function updateChallengeList() {
    const res = await fetch("/updateChallengeList",// gets the current challenges and their dates
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        }
    );
    const data = await res.json();
    var vals = data.title;
    var selectElement = document.getElementById('challenge-input');
    for (let v of vals) {
        selectElement.appendChild(new Option(v, v));// adds them to the drop down

    };
};

async function updateGroupList() {
    const res = await fetch("/updateGroupList",// gets the groups that are available to join
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        }
    );
    const data = await res.json();
    var vals = data.groups;
    var selectElement = document.getElementById('group-input');
    for (let v of vals) {
        selectElement.appendChild(new Option(v, v));// adds each one to the drop down box

    };
};

async function updateUserGroupsList() {
    const res = await fetch("/updateUserGroupsList",// gets the groups that the user is currently in
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        }
    );
    const data = await res.json();
    var vals = data.groups;
    var selectElement = document.getElementById('group-challenge-input');
    for (let v of vals) {
        selectElement.appendChild(new Option(v, v));// adds them to the drop down

    };
}

async function showData(num, source) {// shows the total carbon saved by that individual
    document.getElementById("data-modal").style.display = "block";
    document.getElementById("ammount").innerText = (num + "g");
    document.getElementById("source").innerText = (source);
    document.getElementById("source").setAttribute ("href", source);
}

async function updateIndi() {
    const res = await fetch("/updateTotalIndi",
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        }
    );
    const data = await res.json();
    document.getElementById("indi-carbon").textContent = data.total + 'g';
}

async function updatePoints() {// gets the total number of points the individual has gained
    const res = await fetch("/updatePointsIndi",
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        }
    );
    const data = await res.json();
    document.getElementById("indi-points").textContent = data.total + ' points';
}

async function updateLog(){
    const res = await fetch("/updateLog",//gets current user log
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
    var challenge_title = data.challenge_title;
    var status = data.status;
    var feedback = data.reason;


    var submissions = document.getElementById("log");
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
            feedback: feedback[i],
            index: i
        });
    }
    Object.keys(grouped).forEach(groupId => {

        // Group container
        const submissionDiv = document.createElement("div");
        const challengeTitleDiv = document.createElement("div");
        const feedbackDiv = document.createElement("div");

        submissionDiv.className = "submission";
        challengeTitleDiv.className = "challenge_title"
        feedbackDiv.className = "feedback";

        challengeTitleDiv.textContent = grouped[groupId][0].challenge_title;
        submissionDiv.dataset.id = groupId;
        feedbackDiv.textContent = feedback; // CHANGE ONCE BACKEND DONE

        submissionDiv.appendChild(challengeTitleDiv);
        submissionDiv.appendChild(feedbackDiv);

        if (!status){ //CHANGE ONCE BACKEND DONE
            submissionDiv.style.backgroundColor = "red";
        }


        grouped[groupId].forEach(item => {

            const cardDiv = document.createElement("div");
            const titleDiv = document.createElement("div");
            const evidenceDiv = document.createElement("div");

            cardDiv.className = "card";
            titleDiv.className = "title";
            evidenceDiv.className = "evidence";

            titleDiv.textContent = item.title;

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

            submissionDiv.appendChild(cardDiv);// adds each card to the submission div
        });

        submissionDiv.addEventListener('click', () => {// checks if a submission has been clicked on and pop up will show
            selectedSubmission = {
                id: groupId,
                challenge_title: grouped[groupId][0].challenge_title,
                logs: grouped[groupId]
            };
            document.getElementById('statusDeny-modal').style.display = 'block';
            document.getElementById('backdrop').style.display = "block";

        });

        submissions.appendChild(submissionDiv);
    });
}