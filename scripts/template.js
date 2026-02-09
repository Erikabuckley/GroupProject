async function loadFooter(){
    let res;
    if (document.URL.includes("dash")){
        res = await fetch("../templates/footer.html");
    } else{
        res = await fetch("templates/footer.html");
    }
    const html = await res.text();
    document.getElementsByClassName("footer-container")[0].innerHTML = html;
};

async function loadHeader() {
    if (document.URL.includes("index.html")){
        await loadHomeHeader();
    } else if (document.URL.includes("dash")){
        await loadDashHeader();
        const out = document.getElementById('signOut') //logs them out
        if (out){
            out.addEventListener('click', async (e) => {
                e.preventDefault();
                await fetch("http://127.0.0.1:8080/signOut",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type" : "application/json"
                        },
                        body : JSON.stringify({name : localStorage.getItem('name')}) //turn to json
                    }
                )
                localStorage.removeItem('auth');
                localStorage.removeItem('name');
                window.location.href = "../index.html"
            });
        };
    } else {
        await loadBasicHeader();
        const exit = document.getElementById("out");
        if (exit){
            if (localStorage.getItem('auth') != '1'){
                exit.onclick = function () {
                    window.location.href = "index.html";
                };
            }else{
                exit.onclick = function () {
                    window.location.href = "../dash/dashboard.html";
                };
            }
        }
    }

    document.getElementById("logo").onclick = function () {
    if (document.URL.includes('dash')){
        window.location.href = "dashboard.html"
    }else if (document.URL.includes('policies')){
        window.location.href = "../index.html"
    } else {
        window.location.href = "index.html";
    }
    }
}

async function loadBasicHeader(){
    let res;
    if (document.URL.includes("policies")){
        res = await fetch("../templates/basicHeader.html");
    } else{
        res = await fetch("templates/basicHeader.html");
    }
    const html = await res.text();
    document.getElementsByClassName("header-container")[0].innerHTML = html;
}

async function loadHomeHeader(){
    const res = await fetch("templates/homeHeader.html")
    const html = await res.text();
    document.getElementsByClassName("header-container")[0].innerHTML = html;
}

async function loadDashHeader(){
    const res = await fetch("../templates/dashHeader.html")
    const html = await res.text();
    document.getElementsByClassName("header-container")[0].innerHTML = html;
}

loadFooter();
loadHeader();

