const cookies = document.getElementById("cookies");
cookies.showModal();
const confirmbutton = document.getElementById("close");
confirmbutton.addEventListener('click', async () => {
    cookies.close();
});