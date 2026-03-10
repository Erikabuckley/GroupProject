updateTotal();

async function updateTotal() {
    try{
        total = document.getElementById("total-carbon");
        const res = await fetch("/updateTotal");
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
    } catch (err) {
        console.error("updatePoints error:", err);
        document.getElementById("total-carbon").textContent = "Error loading total";
    }
}