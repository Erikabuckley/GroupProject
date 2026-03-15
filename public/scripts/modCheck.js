import { checkAuth } from "./auth.js";

const { auth, role } = await checkAuth();

//redirect user if they are not logged in
if (role != 'moderator') {
    window.location.href = "dashboard.html";
}