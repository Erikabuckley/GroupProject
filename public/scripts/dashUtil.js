updateChallengeList();
updateMissionList();
updateGroupList();
updateUserGroupsList();
updateIndi();
updatePoints();

const form = document.getElementById('evidanceForm')
if (form) {
    form.addEventListener('submit', async (e) => { //wait till form has been submitted
        e.preventDefault(); // stop page reload
        const mission = document.getElementById("mission-input").value;
        const quantity = document.getElementById("quantity-input").value;
        const challenge = document.getElementById("challenge-input").value;
        const group = document.getElementById("group-challenge-input").value;
        const email = localStorage.getItem('name');

        const uploadInput = document.getElementById("upload-input");
        const file = uploadInput.files[0];

        const formData = new FormData();
        formData.append("mission", mission);
        formData.append("challenge", challenge);
        formData.append("quantity", quantity);
        formData.append("group", group);
        formData.append("email", email);
        if (file) formData.append("upload", file);

        const res = await fetch("/addAction", {
            method: "POST",
            body: formData, // send as multipart/form-data
        });
        const data = await res.json();
        document.getElementById("upload-modal").style.display = "none";
        showData(String(data.carbon), String(data.source));
    });
};

const joinForm = document.getElementById('joinForm')
if (joinForm) {
    joinForm.addEventListener('submit', async (e) => { //wait till form has been submitted
        e.preventDefault(); // stop page reload
        const group = document.getElementById("group-input").value;
        const email = localStorage.getItem('name');
        const res = await fetch("/addGroup",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ group, email }
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