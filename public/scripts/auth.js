checkAuth()

async function checkAuth() {
    if (!(localStorage.getItem('auth') === '1')) {// checks if the user has logged in or not
        window.location.href = '../index.html'
    }
}