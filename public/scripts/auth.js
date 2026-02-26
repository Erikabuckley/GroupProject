checkAuth()

async function checkAuth() {
    const res = await fetch("/getSession",
    {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        },
    });
    const data = await res.json();//gets challenge information
    if (data.authenticated) {// checks if the user has logged in or not
        window.location.href = '../index.html'
    }
}