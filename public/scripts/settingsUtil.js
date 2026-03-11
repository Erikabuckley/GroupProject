const button = document.getElementById('upgrade-status');
try {
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
        //if the user is not allowed to be upgraded then will display an error message
        if (res.status === 401) {
            document.getElementById('error-message').style.visibility = 'visible';
        }
        // if not will prompt them to re-login to show moderator features
        else {
            window.location.href = "../validation/login.html";
        }
    });
} catch (err) {
    console.error("updatePoints error:", err);
    document.getElementById("error-message").textContent = "Error upgrading user";
};

// when the delete button is pressed then the user account is deleted
const del_button = document.getElementById('delete-account');
try {
    del_button.addEventListener('click', async (e) => {
        e.preventDefault();
        if (confirm("Do you want to delete your account")) {
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