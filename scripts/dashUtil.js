updateChallengeList();
updateMissionList();
    
const auth = localStorage.getItem('auth'); //prevents unauthorised acces to dash
if (auth != '1'){
    window.location.href = "../index.html";
};

const type = localStorage.getItem('type'); //prevents unauthorised acces to dash
if (type === 'moderator'){
    document.getElementsByClassName('participant')[0].style.display = "none";
    document.getElementsByClassName('moderator')[0].style.display = "flex";
};

const form = document.getElementById('evidanceForm')
if (form){
    form.addEventListener('submit', async (e) => { //wait till form has been submitted
        e.preventDefault(); // stop page reload
        const mission = document.getElementById("mission-input").value;
        const challenge = document.getElementById("challenge-input").value;
        const upload = document.getElementById("upload-input").value;
        await fetch("http://127.0.0.1:8080/addAction",
            {
                method: "POST",
                headers: {
                    "Content-Type" : "application/json"
                },
                body : JSON.stringify({mission, challenge, upload}   
                )
            }            
        );
        window.location.href = "dashboard.html";
    });
};

const joinForm = document.getElementById('joinForm')
if (joinForm){
    joinForm.addEventListener('submit', async (e) => { //wait till form has been submitted
        e.preventDefault(); // stop page reload
        const group = document.getElementById("group-input").value;
        await fetch("http://127.0.0.1:8080/addGroup",
            {
                method: "POST",
                headers: {
                    "Content-Type" : "application/json"
                },
                body : JSON.stringify({group}   
                )
            }            
        );
        window.location.href = "dashboard.html";;
    });
};


async function updateMissionList(){
    const res = await fetch ("http://127.0.0.1:8080/updateMissionList",
        {
            method: "GET",
            headers: {
                "Content-Type" : "application/json"
            }
        }
    );
    const data = await res.json();
    var vals = data.title;
    var selectElement = document.getElementById('mission-input');
    selectElement.innerHTML = ""; // remove existing options
    for (let v of vals) {
        selectElement.appendChild(new Option(v,v));
        
    };
}
async function updateChallengeList(){
    const res = await fetch ("http://127.0.0.1:8080/updateChallengeList",
        {
            method: "GET",
            headers: {
                "Content-Type" : "application/json"
            }
        }
    );
    const data = await res.json();
    var vals = data.title;
    var selectElement = document.getElementById('challenge-input');
    selectElement.innerHTML = ""; // remove existing options
    for (let v of vals) {
        selectElement.appendChild(new Option(v,v));
        
    };
};

async function updateGroupList(){
    const res = await fetch ("http://127.0.0.1:8080/updateGroupList",
        {
            method: "GET",
            headers: {
                "Content-Type" : "application/json"
            }
        }
    );
    const data = await res.json();
    var vals = data.groups;
    var selectElement = document.getElementById('group-input');
    selectElement.innerHTML = ""; // remove existing options
    for (let v of vals) {
        selectElement.appendChild(new Option(v,v));
        
    };
};

