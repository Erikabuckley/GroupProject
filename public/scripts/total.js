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
    var obj = document.getElementById('total-carbon');
    var max = data.total/1000;
    let current = 0;
    let interval = setInterval(function(){
        current ++
        if (current >= max) {
            obj.innerHTML = current + 'kg';
            clearInterval(interval);
            return;
        }
        obj.innerHTML = current + 'kg';
    },10);
}