export async function checkAuth() {
    const res = await fetch("/getSession",//gets the users session to check
    {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        },
    });
    const data = await res.json();
    return(// returns a boolean if they authenticated or not and their role
        {auth: data.authenticated,
        role: data.role}
    )
}