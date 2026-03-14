getChallenges();

const newChallenge = document.getElementById("challengeForm");
newChallenge.addEventListener('submit', async (e) => {
    e.preventDefault(); // stop page reload
    const name = document.getElementById("name-input").value;
    const scope = document.getElementById("scope-input").value;
    const rules = document.getElementById("rules-input").value;
    const points = document.getElementById("points-input").value;
    const start = document.getElementById("start-input").value;
    const end = document.getElementById("end-input").value;
    const selectedValue = document.querySelector('input[name="val"]:checked').value;

    const res = await fetch("/addChallenge", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, scope, rules, points, start, end, selectedValue }
        )
    });
    const data = await res.json();
    getChallenges();

    // if there is an error then the error message will be displayed
    if (res.status === 400) {
        document.getElementById('error').textContent = data.error;
        document.getElementById('error').style.visibility = 'visible';
    }
    newChallenge.reset();
    document.getElementById("challenge-modal").style.display = "none";
});

const editChallenge = document.getElementById("editForm");
editChallenge.addEventListener('submit', async (e) => {
    e.preventDefault(); // stop page reload
    const id = document.getElementById("editForm").dataset.id;
    const name = document.getElementById("edit-name-input").value;
    const scope = document.getElementById("edit-scope-input").value;
    const rules = document.getElementById("edit-rules-input").value;
    const points = document.getElementById("edit-points-input").value;
    const start = document.getElementById("edit-start-input").value;
    const end = document.getElementById("edit-end-input").value;
    const selectedValue = document.querySelector('input[name="edit-val"]:checked').value;

    const res = await fetch("/editChallenge", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ id, name, scope, rules, points, start, end, selectedValue } //turn to json
        )
    });
    const data = await res.json();

    // if there is an error then the error message will be displayed
    if (res.status === 400) {
        document.getElementById('error').textContent = data.error;
        document.getElementById('error').style.visibility = 'visible';
    }
    document.getElementById("update-modal").style.display = "none";
});

// populates the challenge list with the current challenges
async function getChallenges() {
    try {
        const res = await fetch("/updateModChallengeList");
        const data = await res.json();
        var id = data.id;
        var name = data.name;
        var scope = data.scope;
        var rules = data.rules;
        var points = data.points;
        var start = data.start;
        var end = data.end;
        var evidence = data.evidence;


        var challenges = document.getElementById("challenge-container");
        challenges.innerHTML = "";

        for (let i = 0; i < id.length; i++) {
            const challengeDiv = document.createElement("div");
            const titleDiv = document.createElement("div");
            const rulesDiv = document.createElement("div");
            const pointsDiv = document.createElement("div");
            const dateDiv = document.createElement("div");
            const deleteImg = document.createElement("img");

            const textDiv = document.createElement("div");

            challengeDiv.className = "challenge";
            titleDiv.className = "title";
            rulesDiv.className = "rules";
            pointsDiv.className = "points";
            dateDiv.className = "date";
            deleteImg.className = "delete"

            textDiv.className = "challenge-text";

            challengeDiv.dataset.id = id[i];
            titleDiv.textContent = name[i];
            rulesDiv.textContent = rules[i];
            pointsDiv.textContent = points[i];
            dateDiv.textContent = start[i] + "-" + end[i];
            deleteImg.src = "../images/bin.png";

            textDiv.appendChild(titleDiv);
            textDiv.appendChild(rulesDiv);
            textDiv.appendChild(pointsDiv);
            textDiv.appendChild(dateDiv);

            challengeDiv.appendChild(textDiv);
            challengeDiv.appendChild(deleteImg);

            // checks if a challenge is being deleted
            deleteImg.addEventListener('click', async (e) => {
                e.stopPropagation();
                document.getElementById("delete").showModal();
                const closebutton = document.getElementById("close");
                closebutton.addEventListener('click', () =>
                    document.getElementById("delete").close()
                );
                const confirmbutton = document.getElementById("confirm");
                confirmbutton.addEventListener('click', async () => {
                    const text = document.getElementById("password").value;
                    if (text === 'delete challenge'){
                        document.getElementById("delete").close()
                        await fetch("/deleteChallenge", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({ id: challengeDiv.dataset.id } //turn to json
                            )
                        });
                        getChallenges();
                    }
                })
            });
            // checks if a challenge is being modified
            challengeDiv.addEventListener('click', () => {
                document.getElementById("edit-name-input").value = name[i];
                document.getElementById("edit-scope-input").value = scope[i];
                document.getElementById("edit-rules-input").value = rules[i];
                document.getElementById("edit-points-input").value = points[i];
                document.getElementById("edit-start-input").value = start[i];
                document.getElementById("edit-end-input").value = end[i];

                const evidenceRadios = document.querySelectorAll('input[name="edit-val"]');

                evidenceRadios.forEach(radio => {
                    radio.checked = radio.value === evidence[i];
                });

                document.getElementById("editForm").dataset.id = id[i];

                document.getElementById('update-modal').style.display = 'block';
                document.getElementById('backdrop').style.display = "block";
            });
            // adds each card to the submission div
            challenges.appendChild(challengeDiv);
        };
    } catch (err) {
        console.error("updatePoints error:", err);
        document.getElementById("challenge-container").textContent = "Error loading submissions";
    }
}