const form = document.getElementById('form')

form.addEventListener('submit', (e) => {
    e.preventDefault(); // stop page reload
    if (action === 'signin') {
        window.location.href = "https://erikabuckley.github.io/GroupProject/dashboard.html";
     } else if (action === 'signup') {
        window.location.href = "https://erikabuckley.github.io/GroupProject/login.html";
    }
});

form.addEventListener('submit', (e) => {
    e.preventDefault(); // stop page reload
    if (action === 'confirm') {
        window.location.href="https://erikabuckley.github.io/GroupProject/dashboard.html";
    }
});