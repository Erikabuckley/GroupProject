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
        document.getElementById("delete").showModal();
        const closebutton = document.getElementById("close");
        closebutton.addEventListener('click', () =>
            document.getElementById("delete").close()
        );
        const confirmbutton = document.getElementById("confirm");
        confirmbutton.addEventListener('click', async () => {
            const text = document.getElementById("password").value;
            if (text === 'delete'){
                document.getElementById("delete").close()
                await fetch("/delete",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                });
                window.location.href = "../index.html";
            }else{
                document.getElementById("delete-error").textContent = "Please type delete";
                document.getElementById("delete-error").style.visibility = 'visible'
            }
        });
    });
} catch (err) {
    console.error("updatePoints error:", err);
    document.getElementById("error-message").textContent = "Error loading deleting your account";
}