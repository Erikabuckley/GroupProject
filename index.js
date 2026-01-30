const express = require('express'); //imports express ie frmaework we are using
const cors = require("cors"); //imports the cors ie lets us actually sned data to github wihtout blocking it
const app = express();
const port = 8080; //specifys the port number

app.use(express.json());
app.use(cors({ 
  origin: "https://erikabuckley.github.io",//allows our website
  methods: ["GET", "POST","PUT"], // allows specific methods
 }));

// get data from the login
app.post('/login', function (req, res) {
    console.log("Login request received"); //log that it has been done sucessfully
    console.log(req.body.name);
    res.end();//says that its stopping sending data
});

// get data from the sign up
app.post('/signUp', function (req, res) {
    console.log("Sign up request received"); //log that it has been done sucessfully
    console.log(req.body.name);
    res.end();//says that its stopping sending data
});

// Define a route for GET requests to the root URL
app.get('/', (req, res) => {
  res.send('Hello World from Express!');
});

// Start the server
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
