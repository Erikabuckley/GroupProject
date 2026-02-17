const button = document.getElementById('upgrade-status');
if (button) {
    const email = localStorage.getItem('name');
    button.addEventListener('click', async (e) => {
        e.preventDefault();
        const res = await fetch("/upgrade",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email })
            }
        );
        if (res.status === 401) {
            document.getElementById('error-message').style.visibility = 'visible';   //if the user is not allowed to be upgraded then will display an error message
        }
        else {
            localStorage.setItem('auth', '1');
            window.location.href = "../validation/login.html"; // if not will prompt them to re-login to show moderator features
        }
    });
};