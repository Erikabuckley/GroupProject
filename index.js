const express = require('express'); //imports express ie frmaework we are using
const cors = require("cors"); //imports the cors ie lets us actually sned data to github wihtout blocking it
const path = require('path');
const { OPEN_READWRITE } = require('sqlite3');
const app = express();
const sqlite3 = require('sqlite3').verbose(); 
const port = 8080; //specifys the port number
const bcrypt = require('bcryptjs'); //imports bcrypt for hashing
const { getgroups } = require('process');
const { CLIENT_RENEG_WINDOW } = require('tls');
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
        return res.status(500).json({error:"database failure"});
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
            return res.status(401).json({error:"Incorrect password, please try again"}); // return error
          } 
        } else {
          console.log("user does not exist"); // log that user doesnt exist
          return res.status(401).json({error:"No user with that email, please try again"});
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
        return res.status(500).json({error:"database failure"});
      }
      // check if username already in db
      db.get("SELECT email FROM Users WHERE email = ?", [req.body.email], async (e, row) =>{
        if (e) {
          console.log(e.message);
        }
        if (row) {
          console.log("User with this email already exists");
          return res.status(401).json({error:"There is an account already with this email"});
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
});

// get data from the  action
app.post('/addAction', function (req, res) {
  console.log("Action request received"); // log that it has been done sucessfully
  console.log(req.body.email);
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({error:"database failure"});
    }
    // generate current date
    const date = new Date().toISOString();
    // calculate co2 saved
    db.get("SELECT action_type_id, default_factor_id FROM ActionTypes WHERE name = ?", [req.body.mission], async (e, actionType) => {
      if (e) {
        console.log(e.message);
        return res.status(400).json({error:"database error"});
      }
      if (!actionType) {
        return res.status(400).json({error:"no action type found"});
      }
      if (actionType) {
        const type_id = actionType.action_type_id;
        const factor_id = actionType.default_factor_id;
        db.get("SELECT source, value FROM ConversionFactors WHERE factor_id = ?", [factor_id], async (e, factor) => {
          if (e || !factor) {
            console.log(e.message);
            return res.status(400).json({error:"no conversion factor found"});
          }
          if (factor) {
            const co2_saved = factor.value * req.body.quantity;
            const source_url = factor.source;
            // get relevant user id from email
            db.get("SELECT user_id FROM Users WHERE email = ?", [req.body.email], async (e, user) => {
              if (e || !user) {
                console.log(e.message);
                return res.status(400).json({error:"no user found"});
              }
              if (user) {
                if (req.body.challenge === 'no') {
                  db.run("INSERT INTO ActionLogs (action_type_id, user_id, quantity, date, evidence_required, calculated_co2e) VALUES (?, ?, ?, ?, ?, ?)", [type_id, user.user_id, req.body.quantity, date, req.body.upload, co2_saved], e => {
                    if (e) {
                      console.log(e.message);
                      return res.status(500).json({ error: "Failed to create action log" });
                    } else {
                      return res.json({carbon : co2_saved, source : source_url}); // return the amount of carbon saved and conversion source
                    }
                  })
                } else {
                  db.run("INSERT INTO ActionLogs (action_type_id, user_id, quantity, date, evidence_required, calculated_co2e) VALUES (?, ?, ?, ?, ?, ?)", [type_id, user.user_id, req.body.quantity, date, req.body.upload, co2_saved], function (e) {
                    if (e) {
                      console.log(e.message);
                      return res.status(500).json({ error: "Failed to create action log" });
                    } else {
                      const log_id = this.lastID;
                      
                      db.get("SELECT challenge_id FROM Challenges WHERE title = ?", [req.body.challenge], async (e, challenge) => {
                        if (e || !challenge) {
                          console.log(e.message);
                          return res.status(400).json({error:"no challenge found"});
                        }
                        if (challenge) {
                          db.run("INSERT INTO Submissions (challenge_id, user_id, group_id, linked_action_logs, points, status) VALUES (?, ?, ?, ?, 0, 'Pending')", [challenge.challenge_id, user.user_id, req.body.group_id, log_id], e => {
                            if (e) {
                              console.log(e.message);
                              return res.status(500).json({ error: "Failed to create submission" });
                            } else {
                              return res.json({carbon : co2_saved, source: source_url}); // return the amount of carbon saved and conversion source
                            }
                          })
                        }
                      })
                    }
                  })
                }
              }
            })
          }
        })
      }
    })
  })
});
// mission is covered by action type (in the name attribute)
// hard code a quantity whilst developing
// search users to get their user_id, using their email
// also need date (https://dev.to/ayako_yk/javascript-date-objects-basics-and-time-zone-adjustments-4g14)

