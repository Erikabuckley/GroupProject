updateChallengeList();
updateMissionList();
updateGroupList();
updateIndi();


const form = document.getElementById('evidanceForm')
if (form) {
    form.addEventListener('submit', async (e) => { //wait till form has been submitted
        e.preventDefault(); // stop page reload
        const mission = document.getElementById("mission-input").value;
        const quantity = document.getElementById("quantity-input").value;
        const challenge = document.getElementById("challenge-input").value;
        const upload = document.getElementById("upload-input").value;
        const email = localStorage.getItem('name');
        const res = await fetch("/addAction",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ mission, challenge, upload, email, quantity }
                )
            }
        );
        const data = await res.json();
        document.getElementById("upload-modal").style.display = "none";
        showData(String(data.carbon), 'link here'); //String(data.source)
    });
};

const joinForm = document.getElementById('joinForm')
if (joinForm) {
    joinForm.addEventListener('submit', async (e) => { //wait till form has been submitted
        e.preventDefault(); // stop page reload
        const group = document.getElementById("group-input").value;
        const email = localStorage.getItem('name');
        await fetch("/addGroup",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ group, email }
                )
            }
        );
        window.location.href = "dashboard.html";;
    });
};

async function updateMissionList() {
    const res = await fetch("/updateMissionList",
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": localStorage.getItem('name')
            }
        }
    );
    const data = await res.json();
    var vals = data.title;
    var selectElement = document.getElementById('mission-input');
    for (let v of vals) {
        selectElement.appendChild(new Option(v, v));

    };
}
async function updateChallengeList() {
    const res = await fetch("/updateChallengeList",
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": localStorage.getItem('name')
            }
        }
    );
    const data = await res.json();
    var vals = data.title;
    var selectElement = document.getElementById('challenge-input');
    for (let v of vals) {
        selectElement.appendChild(new Option(v, v));

    };
};

async function updateGroupList() {
    const res = await fetch("/updateGroupList",
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": localStorage.getItem('name')
            }
        }
    );
    const data = await res.json();
    var vals = data.groups;
    var selectElement = document.getElementById('group-input');
    for (let v of vals) {
        selectElement.appendChild(new Option(v, v));

    };
};

async function showData(num, source) {
    document.getElementById("data-modal").style.display = "block";
    document.getElementById("ammount").innerText = (num + "gt");
    document.getElementById("source").innerText = (source);
}

async function updateIndi() {
    const res = await fetch("/updateTotalIndi",
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": localStorage.getItem('name')
            }
        }
    );
    const data = await res.json();
    document.getElementById("indi-carbon").textContent = data.total;
}