updateChallengeList();
updateMissionList();
updateGroupList();

const form = document.getElementById('evidanceForm')
if (form){
    form.addEventListener('submit', async (e) => { //wait till form has been submitted
        e.preventDefault(); // stop page reload
        const mission = document.getElementById("mission-input").value;
        const challenge = document.getElementById("challenge-input").value;
        const upload = document.getElementById("upload-input").value;
        await fetch("/addAction",
            {
                method: "POST",
                headers: {
                    "Content-Type" : "application/json"
                },
                body : JSON.stringify({mission, challenge, upload}   
                )
            }            
        );

        const res = await fetch("/getCarbon",
            {
                method: "GET",
                headers: {
                    "Content-Type" : "application/json"
                }
            }            
        );
        document.getElementById("upload-modal").style.display = "none";
        const data = await res.json();
        showData(String(data.val));
    });
};

const joinForm = document.getElementById('joinForm')
if (joinForm){
    joinForm.addEventListener('submit', async (e) => { //wait till form has been submitted
        e.preventDefault(); // stop page reload
        const group = document.getElementById("group-input").value;
        await fetch("/addGroup",
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
    const res = await fetch ("/updateMissionList",
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
    for (let v of vals) {
        selectElement.appendChild(new Option(v,v));
        
    };
}
async function updateChallengeList(){
    const res = await fetch ("/updateChallengeList",
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
    for (let v of vals) {
        selectElement.appendChild(new Option(v,v));
        
    };
};

async function updateGroupList(){
    const res = await fetch ("/updateGroupList",
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
    for (let v of vals) {
        selectElement.appendChild(new Option(v,v));
        
    };
};

async function showData(num){
    document.getElementById("data-modal").style.display = "block";
    document.getElementById("ammount").innerText = (num + "gt");
}