// add user to a group
app.post('/addGroup', function (req, res) {
  console.log("Join request received");
  console.log(req.body.group);
  console.log(req.body.email);

  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, async (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({error: "database failure"});
    }

    // add to db: user to group return 409
    // get relevant group id
    // add row to participantgroup
    db.get("SELECT group_id FROM Groups WHERE name = ?", [req.body.group], async (e, row) => {
      if (e) {
        console.log(e.message);
        return;
      }

      if (!row) {
        console.log("group does not exist");
        return res.status(404).json({error: "group does not exist"});
      }

      const group_id = row.group_id;

      db.get("SELECT user_id FROM Users WHERE email = ?", [req.body.email], async (e, userRow) => {
        if (e) {
          console.log(e.message);
          return;
        }

        if (!userRow) {
          console.log("user does not exist");
          return res.status(401).json({ error: "user does not exist" });
        }

        const user_id = userRow.user_id;

        db.get("SELECT 1 FROM ParticipantGroup WHERE group_id = ? AND user_id = ?", [group_id, user_id],
          (e, participantRow) => {
            if (e) {
              console.log(e.message);
              return;
            }

            if (participantRow) {
              console.log("User already in group");
              return res.status(409).json({error: "User already in group"});
            }

            db.run("INSERT INTO ParticipantGroup (group_id, user_id) VALUES (?, ?)", [group_id, user_id], function (e) {
                if (e) {
                  console.log(e.message);
                  return;
                }
                console.log("User added to group");
                return res.sendStatus(201);
              }
            );
          }
        );
      });
    });
  });
});

// signout user
app.post('/signOut', function (req, res) {
  console.log("Sign request received"); // log that it has been done sucessfully
  res.end();
});

// upgrade user to moderator
app.post('/upgrade', function (req, res) {
  console.log("Upgrade request received");
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({error:"database failure"});
    }
    db.get("UPDATE Users SET role = 'moderator' WHERE Users.email =?",[req.get('Authorization')], (e, row) => {
      if (e) {
        console.log(e.message);
        }
      if (row){
        console.log("Upgrade sucessfull")
        return
      }
      return res.status(404).json({error:"user not found"})
    });
  });
});

// approve or deny a submission
app.post('/approveDeny', function (req, res) {
  console.log("submission request received"); //log that it has been done sucessfully
  //use the id that is in json body, this use match db id
  res.end();
});


// update total carbon saved
app.get('/updateTotal', function (req, res) {
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
      console.log("Total update request received");
      if (e) {
        console.log(e.message);
        return res.status(500).json({error:"database failure"});
      }
      // check if user exists
      db.get("SELECT SUM(ActionLogs.calculated_co2e) AS total FROM ActionLogs JOIN Submissions ON ActionLogs.log_id = Submissions.linked_action_logs WHERE Submissions.status = 'approved'", (e, row) => {
        if (e) {
          console.log(e.message);
        }
        console.log("Total update sucessfull");
        return res.json({total: row.total + 0})
      });
  });
});

// update total carbon saved by individual
app.get('/updateTotalIndi', function (req, res) {
  console.log("Total individual update request recieved");
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({error:"database failure"});
    }
    // check if user exists
    db.get("SELECT SUM(ActionLogs.calculated_co2e) AS total FROM ActionLogs JOIN Submissions ON ActionLogs.log_id = Submissions.linked_action_logs JOIN Users ON Users.user_id = Submissions.user_id WHERE Submissions.status = 'approved'AND Users.email = ?",[req.get('Authorization')], (e, row) => {
      if (e) {
        console.log(e.message);
      }
      console.log("Individual total update sucessfull");
      return res.json({total: row.total + 0})
    });
  });
});

