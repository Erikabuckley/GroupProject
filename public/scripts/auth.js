checkAuth()

async function checkAuth(){
    const res = await fetch ("/checkAuth",
        {
            method: "GET",
            headers: {
                "Content-Type" : "application/json"
            }
        }
    );
    const data = await res.json();
    var auth = data.auth;
    if (auth != true){
        window.location.href = '../index.html'
    }
}