const express = require('express'); //imports express ie frmaework we are using
const cors = require("cors"); //imports the cors ie lets us actually sned data to github wihtout blocking it
const path = require('path');
const { OPEN_READWRITE } = require('sqlite3');
const app = express();
const sqlite3 = require('sqlite3').verbose(); 
const port = 8080; //specifys the port number
const bcrypt = require('bcryptjs'); //imports bcrypt for hashing
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(cors());


// get data from the login
app.post('/login', async (req, res) => {
    console.log("Login request received"); // log that it has been done sucessfully
    console.log(req.body.email);
    const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
      if (e) {
        console.log(e.message);
        return res.status(401).json({error:"database failure"});
      }
      // check if user exists
      db.get("SELECT password, role FROM Users WHERE email = ?",  [req.body.email], async (e, row) => {
        if (e) {
          console.log(e.message);
        }
        if (row) {
          const passwordMatches = await bcrypt.compare(req.body.password, row.password);
          console.log("user exists"); // log that user exists
          if (passwordMatches) {
            res.json({type: row.role}); // if valid return role
            console.log("sign in user sucessful"); // log that user has been signed in
          } else { 
            console.log("incorrect password");
            return res.status(401).json({error:"incorrect password"}); // return error
          } 
        } else {
          console.log("user does not exist"); // log that user doesnt exist
          return res.status(401).json({error:"user does not exist"});
        }
      })
    });
});

// get data from the sign up
app.post('/signUp', async (req, res) => {
    console.log("Sign up request received"); // log that it has been done sucessfully
    console.log(req.body.email);
    const db = new sqlite3.Database('CarbonChallenge.db',OPEN_READWRITE, async (e) => {
      if (e) {
        console.log(e.message);
        return res.status(401).json({error:"database failure"});
      }
      // check if username already in db
      db.get("SELECT email FROM Users WHERE email = ?", [req.body.email], async (e, row) =>{
        if (e) {
          console.log(e.message);
        }
        if (row) {
          console.log("User with this email already exists");
          return res.status(401).json({error:"account already assosciated with this email"});
        } else {
          // create hash password
          const hashedPassword = await bcrypt.hash(req.body.password, 10);
          // create new user in db
          db.run("INSERT INTO Users (display_name, role, email, password) VALUES (?,'participant',?,?)", [req.body.name,req.body.email,hashedPassword],e =>{
            if (e) {
              console.log(e.message);
              return res.status(500).json({ error: "Failed to create user" });
            } else {
              return res.sendStatus(201);
            }
          });
        }
      });
    });
    // res.end(); // says that its stopping sending data
});

// get data from the  action
app.post('/addAction', function (req, res) {
  console.log("Action request received"); // log that it has been done sucessfully
  console.log(req.body.challenge);
  res.end();
});

// signout user
app.post('/signOut', function (req, res) {
  console.log("Sign request received"); // log that it has been done sucessfully
  res.end();
});

// upgrade user
app.post('/upgrade', function (req, res) {
  console.log("Upgrade request received"); // log that it has been done sucessfully
  //return 401 if not allowed
  res.status(200);
  res.end();
});

// approve or deny a submission
app.post('/approveDeny', function (req, res) {
  console.log("submission request received"); //log that it has been done sucessfully
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
  res.json({title: ['one','two','three'],text: ['oncdsjvdsiovjsvsjoivse','twocdsivjfviojsfivfi9s9vifsv9f','threevfofdj0ivjfi0vjdf0bdjfdijbid9']})// replace with a db query return title, text as values and matching array in db
});

//get missions
app.get('/updateMissionList', function (req, res) {
  console.log("Mission list update"); //log that it has been done sucessfully
  res.json({title: ['one','two','three'],text: ['onesfsi09vhjdfi9vhjfi90vfi0vgh9','twofrijferihjre9ivhrihgerg9iheg9iegeh9i','threefijfrifjoivjdfivjdfi']})// replace with a db query, return text, title and coresponding array from db
});

//get groups
app.get('/updateGroupList', function (req, res) {
  console.log("Group list update"); //log that it has been done sucessfully
  res.json({groups: ['one','two','three']})// replace with a db query
});

//get missions
app.get('/updateSubmissionsList', function (req, res) {
  console.log("Submissions list update"); //log that it has been done sucessfully
  res.json({title: ['one','two','three'], name: ['onesfsi09vhjdfi9vhjfi90vfi0vgh9','twofrijferihjre9ivhrihgerg9iheg9iegeh9i','threefijfrifjoivjdfivjdfi'], evidence: ['onesfsi09vhjdfi9vhjfi90vfi0vgh9','twofrijferihjre9ivhrihgerg9iheg9iegeh9i','threefijfrifjoivjdfivjdfi']})// replace with a db query, return text, evedenc => if none put null in place of it nsubmittor name and coresponding array from db
});

//get carbon
app.get('/getCarbon', function (req, res) {
  console.log("Retreived carbon stored"); //log that it has been done sucessfully
  res.json({val : 10})// replace with a db query, 
});

app.get('/checkAuth', function (req, res) {
  console.log("Check user type"); //log that it has been done sucessfully
  res.json({auth: true})// replace with a db query, 
});

// Define a route for GET requests to the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});



// TODO
// signup check if exists sign up 404
// update user account
// log when user logs out
// store data when person submits - dashutil
// return new total when page refreshed
// get challenges
// get missions
// join group
// getcarbon
// get permissions