// get challenges
app.get('/updateChallengeList', function (req, res) {
  console.log("Challenge list update"); //log that it has been done sucessfully
  // res.json({title: ['challenge 1','challenge 2','challenge3'],date: ['monday','tuesday','wednsday']})// replace with a db query return title, date ending as values and matching array in db for currenct challenges only, email is in the authorisation header

  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, async (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({error: "database failure"});
    }

    db.all("SELECT title, start_date FROM Challenges", [], (e, rows) => {
      if (e) {
        console.log(e.message);
        return res.status(500).json({error: "database failure"});
      }

      if (!rows || rows.length === 0) {
        console.log("no challenges exist");
        return res.json({challenges: []});
      }

      const title = rows.map(r => r.title);
      const date = rows.map(r => r.start_date);
      return res.json({title, date});

    }); // closes db.all
  }); // closes const db
}); // closes app.get


//get missions
app.get('/updateMissionList', function (req, res) {
  console.log("Mission list update"); //log that it has been done sucessfully
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, async (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({error: "database failure"});
    }
    db.all("SELECT name FROM ActionTypes", [], (e, rows) => {
      if (e) {
        console.log(e.message);
        return res.status(500).json({error: "database failure"});
      }
      if (!rows || rows.length === 0) {
        console.log("no missions exist");
        return res.json({title : []});
      }
      if (rows) {
        const titles = rows.map(row => row.name);
        return res.json({title : titles});
      }
    });
  });
  // FRONT END ISSUE? - this is working on the front in the submit action form, but not on the dashboard
  // res.json({title: ['walk 1km','challenge 2','challenge3'],date: ['monday','tuesday','wednsday']})// replace with a db query return title, date ending as values and matching array in db for currenct missions only, email is in the authorisation ehader
});

//get groups
app.get('/updateGroupList', function (req, res) {
  console.log("Group list update"); //log that it has been done sucessfully

  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, async (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({error: "database failure"});
    }

    db.all("SELECT name FROM Groups", [], (e, rows) => {
      if (e) {
        console.log(e.message);
        return res.status(500).json({error: "database failure"});
      }

      if (!rows || rows.length === 0) {
        console.log("no groups exist");
        return res.json({groups: []});
      }

      const groups = rows.map(r => r.name);
      return res.json({groups});

    }); // closes db.all
  }); // closes const db
}); // closes app.get

//get submissions
app.get('/updateSubmissionsList', function (req, res) {
  console.log("Submissions list update"); //log that it has been done sucessfully
  res.json({title: ['one','two','three'], id: ['onesfsi09vhjdfi9vhjfi90vfi0vgh9','twofrijferihjre9ivhrihgerg9iheg9iegeh9i','threefijfrifjoivjdfivjdfi'], evidence: ['onesfsi09vhjdfi9vhjfi90vfi0vgh9','twofrijferihjre9ivhrihgerg9iheg9iegeh9i','threefijfrifjoivjdfivjdfi']})// replace with a db query, return title, id, evedenc => if none put null in place of it nsubmittor name and coresponding array from db
});

//get carbon
app.get('/getCarbon', function (req, res) {
  console.log("Retreived carbon stored"); //log that it has been done sucessfully
  res.json({val : 10})// replace with a db query, for total carbon saved by that person, email is in req.body.email
});

app.get('/checkPerm', function (req, res) {
  console.log("Checked user permissions"); //log that it has been done sucessfully
      const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
      if (e) {
        console.log(e.message);
        return res.status(500).json({error:"database failure"});
      }
      if (row){
        db.get("SELECT role FROM Users WHERE Users.email =?",[req.get('Authorization')], (e, row) => {
          if (e) {
            console.log(e.message);
          }
          return res.json({perm : row.role})
        });
      }
      return res.status(404).json({error:"user not found"})
  });
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
// login DONE
// signup check if exists sign up 401.DONE
// update user account to moderator DONE
// log when user logs out. DONE
// store data when person submits - dashutil. 
// return new total when page refreshed. DONE
// get challenges.
// get missions.
// getgroups.
// join group. DONE
// getcarbon, ie carbon saved from that action.
// get permissions. DONE
// individual carbon saved. DONE