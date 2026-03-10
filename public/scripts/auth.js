export async function checkAuth() {
    try {
        const res = await fetch("/getSession", { // gets the users session to check
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
        });

        if (!res.ok) throw new Error("Failed to fetch session");

        const data = await res.json();

        return {
            auth: data.authenticated,
            role: data.role
        };

    } catch (err) {
        console.error("checkAuth error:", err);

        return {
            auth: false,
            role: null
        };
    }
}