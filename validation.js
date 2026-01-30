const form = document.getElementById('form')

form.addEventListener('submit', async (e) => {
    e.preventDefault(); // stop page reload
    const action = e.submitter.value;
    if (action === 'Sign in') {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        await fetch("https://groupproject-e980.onrender.com/login",
            {
                method: "POST",
                headers: {
                    "Content-Type" : "application/json"
                },
                body : JSON.stringify({email, password}   
                )
            }
        );
        window.location.href = "https://erikabuckley.github.io/GroupProject/dashboard.html";
        } 
        else if (action === 'Sign up') {
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;
            const name = document.getElementById("name").value;
            const priv = document.getElementById("priv").value;
            const tandc = document.getElementById("tandc").value;
                await fetch("https://groupproject-e980.onrender.com/signUp",
            {
                method: "POST",
                headers: {
                    "Content-Type" : "application/json"
                },
                body : JSON.stringify({email, password,name,priv,tandc}   
                )
            }
        );
        window.location.href = "https://erikabuckley.github.io/GroupProject/login.html";
    }  else if (action === 'Confirm') {
        window.location.href = "https://erikabuckley.github.io/GroupProject/dashboard.html";
    }
});

