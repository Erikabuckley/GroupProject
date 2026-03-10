updatePoints()
updateTotal()
populateTable('date')
async function updateTotal() {// gets the total number of g of  c02 the person has saved
    const res = await fetch("/updateTotalIndi");
    const data = await res.json();
    document.getElementById("indi-carbon").textContent = data.total + 'g';
}

async function updatePoints() {// gets the total number of points the individual has gained
    const res = await fetch("/updatePointsIndi");
    const data = await res.json();
    document.getElementById("indi-points").textContent = data.total + ' points';
}

async function populateTable(type){
    let res;
    if (type === 'date'){        
        res = await fetch("/updateTableDateIndi");
    } else if (type === 'type'){
        res = await fetch("/updateTableTypeIndi");

    } else{
        console.log('error');
    }
    const data = await res.json();
    table = document.getElementById("data-table");
    table.innerHTML = "";

    var row = table.insertRow();

    var th1 = document.createElement("th");
    var th2 = document.createElement("th");
    var th3 = document.createElement("th");
    var th4 = document.createElement("th");

    th1.textContent = "DATE";
    th2.textContent = "TITLE";
    th3.textContent = "CO2";
    th4.textContent = "CATEGORY";

    row.appendChild(th1);
    row.appendChild(th2);
    row.appendChild(th3);
    row.appendChild(th4);

    for (let x=0; x<= data.date.length; x++){
        var row = table.insertRow();
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

const dateFilter = document.getElementById('filter-one');
const typeFilter = document.getElementById('filter-two');

const allFilters = [dateFilter, typeFilter];

function setActiveFilter(activeElement, type) {

    allFilters.forEach(filter => {
        filter.style.backgroundColor = 'var(--second)';
    });
    activeElement.style.backgroundColor = 'var(--main)';

    populateTable(type);
}


dateFilter.addEventListener('click', () => 
    setActiveFilter(dateFilter, 'date')
);

typeFilter.addEventListener('click', () => 
    setActiveFilter(typeFilter, 'type')
);