const express = require('express'); //imports express ie frmaework we are using
const cors = require("cors"); //imports the cors ie lets us actually sned data to github wihtout blocking it
const { OPEN_READWRITE } = require('sqlite3');
const app = express();
const sqlite3 = require('sqlite3').verbose(); 
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
    const db = new sqlite3.Database('CarbonChallenge.db',OPEN_READWRITE,(e)=>{
    if (e) {
      console.log(e.message);
    }
  });

    db.run("INSERT INTO Users (username,password) VALUES (erika,hi)",e =>{
      if (e){
        console.log(e.message);
      }
    });

    res.end();//says that its stopping sending data
});

// get data from the sign up
app.post('/signUp', function (req, res) {
    console.log("Sign up request received"); //log that it has been done sucessfully
    console.log(req.body.name);
    res.end();//says that its stopping sending data
});

//TODO
//verify p and u in db
// add to db check if already exists
//POST FROM EvIDENCE UPLOAD


// Define a route for GET requests to the root URL
app.get('/', (req, res) => {
  res.send('Hello World');
});

// Start the server
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
