document.getElementById("logo").onclick = function () {
    location.href = "dashboard.html";
};

const button = document.getElementById('upgrade-status');
if (button){
    button.addEventListener('click', async (e) => {
        e.preventDefault();
        const res = await fetch("http://127.0.0.1:8080/upgrade",
            {
                method: "POST",
                headers: {
                    "Content-Type" : "application/json"
                },
            }
        );
        if(res.status === 401) {
            document.getElementById('error-message').style.visibility = 'visible';   
        }
        else{
            localStorage.setItem('auth','1');
            location.href = "../login.html";//redirect
        }
    });
};