const button = document.getElementById('upgrade-status');
button.addEventListener('submit', async (e) => {
    const val = button.value;
    e.preventDefault();
    await fetch("https://groupproject-e980.onrender.com/upgrade",
            {
                method: "POST",
                headers: {
                    "Content-Type" : "application/json"
                },
                body : JSON.stringify({val}
                )
            }
        );
        window.location.href = "https://erikabuckley.github.io/GroupProject/dashboard.html";
        } 
);

