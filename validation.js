const form = document.getElementById('form')

form.addEventListener('submit', (e) => {
    e.preventDefault(); // stop page reload
    const action = e.submitter.value;
    if (action === 'Sign in') {
        window.location.href = "https://erikabuckley.github.io/GroupProject/dashboard.html";
     } else if (action === 'Sign up') {
        window.location.href = "https://erikabuckley.github.io/GroupProject/login.html";
    }  else if (action === 'Confirm') {
        window.location.href = "https://erikabuckley.github.io/GroupProject/dashboard.html";
    }
});

