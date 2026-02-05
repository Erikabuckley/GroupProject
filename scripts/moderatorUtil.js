const type = localStorage.getItem('type'); //prevents unauthorised acces to moderator account
if (type != 'moderator'){
    window.location.href = "../index.html";
};