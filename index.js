const express = require('express'); //imports express ie frmaework we are using
const cors = require("cors"); //imports the cors ie lets us actually sned data to github wihtout blocking it
const { OPEN_READWRITE } = require('sqlite3');
const app = express();
const sqlite3 = require('sqlite3').verbose(); 
const port = 8080; //specifys the port number

app.use(express.json());
app.use(cors());

// get data from the login
app.post('/login', function (req, res) {
    console.log("Login request received"); //log that it has been done sucessfully
    console.log(req.body.email);
    //check if user exists
      // return doesnt  res.status(200);
    // chekc password matches
      //return doesnt     res.status(401);
    //return authorised
    res.end();//says that its stopping sending data
});

// get data from the sign up
app.post('/signUp', function (req, res) {
    console.log("Sign up request received"); //log that it has been done sucessfully
    console.log(req.body.email);
    const db = new sqlite3.Database('CarbonChallenge.db',OPEN_READWRITE,(e)=>{
      if (e) {
        console.log(e.message);
      }
    });
    //check if username already in db
    db.run("INSERT INTO Users (display_name, role, email, password) VALUES (?,'participant',?,?)", [req.body.name,req.body.email,req.body.password],e =>{
      if (e){
        console.log(e.message);
      }
    });
    res.end();//says that its stopping sending data
});

// Define a route for GET requests to the root URL
app.get('/', (req, res) => {
  res.send('If you can see this, then the back end is running :)');
});

// Start the server
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
