// send requests to the backend to populate the dropdowns for the forms and the total
updateChallengeList();
updateMissionList();
updateGroupList();
updateUserGroupsList();
updateIndi();
updatePoints();
updateLog();

// when the event listener is trigged the submission information is sent
const form = document.getElementById('evidanceForm')
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // stop page reload
        const mission = document.getElementById("mission-input").value;
        const quantity = document.getElementById("quantity-input").value;
        const challenge = document.getElementById("challenge-input").value;
        const group = document.getElementById("group-challenge-input").value;

        const uploadInput = document.getElementById("upload-input");
        const file = uploadInput.files[0];
        // checks that the challenge submission is for a group
        if (challenge != 'No' && group === '') {
            error = document.getElementById("error")
            error.textContent = "You must select a group if the action is for a challenge"
            error.style.visibility = "visible"
        } else {
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

            // if there is an error then the error message will be displayed in the form
            if (res.status === 400) {
                document.getElementById('error').textContent = data.error;
                document.getElementById('error').style.visibility = 'visible';
            } else if (res.status === 403) {
                document.getElementById('error').textContent = 'This challenge is is a group challenge, please select a group';
                document.getElementById('error').style.visibility = 'visible';
            } else if(res.status === 202){
                document.getElementById("no-evidence").showModal();
                const button = document.getElementById("close-no-evidence");
                button.addEventListener('click', () =>{
                    document.getElementById("no-evidence").close()
                });
                document.getElementById("upload-modal").style.display = "none";
                // shows the carbon saved by the action to the user
                showData(String(data.carbon), String(data.source));

            }else{
                document.getElementById("upload-modal").style.display = "none";
                // shows the carbon saved by the action to the user
                showData(String(data.carbon), String(data.source));
            }            
        }
    });
};

// allows the user to join a group
const joinForm = document.getElementById('joinForm')
if (joinForm) {
    joinForm.addEventListener('submit', async (e) => {
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
            // if there is an error then the error message will be displayed
            const data = await res.json();
            document.getElementById('error-message').textContent = data.error;
            document.getElementById('error-message').style.visibility = 'visible';
        } else {
            document.getElementById("join-modal").style.display = "none";
            document.getElementById('backdrop').style.display = "none";
            window.location.href = "dashboard.html"
        }
    });
};

//populates the mission drop down 
async function updateMissionList() {
    const res = await fetch("/updateMissionList");
    const data = await res.json();
    var vals = data.title;
    var selectElement = document.getElementById('mission-input');
    for (let v of vals) {
        selectElement.appendChild(new Option(v, v));// adds each one to the drop down box

    };
}

//populates the challenge drop down
async function updateChallengeList() {
    const res = await fetch("/updateChallengeList");
    const data = await res.json();
    var vals = data.title;
    var selectElement = document.getElementById('challenge-input');
    for (let v of vals) {
        selectElement.appendChild(new Option(v, v));// adds them to the drop down

    };
};

// populates the group drop down
async function updateGroupList() {
    const res = await fetch("/updateGroupList");
    const data = await res.json();
    var vals = data.groups;
    var selectElement = document.getElementById('group-input');
    for (let v of vals) {
        selectElement.appendChild(new Option(v, v));// adds each one to the drop down box

    };
};

// populates the drop down for for the user to join a group
async function updateUserGroupsList() {
    const res = await fetch("/updateUserGroupsList");
    const data = await res.json();
    var vals = data.groups;
    var selectElement = document.getElementById('group-challenge-input');
    for (let v of vals) {
        selectElement.appendChild(new Option(v, v));// adds them to the drop down

    };
}

// shows the carbon saved from that action
async function showData(num, source) {
    document.getElementById("data-modal").style.display = "block";
    document.getElementById("amount").innerText = (num + "g");
    document.getElementById("source").innerText = (source);
    document.getElementById("source").setAttribute("href", source);
}

// shows the total amount of carbon from that action
async function updateIndi() {
    const res = await fetch("/updateTotalIndi");
    const data = await res.json();
    document.getElementById("indi-carbon").textContent = data.total + 'g';
}

// gets the total number of points the individual has gained
async function updatePoints() {
    const res = await fetch("/updatePointsIndi");
    const data = await res.json();
    document.getElementById("indi-points").textContent = data.total + ' points';
}

//gets past challenge submissions for the user
async function updateLog() {
    const res = await fetch("/updateLog",
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

    // group submissions by challenge title
    for (let i = 0; i < id.length; i++) {
        const key = challenge_title[i]; // use challenge title as key
        if (!grouped[key]) {
            grouped[key] = [];
        }

        grouped[key].push({
            title: title[i],
            id: id[i],
            evidence: evidence[i],
            challenge_title: challenge_title[i],
            feedback: feedback[i],
            index: i
        });
    }

    // displays the challenges on the screen by colour
    Object.keys(grouped).forEach(challengeName => {
        const submissionDiv = document.createElement("div");
        const challengeTitleDiv = document.createElement("div");
        const feedbackDiv = document.createElement("div");

        submissionDiv.className = "submission";
        challengeTitleDiv.className = "challenge_title";
        feedbackDiv.className = "feedback";

        challengeTitleDiv.textContent = challengeName; // display the challenge title
        submissionDiv.dataset.challenge = challengeName;
        feedbackDiv.textContent = grouped[challengeName][0].feedback; // first feedback as example

        submissionDiv.appendChild(challengeTitleDiv);
        submissionDiv.appendChild(feedbackDiv);

        // add all individual submissions as cards
        grouped[challengeName].forEach(item => {
            const cardDiv = document.createElement("div");
            const titleDiv = document.createElement("div");
            const evidenceDiv = document.createElement("div");

            cardDiv.className = "card";
            titleDiv.className = "title";
            evidenceDiv.className = "evidence";

            titleDiv.textContent = item.title;

            if (item.evidence) {
                const img = document.createElement("img");
                img.src = item.evidence;
                img.alt = "Submission evidence";
                img.className = "evidence-photo";
                evidenceDiv.appendChild(img);
            } else {
                evidenceDiv.textContent = "No evidence uploaded";
            }

            const itemStatus = status[item.index]; // get this submission's status
            if (itemStatus === 'Denied') {
                cardDiv.style.backgroundColor = "#D9544D";
            } else if (itemStatus === 'Pending') {
                cardDiv.style.backgroundColor = "#686b6c";
            } else { // approved/accepted
                cardDiv.style.backgroundColor = "#93ef90";
            }

            cardDiv.appendChild(titleDiv);
            cardDiv.appendChild(evidenceDiv);
            submissionDiv.appendChild(cardDiv);
        });
        submissions.appendChild(submissionDiv);
    });
}