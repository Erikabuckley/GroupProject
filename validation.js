const form = document.getElementById('form')
const firstname_input = document.getElementById('firstname-input')
const email_input = document.getElementById('email-input')
const password_input = document.getElementById('password-input')
const error_message = document.getElementById('error-message')

form.addEventListener('submit', (e) => {
    e.preventDefault(); // stop page reload
    window.location.href="https://erikabuckley.github.io/GroupProject/dashboard.html";
});
