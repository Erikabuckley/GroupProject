updatePoints();
updateTotal();
populateTable('date');

// gets the total amount of carbon the group had saved
async function updateTotal() {
    const res = await fetch("/updateTotalGroup");
    const data = await res.json();
    document.getElementById("group-carbon").textContent = data.total + 'g';
}

// gets the total number of points the group has gained
async function updatePoints() {
    const res = await fetch("/updatePointsGroup");
    const data = await res.json();
    document.getElementById("group-points").textContent = data.total + ' points';
}

// populates the table with submissions from users
async function populateTable(type) {
    const res = await fetch(`/updateTableGroup?type=${type}`);
    const data = await res.json();

    if (type === 'date') {
        plotPi(type, data.date);
    } else if (type === 'type') {
        plotPi(type, data.cat);
    } else if(type == 'indi'){
        plotPi(type, data.id, data.userId);
    }

    const table = document.getElementById("data-table");
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

    for (let x = 0; x < data.date.length; x++) {
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

function plotPi(type, data , id=null){
    var xValues;
    var yValues;
    var title
    if (type === 'date') {
        const grouped = groupDatesByMonth(data);
        xValues = grouped.labels;
        yValues = grouped.values;
        title = 'Submission grouped by date'
    } else if (type === 'type') {
        const grouped = groupDatesByType(data);
        xValues = grouped.labels;
        yValues = grouped.values;
        title = 'Submissions grouped by type'
    } else if(type === 'indi'){
        const grouped = groupDatesByUser(data, id);
        xValues = grouped.labels;
        yValues = grouped.values;
        title = 'Submissions per user'
    }
    const barColors = [
    "#b91d47",
    "#00aba9",
    "#2b5797",
    "#e8c3b9",
    "#1e7145",
    "#b91d47",
    ];

    new Chart("myChart", {
    type: "doughnut",
    data: {
        labels: xValues,
        datasets: [{
        backgroundColor: barColors,
        data: yValues
        }]
    },
    options: {
        title: {
        display: true,
        text: title
        }
    }
    });
}
const indiFilter = document.getElementById('filter-one');
const dateFilter = document.getElementById('filter-two');
const typeFilter = document.getElementById('filter-three');

const allFilters = [indiFilter, dateFilter, typeFilter];

function setActiveFilter(activeElement, type) {

    allFilters.forEach(filter => {
        filter.style.backgroundColor = 'var(--second)';
    });
    activeElement.style.backgroundColor = 'var(--main)';
    populateTable(type);
}

// checks if any of the filters have been clicked
indiFilter.addEventListener('click', () =>
    setActiveFilter(indiFilter, 'indi')
);

dateFilter.addEventListener('click', () =>
    setActiveFilter(dateFilter, 'date')
);

typeFilter.addEventListener('click', () =>
    setActiveFilter(typeFilter, 'type')
);

function groupDatesByMonth(dates) {

    const months = {};
    const now = new Date();

    // create last 6 months
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleString('default', { month: 'short' });
        months[key] = 0;
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 5);

    dates.forEach(dateStr => {
        const date = new Date(dateStr);

        // Only include dates in the last 6 months
        if (date >= sixMonthsAgo && date <= now) {
            const key = date.toLocaleString('default', { month: 'short' });

            if (months[key] !== undefined) {
                months[key]++;
            }
        }
    });

    return {
        labels: Object.keys(months),
        values: Object.values(months)
    };
}

function groupDatesByType(types){
    const result = {};
    types.forEach(type => {

        if (!result[type]) {
            result[type] = 0;
        }

        result[type]++;

    });

    return {
        labels: Object.keys(result),
        values: Object.values(result)
    };
}

function groupDatesByUser(submissions, targetId) {
  const result = { [targetId]: 0, other: 0 };

  submissions.forEach(sub => {
    if (sub.id === targetId) {
      result[targetId]++;
    } else {
      result.other++;
    }
  });

  return {
    labels: ["Your Submissions", "Other Submissions"],
    values: Object.values(result)
  };
}