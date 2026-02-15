updateTotal();

async function updateTotal() {
    total = document.getElementById("total-carbon");
    const res = await fetch("/updateTotal",//sends a request to backend to calculate the current total carbon saved
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        }
    );
    const data = await res.json();
    document.getElementById("total-carbon").textContent = data.total + 'g';//updates the total on the home page with the new total
}