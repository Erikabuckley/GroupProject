updateTotal();

async function updateTotal(){
    total = document.getElementById("total-carbon");
    const res = await fetch ("/updateTotal",
        {
            method: "GET",
            headers: {
                "Content-Type" : "application/json",
            }
        }
    );
    const data = await res.json();
    document.getElementById("total-carbon").textContent = data.total;
}