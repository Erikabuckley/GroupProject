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
    // return type in type json
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

// get data from the  action
app.post('/addAction', function (req, res) {
  console.log("Action request received"); //log that it has been done sucessfully
  console.log(req.body.challenge);
  res.end();
});

// signout user
app.post('/signOut', function (req, res) {
  console.log("Sign request received"); //log that it has been done sucessfully
  res.end();
});

// upgrade user
app.post('/upgrade', function (req, res) {
  console.log("Upgrade request received"); //log that it has been done sucessfully
  //return 401 if not allowed
  res.status(200);
  res.end();
});

// update total
app.get('/updateTotal', function (req, res) {
  console.log("Total update"); //log that it has been done sucessfully
  res.json({total: '200'})// replace with a db query
});

// get challenges
app.get('/updateChallengeList', function (req, res) {
  console.log("Challenge list update"); //log that it has been done sucessfully
  res.json({challenges: ['one','two','three']})// replace with a db query
});

//get missions
app.get('/updateMissionList', function (req, res) {
  console.log("Mission list update"); //log that it has been done sucessfully
  res.json({missions: ['one','two','three']})// replace with a db query
});

//get groups
app.get('/updateGroupList', function (req, res) {
  console.log("Group list update"); //log that it has been done sucessfully
  res.json({groups: ['one','two','three']})// replace with a db query
});

// Define a route for GET requests to the root URL
app.get('/', (req, res) => {
  res.send('If you can see this, then the back end is running :)');
});

// Start the server
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});



//TODO
//login chekc db - hash
//signup check if exists
//update user account
// log when user logs out
// store dat when person submits - dashutil
// return new total when page refreshed
//get challenges
//get missions
//join group

//needed for hasinng
//const crypto = require('crypto');
//const hash = crypto.createHash('sha256');
//            hash.update(plain_password);
 //           const password = hash.digest('hex');

 //still need to figure out how to pass name or session cookie for update and join group so do these last :)