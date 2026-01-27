<?php

if (isset($_POST['signUp'])){
    $name = $_POST['name'];
    $email = $_POST['email'];
    $password = $_POST['password'];
    header("Location: login.php");
    exit();
}

if (isset($_POST['login'])){
    $email = $_POST['email'];
    $password = $_POST['password'];
    header("Location: dashboard.html");
    exit();
}

?>