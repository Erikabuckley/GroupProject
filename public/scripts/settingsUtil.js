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
            if (text === 'delete') {
                document.getElementById("delete").close()
                // Send post to backend when user presses delete account
                await fetch("/delete",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                    });
                window.location.href = "../index.html";
            } else {
                document.getElementById("delete-error").textContent = "Please type delete";
                document.getElementById("delete-error").style.visibility = 'visible'
            }
        });
    });
} catch (err) {
    console.error("updatePoints error:", err);
    document.getElementById("error-message").textContent = "Error loading deleting your account";
}