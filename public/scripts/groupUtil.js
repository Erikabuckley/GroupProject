updatePoints();
updateTotal();
populateTable();

async function updateTotal() {// gets the total amount of carbon the group had saved
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

async function updatePoints() {// gets the total number of points the group has gained
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

async function populateTable(){
        const res = await fetch("/updateTable",
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        }
    );
    const data = await res.json();
    table = document.getElementById("data-table");
    for (let x=1; x<= data.date.length + 1; x++){
        var row = table.insertRow(x);
        var cell1 = row.insertCell(0);
        var cell2 = row.insertCell(1);
        var cell3 = row.insertCell(2);
        var cell4 = row.insertCell(3);
        cell1.textContent = data.date[x];
        cell2.textContent = data.title[x];
        cell3.textContent = data.co2[x];
        cell4.textContent = data.cat[x];
    };
}