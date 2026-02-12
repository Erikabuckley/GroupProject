checkPerm()

async function checkPerm() {
    const res = await fetch("/checkPerm",//gets the access level of the user
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": localStorage.getItem('name')
            }
        }
    );
    const data = await res.json();
    var perm = data.perm;
    if (!(perm === 'moderator')) { //checks the stored acces level to allow acces to moderator features
        window.location.href = '../index.html'
    }
}