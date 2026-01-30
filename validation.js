const form = document.getElementById('form')

form.addEventListener('submit', async (e) => { //wait till form has been submitted
    e.preventDefault(); // stop page reload
    const action = e.submitter.value;
    if (action === 'Sign in') { // check if login
        const email = document.getElementById("email-input").value; //get info and store in constants
        const password = document.getElementById("password-input").value;
        await fetch("https://groupproject-e980.onrender.com/login", // send data to backend
            {
                method: "POST", //sending data to the server
                headers: {
                    "Content-Type" : "application/json" //tells server how data is formatted
                },
                body : JSON.stringify({email, password} //turn to json
                )
            }
        );
        window.location.href = "https://erikabuckley.github.io/GroupProject/dashboard.html";//redirect
        } 
    else if (action === 'Sign up') {
        const email = document.getElementById("email-input").value;
        const password = document.getElementById("password-input").value;
        const name = document.getElementById("name-input").value;
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

