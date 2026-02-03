document.getElementById("logo").onclick = function () {
    location.href = "dashboard.html";};

const form = document.getElementById('form')

form.addEventListener('submit', async (e) => { //wait till form has been submitted
    e.preventDefault(); // stop page reload
    const action = e.submitter.value;
    if (action === 'Confirm') {
        const catagory = document.getElementById("catagory-input").value;
        const challenge = document.getElementById("challenge-input").value;
        const upload = document.getElementById("upload-input").value;
        await fetch("http://127.0.0.1:8080/dashboard",
            {
                method: "POST",
                headers: {
                    "Content-Type" : "application/json"
                },
                body : JSON.stringify({catagory, challenge,upload}   
                )
            }
        );
        window.location.href = "https://erikabuckley.github.io/GroupProject/dashboard.html";
    }
});

