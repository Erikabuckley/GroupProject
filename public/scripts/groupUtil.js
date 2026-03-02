updatePoints()
updateTotal()

async function updateTotal() {
    const res = await fetch("/updateTotalGroup",
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        }
    );
    const data = await res.json();
    document.getElementById("group-carbon").textContent = data.total + 'g';
}

async function updatePoints() {// gets the total number of points the individual has gained
    const res = await fetch("/updatePointsGroup",
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        }
    );
    const data = await res.json();
    document.getElementById("group-points").textContent = data.total + ' points';
}