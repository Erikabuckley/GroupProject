import { checkAuth } from "./auth.js";

const {auth, role} = await checkAuth();
if (role != 'maintainer') {
    window.location.href = "dashboard.html";//redirect
}