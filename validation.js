const form = document.getElementById('form')

if (form){
    form.addEventListener('submit', async (e) => { //wait till form has been submitted
        e.preventDefault(); // stop page reload
        const action = e.submitter.value;
        if (action === 'Sign in') { // check if login
            const email = document.getElementById("email-input").value; //get info and store in constants
            const password = document.getElementById("password-input").value;
            const res = await fetch("http://127.0.0.1:8080/login", // send data to backend
                {
                    method: "POST", //sending data to the server
                    headers: {
                        "Content-Type" : "application/json" //tells server how data is formatted
                    },
                    body : JSON.stringify({email, password} //turn to json
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
        } 
        else if (action === 'Sign up') {
            const email = document.getElementById("email-input").value;
            const password = document.getElementById("password-input").value;
            const name = document.getElementById("firstname-input").value;
            const priv = document.getElementById("priv").value;
            const tandc = document.getElementById("tandc").value;

            if (priv & tandc){
                await fetch("http://127.0.0.1:8080/signUp",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type" : "application/json"
                        },
                        body : JSON.stringify({email, password,name,priv,tandc}   
                        )
                    }
                
                );
            }
            if(res.status == 401) {
                document.getElementById('error').style.zIndex = 1;   
            }
            else{
                window.location.href = "/login.html";//redirect
            }
        };
    });
};
