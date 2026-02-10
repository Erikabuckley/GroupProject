const express = require('express'); //imports express ie frmaework we are using
const cors = require("cors"); //imports the cors ie lets us actually sned data to github wihtout blocking it
const { OPEN_READWRITE } = require('sqlite3');
const app = express();
const sqlite3 = require('sqlite3').verbose(); 
const port = 8080; //specifys the port number
const bcrypt = require('bcryptjs'); //imports bcrypt for hashing

app.use(express.json());
app.use(cors());

// get data from the login
app.post('/login', async (req, res) {
    console.log("Login request received"); // log that it has been done sucessfully
    console.log(req.body.email);
    const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e)=> {
      if (e) {
        console.log(e.message);
        return;
      }
      // check if user exists
      db.get("SELECT password, role FROM Users WHERE email = ?", [req.body.email], (e, row) => {
        if (e){ // if it does not, return error 200
          console.log(e.message);
          return res.status(200);
        }
        if (row) { // if user stored password is returned
          const passwordMatches = await bcrypt.compare(req.body.password);
          if (passwordMatches) { // if password matches return row
            return res.json({type: row.role});
          } else { // if it does not, return error 401
            return res.status(401);
          }
        }
      })
      // return authorised
    });
    res.end();//says that its stopping sending data
});

// get data from the sign up
app.post('/signUp', async (req, res) {
    console.log("Sign up request received"); // log that it has been done sucessfully
    console.log(req.body.email);
    const db = new sqlite3.Database('CarbonChallenge.db',OPEN_READWRITE,(e)=>{
      if (e) {
        console.log(e.message);
        return; // added
      }
      // check if username already in db
      db.get("SELECT email FROM Users WHERE email = ?", [req.body.email], (e, row) =>{
        if (e){
          console.log(e.message);
          return;
        }
        if (row) {
          console.log("User with this email already exists");
          return;
        }
      });
      // create hash password
      const hashedPassword = await bcrypt.hash(password);
      // create new user in db
      db.run("INSERT INTO Users (display_name, role, email, hashedPassword) VALUES (?,'participant',?,?)", [req.body.name,req.body.email,req.body.password],e =>{
        if (e){
          console.log(e.message);
          return;
        }
      });
    });
    res.end();// says that its stopping sending data
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
//login check db - hash
//signup check if exists
//update user account
// log when user logs out
// store dat when person submits - dashutil
// return new total when page refreshed
//get challenges
//get missions
//join group

// needed for hasinng
// const crypto = require('crypto');
// const hash = crypto.createHash('sha256');
//            hash.update(plain_password);
//            const password = hash.digest('hex');

 //still need to figure out how to pass name or session cookie for update and join group so do these last :)