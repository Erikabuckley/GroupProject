const button = document.getElementById('upgrade-status');
button.addEventListener('submit', async (e) => {
    const val = button.value;
    e.preventDefault();
    const res = await fetch("https://groupproject-e980.onrender.com/upgrade",
        {
            method: "POST",
            headers: {
                "Content-Type" : "application/json"
            },
            body : JSON.stringify({val}
            )
        }
    );
    if(res.status == 401) {
        document.getElementById('error').style.zIndex = 1;   
    }
    else{
        localStorage.setItem('auth','1');
        window.location.href = "/dashboard.html";//redirect
    }
});

