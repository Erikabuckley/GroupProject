updatePoints()
updateTotal()

async function updateTotal() {// gets the total number of g of  c02 the person has saved
    const res = await fetch("/updateTotalIndi",
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        }
    );
    const data = await res.json();
    document.getElementById("indi-carbon").textContent = data.total + 'g';
}

async function updatePoints() {// gets the total number of points the individual has gained
    const res = await fetch("/updatePointsIndi",
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        }
    );
    const data = await res.json();
    document.getElementById("indi-points").textContent = data.total + ' points';
}