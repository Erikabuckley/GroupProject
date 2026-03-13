document.getElementById("signOut").addEventListener("click", () => {
    fetch("/logout", {
        method: "POST"
    }).then(() => {
        window.location.href = "/login";
    });
});