document.getElementById("logo").onclick = function () {
    location.href = "https://erikabuckley.github.io/GroupProject/index.html";
};

var modal = document.getElementById("upload-modal");
var btn = document.getElementById("upload");
var span = document.getElementsByClassName("close")[0];

btn.onclick = function () {
    modal.style.display = "block";
};
span.onclick = function() {
  modal.style.display = "none";
}