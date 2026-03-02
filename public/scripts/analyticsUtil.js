updatePoints()
getMembers();

async function getMembers() {// gets the total number of points the individual has gained
    const res = await fetch("/getMembers",
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        }
    );
    const data = await res.json();
    document.getElementById("members").textContent = data.total + ' members';
}
async function updatePoints() {// gets the total number of points the individual has gained
    const res = await fetch("/updatePoints",
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        }
    );
    const data = await res.json();
    document.getElementById("points").textContent = data.total + ' points';
}