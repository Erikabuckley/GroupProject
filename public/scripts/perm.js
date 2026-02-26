checkPerm()

async function checkPerm() {
    const res = await fetch("/getSession",
    {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        },
    });
    const data = await res.json();//gets challenge information
    if (data.role != 'moderator') {// checks if the user has logged in or not
        window.location.href = '../index.html'
    }
}