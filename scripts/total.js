updateTotal();

async function updateTotal(){
    total = document.getElementById("total-carbon");
    const res = await fetch ("http://127.0.0.1:8080/updateTotal",
        {
            method: "GET",
            headers: {
                "Content-Type" : "application/json"
            }
        }
    );
    const data = await res.json();
    document.getElementById("total-carbon").textContent = data.total;
}