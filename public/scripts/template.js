async function loadFooter() {
    const res = await fetch("/templates/footer.html");
    const html = await res.text();
    document.getElementsByClassName("footer-container")[0].innerHTML = html;
};

async function loadHeader() {
    if (document.URL.includes("dash")) {
        await loadDashHeader();
        const type = localStorage.getItem('type'); //prevents unauthorised access to ribbon elements
        if (type === 'moderator') {
            document.getElementById('participant').style.display = "none";
            document.getElementById('moderator').style.display = "flex";
        } else {
            document.getElementById('participant').style.display = "flex";
            document.getElementById('moderator').style.display = "none";
        }
        const out = document.getElementById('signOut') //logs them out
        if (out) {
            out.addEventListener('click', async (e) => {
                e.preventDefault();
                await fetch("/signOut",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ name: localStorage.getItem('name') }) //turn to json
                    }
                )
                localStorage.removeItem('auth');
                localStorage.removeItem('name');
                localStorage.removeItem('type');
                window.location.href = "../index.html"
            });
        };
    } else if (document.URL.includes("policies") || document.URL.includes("validation")) {
        await loadBasicHeader();
        const exit = document.getElementById("out");
        if (exit) {
            if (localStorage.getItem('auth') != '1') {
                exit.onclick = function () {
                    window.location.href = "../index.html";
                }

            } else {
                exit.onclick = function () {
                    window.location.href = "../dash/dashboard.html";
                };
            }
        }
    } else {
        await loadHomeHeader();
    }

    document.getElementById("logo").onclick = function () {// goes to the correct place when logo clicked depending on the current screen
        if (document.URL.includes('dash')) {
            window.location.href = "dashboard.html"
        } else if (document.URL.includes('index')) {
            window.location.href = "index.html"
        } else {
            window.location.href = "../index.html";
        }
    }
}

async function loadBasicHeader() {
    const res = await fetch("/templates/basicHeader.html");
    const html = await res.text();
    document.getElementsByClassName("header-container")[0].innerHTML = html;
}

async function loadHomeHeader() {
    const res = await fetch("/templates/homeHeader.html")
    const html = await res.text();
    document.getElementsByClassName("header-container")[0].innerHTML = html;
}

async function loadDashHeader() {
    const res = await fetch("/templates/dashHeader.html")
    const html = await res.text();
    document.getElementsByClassName("header-container")[0].innerHTML = html;
}

//uploads correct header and footer to the page
loadFooter();
loadHeader();