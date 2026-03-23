// Cookie pop up
const cookies = document.getElementById("cookies");
cookies.showModal();
const confirmbutton = document.getElementById("close");
// Waits till user has clicked close
confirmbutton.addEventListener('click', async () => {
    cookies.close();
});