checkAuth()

async function checkAuth(){
    if (!(localStorage.getItem('auth') === '1')){
        window.location.href = '../index.html'
    }
}