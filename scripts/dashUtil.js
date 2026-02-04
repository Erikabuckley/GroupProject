const { json } = require("express");

document.getElementById("logo").onclick = function () {
    location.href = "dashboard.html";};


const auth = localStorage.getItem('auth'); //prevents unauthorised acces to dash
if (auth != '1'){
    window.location.href = "../index.html";
};

out = document.getElementById('signOut') //logs them out
out.addEventListener('click', async (e) => {
    localStorage.removeItem('auth');
    await fetch("http://127.0.0.1:8080/signOut",
        {
            method: "POST",
            headers: {
                "Content-Type" : "application/json"
            },
            body : JSON.stringify({name : localStorage.getItem('name')}) //turn to json
        }
    )
    localStorage.removeItem('name');
});

const form = document.getElementById('form')

form.addEventListener('submit', async (e) => { //wait till form has been submitted
    e.preventDefault(); // stop page reload
    const action = e.submitter.value;
    if (action === 'Confirm') {
        const catagory = document.getElementById("catagory-input").value;
        const challenge = document.getElementById("challenge-input").value;
        const upload = document.getElementById("upload-input").value;
        await fetch("http://127.0.0.1:8080/addAction",
            {
                method: "POST",
                headers: {
                    "Content-Type" : "application/json"
                },
                body : JSON.stringify({catagory, challenge,upload}   
                )
            }
        );
        window.location.href = "dashboard.html";
    }
});
