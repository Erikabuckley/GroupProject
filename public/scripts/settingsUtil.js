const button = document.getElementById('upgrade-status');
try{
    button.addEventListener('click', async (e) => {
        e.preventDefault();
        const res = await fetch("/upgrade",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
            }
        );
        if (res.status === 401) {
            document.getElementById('error-message').style.visibility = 'visible';   //if the user is not allowed to be upgraded then will display an error message
        }
        else {
            window.location.href = "../validation/login.html"; // if not will prompt them to re-login to show moderator features
        }
    });
} catch (err) {
    console.error("updatePoints error:", err);
    document.getElementById("error-message").textContent = "Error upgrading user";
};


const del_button = document.getElementById('delete-account');
try{
    del_button.addEventListener('click', async (e) => {
        e.preventDefault();
        if (confirm("Do you want to delete your account")){
            await fetch("/delete",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
            }
        );
        window.location.href = "../index.html"; 
        }
    });
} catch (err) {
    console.error("updatePoints error:", err);
    document.getElementById("error-message").textContent = "Error loading deleting your account";
}