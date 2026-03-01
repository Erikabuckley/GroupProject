import { checkAuth } from "./auth.js";

const {auth, role} = await checkAuth();
if (role != 'moderator') {
    window.location.href = "moderator.html";//redirect
}