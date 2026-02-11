updateTotal();

async function updateTotal(){
    total = document.getElementById("total-carbon");
    const email = localStorage.getItem('name');
    const res = await fetch ("/updateTotal",
        {
            method: "GET",
            headers: {
                "Content-Type" : "application/json",
                "Authorisation" : email   
            }
        }
    );
    const data = await res.json();
    document.getElementById("total-carbon").textContent = data.total;
}