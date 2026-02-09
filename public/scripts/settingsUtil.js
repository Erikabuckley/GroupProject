const button = document.getElementById('upgrade-status');
if (button){
    button.addEventListener('click', async (e) => {
        e.preventDefault();
        const res = await fetch("/upgrade",
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
            window.location.href = "../validation/login.html";
        }
    });
};