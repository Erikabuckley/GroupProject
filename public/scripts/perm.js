checkPerm()

async function checkPerm(){
    const res = await fetch ("/checkPerm",
        {
            method: "GET",
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : localStorage.getItem('name')
            }
        }
    );
    const data = await res.json();
    var perm = data.perm;
    if (!((perm === 'moderator') && (localStorage.getItem('type') === 'moderator'))){
        window.location.href = '../index.html'
    }
}