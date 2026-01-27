const form = document.getElementById('form')

form.addEventListener('signin', (e) => {
    e.preventDefault(); // stop page reload
    window.location.href="https://erikabuckley.github.io/GroupProject/dashboard.html";
});

form.addEventListener('signup', (e) => {
    e.preventDefault(); // stop page reload
    window.location.href="https://erikabuckley.github.io/GroupProject/login.html";
});

form.addEventListener('confirm', (e) => {
    e.preventDefault(); // stop page reload
    window.location.href="https://erikabuckley.github.io/GroupProject/dashboard.html";
});