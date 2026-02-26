export async function checkAuth() {
    const res = await fetch("/getSession",
    {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        },
    });
    const data = await res.json();//gets challenge information
    return(
        {auth: data.authenticated,
        role: data.role}
    )
}