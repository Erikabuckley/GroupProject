const newChallenge = document.getElementById("challengeForm");
newChallenge.addEventListener('submit', async (e) => { //wait till form has been submitted
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
            "Content-Type": "application/json" //tells server how data is formatted
        },
        body: JSON.stringify({ name, scope, rules, points, start, end, selectedValue } //turn to json
        )
    });
    const data = await res.json();

    if (res.status === 400) {
        document.getElementById('error').textContent = data.error;
        document.getElementById('error').style.visibility = 'visible';  // if there is an error then the error message will be displayed
    }
    document.getElementById("challenge-modal").style.display = "none";
    showData(String(data.carbon), String(data.source));
});