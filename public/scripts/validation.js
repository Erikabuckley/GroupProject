const form = document.getElementById('form')

if (form) {
    form.addEventListener('submit', async (e) => { //wait till form has been submitted
        e.preventDefault(); // stop page reload
        const action = e.submitter.value;
        if (action === 'Log in') { // check if login
            const email = document.getElementById("email-input").value; //get info and store in constants
            const password = document.getElementById("password-input").value;
            const res = await fetch("/login", // send data to backend
                {
                    method: "POST", //sending data to the server
                    headers: {
                        "Content-Type": "application/json" //tells server how data is formatted
                    },
                    body: JSON.stringify({ email, password } //turn to json
                    )
                }
            );
            const data = await res.json();
            if (res.status === 401) {
                document.getElementById('error-message').textContent = data.error;
                document.getElementById('error-message').style.visibility = 'visible';
            }
            else {
                await fetch("/setSession", // send data to backend
                    {
                        method: "POST", //sending data to the server
                        headers: {
                            "Content-Type": "application/json" //tells server how data is formatted
                        },
                        body: JSON.stringify({ email, password } //turn to json
                        )
                    });
                if (data.type === 'moderator') {
                    window.location.href = "../dash/analytics.html";//redirect   
                } else {
                    window.location.href = "../dash/dashboard.html";//redirect   
                }
            }
        }
        else if (action === 'Sign up') {//check if sign up
            const email = document.getElementById("email-input").value;
            const password = document.getElementById("password-input").value;
            const name = document.getElementById("firstname-input").value;
            const priv = document.getElementById("priv").checked;
            const tandc = document.getElementById("tandc").checked;

            if (!/^[A-Za-z0-9._+-]+@exeter\.ac\.uk$/.test(email)) {
                document.getElementById('error-message').textContent = "Email does not end in exeter.ac.uk";
                document.getElementById('error-message').style.visibility = 'visible';
            } else if (!/^[A-Za-z0-9'-]+$/.test(name)) {
                document.getElementById('error-message').textContent = "Name must not contain special characters";
                document.getElementById('error-message').style.visibility = 'visible';
            } else if (priv && tandc) {
                const res = await fetch("/signUp",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ email, password, name }
                        )
                    }

                );

                if (res.status === 401) {
                    const data = await res.json();
                    document.getElementById('error-message').textContent = data.error;
                    document.getElementById('error-message').style.visibility = 'visible';  // if there is an error then the erro message will be displayed
                }
                else {
                    window.location.href = "login.html";//redirect
                }
            }
        };
    });
};