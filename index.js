const express = require('express'); //imports express ie framework we are using
const session = require("express-session");
const cors = require("cors"); //imports the cors ie lets us actually sned data to github wihtout blocking it
const path = require('path');
const multer = require("multer");
const { OPEN_READWRITE } = require('sqlite3');
const sqlite3 = require('sqlite3').verbose();
const port = 8080; //specifys the port number
const bcrypt = require('bcryptjs'); //imports bcrypt for hashing
const { brotliDecompress } = require('zlib');
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(cors());
app.use(
  session({
    secret: "mySecretKey",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // Prevent client-side access to cookies
      sameSite: 'strict',
      // Mitigate CSRF attacks
      maxAge: 60000
    }
  })
);

// route to set session data
app.post("/setSession", (req,res) => {
  console.log("Checked user permissions"); //log that it has been done sucessfully
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    db.get("SELECT role FROM Users WHERE Users.email =?", [req.body.email], (e, row) => {
      if (e) {
        console.log(e.message);
        return res.status(500).json({ error: "database failure" });

      }
      if (row) {
        req.session.email = req.body.email;
        req.session.role = row.role;
        req.session.authenticated = true;
        res.send("Session data set");
        res.end();
      }
    });
  });
  
});

// route to retrieve session data
app.get("/getSession", (req,res) => {
  const email = req.session.email;
  const role = req.session.role;
  const authenticated = req.session.authenticated;
  return res.json({ email, role, authenticated });
});

// route to destroy session
app.post("/destroySession", (req,res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroy session: ", err);
      res.status(500).send("Error destroying session");
    } else {
      res.clearCookie("connect.sid");
      res.send("Session destroyed");
    }
  });
});

//for saving image to file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "public/uploads"));
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// get data from the login
app.post('/login', async (req, res) => {
  console.log("Login request received"); // log that it has been done sucessfully
  console.log(req.body.email);
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // check if user exists
    db.get("SELECT password, role FROM Users WHERE email = ?", [req.body.email], async (e, row) => {
      if (e) {
        console.log(e.message);
      }
      if (row) {
        const passwordMatches = await bcrypt.compare(req.body.password, row.password);
        console.log("user exists"); // log that user exists
        if (passwordMatches) {
          res.json({ type: row.role }); // if valid return role
          console.log("User sign in sucessful"); // log that user has been signed in
        } else {
          console.log("Incorrect password enterd");
          return res.status(401).json({ error: "Incorrect password, please try again" }); // return error
        }
      } else {
        console.log("user does not exist"); // log that user doesnt exist
        return res.status(401).json({ error: "No user with that email, please try again" });
      }
    })
  });
});

// get data from the sign up
app.post('/signUp', async (req, res) => {
  console.log("Sign up request received"); // log that it has been done sucessfully
  console.log(req.body.email);
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, async (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // check if username already in db
    db.get("SELECT email FROM Users WHERE email = ?", [req.body.email], async (e, row) => {
      if (e) {
        console.log(e.message);
      }
      if (row) {
        console.log("User with this email already exists");
        return res.status(401).json({ error: "There is an account already with this email" });
      } else {
        // create hash password
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        // create new user in db
        db.run("INSERT INTO Users (display_name, role, email, password) VALUES (?,'participant',?,?)", [req.body.name, req.body.email, hashedPassword], e => {
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
app.post('/addAction', upload.single('upload'), function (req, res) {
  console.log("Action request received"); // log that it has been done sucessfully

  let uploadedFilePath = null;
  if (req.file) {
    uploadedFilePath = `/uploads/${req.file.filename}`; // public path for frontend
    console.log("File saved to:", uploadedFilePath);
  }
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // generate current date
    const date = new Date().toISOString();
    // calculate co2 saved
    db.get("SELECT action_type_id, default_factor_id FROM ActionTypes WHERE name = ?", [req.body.mission], async (e, actionType) => {
      if (e) {
        console.log(e.message);
        return res.status(400).json({ error: "database error" });
      }
      if (!actionType) {
        return res.status(400).json({ error: "no action type found" });
      }
      if (actionType) {
        const type_id = actionType.action_type_id;
        const factor_id = actionType.default_factor_id;
        db.get("SELECT source, value FROM ConversionFactors WHERE factor_id = ?", [factor_id], async (e, factor) => {
          if (e || !factor) {
            console.log(e.message);
            return res.status(400).json({ error: "no conversion factor found" });
          }
          const evidencePath = uploadedFilePath || 'no file';
          if (factor) {
            const co2_saved = factor.value * req.body.quantity;
            const source_url = factor.source;
            // get relevant user id from email
            db.get("SELECT user_id FROM Users WHERE email = ?", [req.session.email], async (e, user) => {
              if (e || !user) {
                console.log(e.message);
                return res.status(400).json({ error: "no user found" });
              }

              if (user) {
                if (req.body.challenge === 'No') {
                  db.run("INSERT INTO ActionLogs (action_type_id, user_id, quantity, date, evidence, calculated_co2e) VALUES (?, ?, ?, ?, ?, ?)", [type_id, user.user_id, req.body.quantity, date, evidencePath, co2_saved], e => {
                    if (e) {
                      console.log(e.message);
                      return res.status(500).json({ error: "Failed to create action log" });
                    } else {
                      return res.json({ carbon: co2_saved, source: source_url }); // return the amount of carbon saved and conversion source
                    }
                  })
                } else {
                  db.run("INSERT INTO ActionLogs (action_type_id, user_id, quantity, date, evidence, calculated_co2e) VALUES (?, ?, ?, ?, ?, ?)", [type_id, user.user_id, req.body.quantity, date, evidencePath, co2_saved], function (e) {
                    if (e) {
                      console.log(e.message);
                      return res.status(500).json({ error: "Failed to create action log" });
                    } else {
                      const log_id = this.lastID;
                      db.get("SELECT challenge_id, evidence_required FROM Challenges WHERE title = ?", [req.body.challenge], async (e, challenge) => {
                        if (e || !challenge) {
                          console.log(e.message);
                          return res.status(400).json({ error: "no challenge found" });
                        } 
                        
                        if (challenge.evidence_required === true && evidencePath === 'no file'){
                          return res.status(400).json({ error: "This challenge requires evidence" });
                        }
                        else if (challenge) {
                          db.get("SELECT group_id FROM Groups WHERE name = ?", [req.body.group], async (e, group) => {
                            if (e || !group) {
                              console.log(e.message);
                              return res.status(400).json({ error: "no group found found" });
                            }
                            // get all submissions for this group submission -challenge and group
                            db.get("SELECT submission_id FROM Submissions WHERE challenge_id = ? AND group_id = ?", [challenge.challenge_id, group.group_id], async (e, submission) => {
                              // if no rows then find highest submission id and increment
                              if (e) {
                                console.log(e.message);
                                return res.status(400).json({ error: "database error" });
                              }
                              // if rows then save submission id
                              if (submission) {
                                db.run("INSERT INTO Submissions (submission_id, challenge_id, user_id, group_id, linked_action_log, points, status) VALUES (?, ?, ?, ?, ?, 0, 'Pending')", [submission.submission_id, challenge.challenge_id, user.user_id, group.group_id, log_id], e => {
                                  if (e) {
                                    console.log(e.message);
                                    return res.status(500).json({ error: "Failed to create submission" });
                                  } else {
                                    return res.json({ carbon: co2_saved, source: source_url }); // return the amount of carbon saved and conversion source
                                  }
                                })
                              } else {
                                db.get("SELECT MAX(submission_id) AS max_id FROM Submissions", [], async (e, row) => {
                                  if (e) {
                                    console.log(e.message);
                                    return res.status(400).json({ error: "no group found found" });
                                  }
                                  var sub_id;
                                  if (row) {
                                    sub_id = row.max_id + 1;
                                  } else {
                                    sub_id = 1;
                                  }
                                  db.run("INSERT INTO Submissions (submission_id, challenge_id, user_id, group_id, linked_action_log, points, status) VALUES (?, ?, ?, ?, ?, 0, 'Pending')", [sub_id, challenge.challenge_id, user.user_id, group.group_id, log_id], e => {
                                    if (e) {
                                      console.log(e.message);
                                      return res.status(500).json({ error: "Failed to create submission" });
                                    } else {
                                      return res.json({ carbon: co2_saved, source: source_url }); // return the amount of carbon saved and conversion source
                                    }
                                  })
                                })
                              }
                            })
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

// add user to a group
app.post('/addGroup', function (req, res) {
  console.log("Join request received");
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, async (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
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
        console.log("Group does not exist");
        return res.status(404).json({ error: "group does not exist" });
      }

      const group_id = row.group_id;

      db.get("SELECT user_id FROM Users WHERE email = ?", [req.session.email], async (e, userRow) => {
        if (e) {
          console.log(e.message);
          return;
        }

        if (!userRow) {
          console.log("user does not exist");
          return res.status(401).json({ error: "user does not exist" });
        }

        const user_id = userRow.user_id;

        db.get("SELECT 1 FROM ParticipantGroups WHERE group_id = ? AND user_id = ?", [group_id, user_id],
          (e, participantRow) => {
            if (e) {
              console.log(e.message);
              return;
            }

            if (participantRow) {
              console.log("User already in group");
              return res.status(409).json({ error: "User already in group" });
            }

            db.run("INSERT INTO ParticipantGroups (group_id, user_id) VALUES (?, ?)", [group_id, user_id], function (e) {
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


// upgrade user to moderator
app.post('/upgrade', function (req, res) {
  console.log("Upgrade request received");
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    db.get("UPDATE Users SET role = 'moderator' WHERE Users.email =?", [req.session.email], (e, row) => {
      if (e) {
        console.log(e.message);
      }
      if (row) {
        console.log("Upgrade sucessfull")
        return
      }
      return res.status(404).json({ error: "user not found" })
    });
  });
});

// approve or deny a submission
app.post('/approveDeny', function (req, res) {
  console.log("Approve deny request received"); //log that it has been done sucessfully
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    db.get("SELECT user_id FROM Users WHERE email = ?", [req.session.email], (e, row) => {
      if (e) {
        console.log(e.message);
      } else if (row) {
        const id = row.user_id
        const timestamp = new Date().toISOString();
        db.run("INSERT INTO ModerationDecisions (submission_id, moderator_id, decision, reason, timestamp)VALUES (?, ?, ?, ?, ?) ", [req.body.id, id, req.body.outcome, req.body.reason, timestamp], (e) => {
          if (e) {
            console.log(e.message);
          } else {
            console.log("Request added to db");
            if (req.body.outcome === 'approve') {
              db.get("SELECT scoring AS score FROM Challenges WHERE title = ? ", [req.body.challenge_name], (e, row) => {
                if (e) {
                  console.log(e.message);
                }
                console.log("Retreived points sucesfully");
                if (row){
                  db.run("UPDATE Submissions SET status = 'Approved', points = ? WHERE submission_id = ? ", [row.score, req.body.id], (e, row) => {
                    if (e) {
                      console.log(e.message);
                    }
                    console.log("Submission aprove sucessfull");
                    res.end();
                  });
                }
              });
            } else if (req.body.outcome === 'deny') {
              db.run("UPDATE Submissions SET status = 'Denied' WHERE submission_id = ? ", [req.body.id], (e, row) => {
                if (e) {
                  console.log(e.message);
                }
                console.log("Submission deny sucessfull");
                res.end();
              });
            }
          }
        });
      } else {
        return res.status(500).json({ error: "database failure" });
      }
    });
  });
});

// update total carbon saved
app.get('/updateTotal', function (req, res) {
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    console.log("Total update request received");
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // check if user exists
    db.get("SELECT SUM(ActionLogs.calculated_co2e) AS total FROM ActionLogs", (e, row) => {
      if (e) {
        console.log(e.message);
      }
      console.log("Total update sucessfull");
      return res.json({ total: row.total + 0 })
    });
  });
});

// update total carbon saved
app.get('/updatePoints', function (req, res) {
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    console.log("Total update request received");
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // check if user exists
    db.get("SELECT SUM(ActionLogs.calculated_co2e) AS total FROM ActionLogs", (e, row) => {
      if (e) {
        console.log(e.message);
      }
      console.log("Total update sucessfull");
      return res.json({ total: row.total + 0 })
    });
  });
});

// update total carbon saved by individual
app.get('/updateTotalIndi', function (req, res) {
  console.log("Total individual update request recieved");
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // check if user exists
    db.get("SELECT SUM(ActionLogs.calculated_co2e) AS total FROM ActionLogs JOIN Submissions ON ActionLogs.log_id = Submissions.linked_action_log JOIN Users ON Users.user_id = Submissions.user_id WHERE Users.email = ?", [req.session.email], (e, row) => {
      if (e) {
        console.log(e.message);
      }
      console.log("Individual total update sucessfull");
      return res.json({ total: row.total + 0 })
    });
  });
});

// update total carbon saved by individual
app.get('/updatePointsIndi', function (req, res) {
  console.log("Total individual update request recieved");
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // check if user exists
    db.get("SELECT SUM(Submissions.points) AS total FROM Submissions JOIN Users ON Users.user_id = Submissions.user_id WHERE Submissions.status = 'Approved'AND Users.email = ?", [req.session.email], (e, row) => {
      if (e) {
        console.log(e.message);
      }
      console.log("Individual points update sucessfull");
      return res.json({ total: row.total + 0 })
    });
  });
});

// update total carbon saved by group
app.get('/updateTotalGroup', function (req, res) {
  console.log("Total individual update request recieved");
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // check if user exists
    db.get("SELECT SUM(ActionLogs.calculated_co2e) AS total FROM ActionLogs JOIN Submissions ON ActionLogs.log_id = Submissions.linked_action_log JOIN Users ON Users.user_id = Submissions.user_id WHERE Users.email = ?", [req.session.email], (e, row) => {
      if (e) {
        console.log(e.message);
      }
      console.log("Individual total update sucessfull");
      return res.json({ total: row.total + 0 })
    });
  });
});

// update total carbon saved by group
app.get('/updatePointsGroup', function (req, res) {
  console.log("Total individual update request recieved");
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // check if user exists
    db.get("SELECT SUM(Submissions.points) AS total FROM Submissions JOIN Users ON Users.user_id = Submissions.user_id WHERE Submissions.status = 'Approved'AND Users.email = ?", [req.session.email], (e, row) => {
      if (e) {
        console.log(e.message);
      }
      console.log("Individual points update sucessfull");
      return res.json({ total: row.total + 0 })
    });
  });
});

// gets the total number of users
app.get('/getMembers', function (req, res) {
  console.log("Request for members");
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // check if user exists
    db.get("SELECT SUM(Submissions.points) AS total FROM Submissions JOIN Users ON Users.user_id = Submissions.user_id WHERE Submissions.status = 'Approved' AND Users.email = ?", [req.session.email], (e, row) => {
      if (e) {
        console.log(e.message);
      }
      console.log("Sucesful memebr update");
      return res.json({ total: row.total + 0 })
    });
  });
});


// get challenges
app.get('/updateChallengeList', function (req, res) {
  console.log("Challenge list update"); //log that it has been done sucessfully

  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, async (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }

    db.all("SELECT title, end_date, evidence_required FROM Challenges WHERE end_date > DATE('now')", [], (e, rows) => {
      if (e) {
        console.log(e.message);
        return res.status(500).json({ error: "database failure" });
      }

      if (!rows || rows.length === 0) {
        console.log("No challenges exist");
        return res.json({ challenges: [] });
      }

      const title = rows.map(r => r.title);
      const date = rows.map(r => r.end_date);
      const evidence = rows.map(r => r.evidence_required);
      return res.json({ title, date, evidence });

    }); // closes db.all
  }); // closes const db
}); // closes app.get


//get missions
app.get('/updateMissionList', function (req, res) {
  console.log("Mission list update"); //log that it has been done sucessfully
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, async (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    db.all("SELECT name FROM ActionTypes", [], (e, rows) => {
      if (e) {
        console.log(e.message);
        return res.status(500).json({ error: "database failure" });
      }
      if (!rows || rows.length === 0) {
        console.log("No missions exist");
        return res.json({ title: [] });
      }
      if (rows) {
        const titles = rows.map(row => row.name);
        return res.json({ title: titles });
      }
    });
  });
});

//get groups
app.get('/updateGroupList', function (req, res) {
  console.log("Group list update"); //log that it has been done sucessfully

  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, async (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }

    db.all("SELECT name FROM Groups", [], (e, rows) => {
      if (e) {
        console.log(e.message);
        return res.status(500).json({ error: "database failure" });
      }

      if (!rows || rows.length === 0) {
        console.log("No groups exist");
        return res.json({ groups: [] });
      }

      const groups = rows.map(r => r.name);
      return res.json({ groups });

    }); // closes db.all
  }); // closes const db
}); // closes app.get

app.get('/updateUserGroupsList', function (req, res) {
  console.log("User group list update"); //log that it has been done sucessfully

  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, async (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }

    db.all("SELECT Groups.name FROM Groups JOIN ParticipantGroups ON ParticipantGroups.group_id = Groups.group_id JOIN Users ON Users.user_id = ParticipantGroups.user_id WHERE Users.email =?", [req.session.email], (e, rows) => {
      if (e) {
        console.log(e.message);
        return res.status(500).json({ error: "database failure" });
      }

      if (!rows || rows.length === 0) {
        console.log("User is in no groups");
        return res.json({ groups: [] });
      }

      const groups = rows.map(r => r.name);
      return res.json({ groups });

    }); // closes db.all
  }); // closes const db
}); // closes app.get

//get submissions
app.get('/updateSubmissionsList', function (req, res) {
  console.log("Submissions list update"); //log that it has been done sucessfully
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, async (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }

    db.all("SELECT ActionTypes.name, Submissions.submission_id, ActionLogs.evidence, Challenges.title FROM ActionLogs JOIN ActionTypes ON ActionLogs.action_type_id = ActionTypes.action_type_id JOIN Submissions ON ActionLogs.log_id = Submissions.linked_action_log JOIN Challenges ON Challenges.challenge_id = Submissions.challenge_id WHERE Submissions.status = 'Pending' ", [], (e, rows) => { //AND Challenges.end_date < DATE('now')
      if (e) {
        console.log(e.message);
        return res.status(500).json({ error: "database failure" });
      }

      if (!rows || rows.length === 0) {
        console.log("No submissions exist");
        return res.json({ title: [], id: [], evidance: [] });
      }
      // ADD CHECK IF A FLAG HAS BEEN RAISED AND CHANGE RESPONSE
      const title = rows.map(r => r.name);
      const id = rows.map(r => r.submission_id);
      const evidence = rows.map(r => r.evidence);
      const challenge_title = rows.map(r => r.title);
      return res.json({ title, id, evidence, challenge_title, flag: 'hello this is a flag' });

    }); // closes db.all
  }); // closes const db
}); // closes app.get

//get log
app.get('/updateLog', function (req, res) {
  console.log("Submissions list update"); //log that it has been done sucessfully
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, async (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }

    db.all("SELECT ActionTypes.name, Submissions.submission_id, ActionLogs.evidence, Challenges.title FROM ActionLogs JOIN ActionTypes ON ActionLogs.action_type_id = ActionTypes.action_type_id JOIN Submissions ON ActionLogs.log_id = Submissions.linked_action_log JOIN Challenges ON Challenges.challenge_id = Submissions.challenge_id WHERE Submissions.status = 'Pending'", [], (e, rows) => {
      if (e) {
        console.log(e.message);
        return res.status(500).json({ error: "database failure" });
      }

      if (!rows || rows.length === 0) {
        console.log("No submissions exist");
        return res.json({ title: [], id: [], evidance: [] });
      }
      // ADD CHECK IF A FLAG HAS BEEN RAISED AND CHANGE RESPONSE
      const title = rows.map(r => r.name);
      const id = rows.map(r => r.submission_id);
      const evidence = rows.map(r => r.evidence);
      const challenge_title = rows.map(r => r.title);
      return res.json({ title, id, evidence, challenge_title, status: 'pending', reason: 'hello this is why it got approved or denied' });

    }); // closes db.all
  }); // closes const db
}); // closes app.get


//gets information for the table
app.get('/updateTableIndi', function (req, res) {
    return res.json({ date: ['10/20', '10/20', '20/20'], title : ['action', 'action', 'action'], co2 : [100,100,100], cat : ['food', 'food', 'food']});
});
app.get('/updateTableDate', function (req, res) {
    return res.json({ date: ['10/20', '10/20', '20/20'], title : ['action', 'action', 'action'], co2 : [0,0,0], cat : ['food', 'food', 'food']});
});
app.get('/updateTableType', function (req, res) {
    return res.json({ date: ['10/20', '10/20', '20/20'], title : ['action', 'action', 'action'], co2 : [10,10,10], cat : ['food', 'food', 'food']});
});
app.get('/updateTableDateIndi', function (req, res) {
    return res.json({ date: ['10/20', '10/20', '20/20'], title : ['action', 'action', 'action'], co2 : [0,0,0], cat : ['food', 'food', 'food']});
});
app.get('/updateTableTypeIndi', function (req, res) {
    return res.json({ date: ['10/20', '10/20', '20/20'], title : ['action', 'action', 'action'], co2 : [10,10,10], cat : ['food', 'food', 'food']});
});

app.get('/checkPerm', function (req, res) {
  console.log("Checked user permissions"); //log that it has been done sucessfully
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    db.get("SELECT role FROM Users WHERE Users.email =?", [req.session.email], (e, row) => {
      if (e) {
        console.log(e.message);
        return res.status(500).json({ error: "database failure" });

      }
      if (row) {
        return res.json({ perm: row.role })
      }
    });
  });
});

//get groups and points
app.get('/updateLeaderboard', function (req, res) {
  console.log("Group list update"); //log that it has been done sucessfully

  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, async (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }

    db.all("SELECT name FROM Groups", [], (e, rows) => {
      if (e) {
        console.log(e.message);
        return res.status(500).json({ error: "database failure" });
      }

      if (!rows || rows.length === 0) {
        console.log("No groups exist");
        return res.json({ groups: [] });
      }

      const name = rows.map(r => r.name);
      return res.json({ name });

    }); // closes db.all
  }); // closes const db
}); // closes app.get

// gets the total number of g of  c02 the person has saved
app.get('/updateTotalIndi', function (req, res) {
  console.log("Total co2e saved by user"); 
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // check if user exists
    db.get("SELECT SUM(ActionLogs.calculated_co2e) AS total FROM ActionLogs JOIN Users ON Users.user_id = ActionLogs.user_id WHERE Users.email = ?", [req.session.email], (e, row) => {
      if (e) {
        console.log(e.message);
      }
      return res.json({ total: row.total + 0 })
    });
  });
});

// gets the total number of points the individual has gained
app.get('/updatePointsIndi', function (req, res) { 
  console.log("Total points saved by user"); 
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // check if user exists
    db.get("SELECT SUM(Submissions.points) AS total FROM Submissions JOIN Users ON Users.user_id = Submissons.user_id WHERE Users.email = ?", [req.session.email], (e, row) => {
      if (e) {
        console.log(e.message);
      }
      return res.json({ total: row.total + 0 })
    });
  });
});

// gets the total amount of carbon the group had saved
app.get('/updateTotalGroup', function (req, res) {
  console.log("Total co2e saved by group"); 
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }

    // check if user exists
    db.get("SELECT SUM(ActionLogs.calculated_co2e) AS total FROM ActionLogs JOIN ParticipantGroups on ParticipantGroups.user_id = ActionLogs.user_id WHERE ParticipantGroups.group_id = (SELECT ParticipantGroups.group_id FROM ParticipantGroups JOIN Users ON Users.user_id = ParticipantGroups.user_id WHERE Users.email = ?)", [req.session.email], (e, row) => {
      if (e) {
        console.log(e.message);
      }
      return res.json({ total: row.total + 0 })
    });
  });
});

// gets the total amount of carbon the group had saved
app.get('/updatePointsGroup', function (req, res) {
  console.log("Total co2e saved by group"); 
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }

    // check if user exists
    db.get("SELECT SUM(Submissions.points) AS total FROM Submissions JOIN ParticipantGroups on ParticipantGroups.user_id = Submissions.user_id WHERE ParticipantGroups.group_id = (SELECT ParticipantGroups.group_id FROM ParticipantGroups JOIN Users ON Users.user_id = ParticipantGroups.user_id WHERE Users.email = ?)", [req.session.email], (e, row) => {
      if (e) {
        console.log(e.message);
      }
      return res.json({ total: row.total + 0 })
    });
  });
});

// gets the numbers of participants in the game
app.get('/getMembers', function (req, res) {
  console.log("All members of system");
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }

    db.get("SELECT COUNT(user_id) AS members FROM Users", (e, row) => {
      if (e) {
        console.log(e.message);
      }
      return res.json({ total: row.members + 0 })
    });
  });
});

// gets the total number of points gained
app.get('/updatePoints', function (req, res) {
  console.log("All points gained in system");
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }

    db.get("SELECT SUM(points) AS total FROM Submissions", (e, row) => {
      if (e) {
        console.log(e.message);
      }
      return res.json({ total: row.total + 0 })
    });
  });
});

// gets the total amount of carbon saved
app.get('/updateCarbon', function (req, res) {
  console.log("All carbon saved in system");
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }

    db.get("SELECT SUM(calculated_co2e) AS total FROM ActionLogs", (e, row) => {
      if (e) {
        console.log(e.message);
      }
      return res.json({ total: row.total + 0 })
    });
  });
});

// get individual user's carbon and the dates saved
app.get('/updateActionDatesIndi', function (req, res) {
  console.log("CO2 saved over time by user"); 
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // check if user exists
    db.all("SELECT date(ActionLogs.date) AS date, ActionLogs.calculated_co2e FROM ActionLogs JOIN Users ON Users.user_id = ActionLogs.user_id WHERE Users.email = ?", [req.session.email], (e, rows) => {
      if (e) {
        console.log(e.message);
      }

      return res.json(rows)
    });
  });
});

// get group's carbon and the dates saved
app.get('/updateActionDatesGroup', function (req, res) {
  console.log("CO2 saved over time by group"); 
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    db.all("SELECT date(ActionLogs.date) AS date, ActionLogs.calculated_co2e FROM ActionLogs JOIN ParticipantGroups ON ParticipantGroups.user_id = ActionLogs.user_id WHERE ParticipantGroups.group_id = (SELECT ParticipantGroups.group_id FROM ParticipantGroups JOIN Users ON Users.user_id = ParticipantGroups.user_id WHERE Users.email = ?)", [req.session.email], (e, rows) => {
      if (e) {
        console.log(e.message);
      }
    
      return res.json(rows)
    });
  });
});

// get individual user's carbon and the action type
app.get('/updateActionTypesIndi', function (req, res) {
  console.log("CO2 saved by action type by user"); 
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // check if user exists
    db.all("SELECT ActionTypes.category, ActionLogs.calculated_co2e FROM ActionLogs JOIN Users ON Users.user_id = ActionLogs.user_id JOIN ActionTypes ON ActionTypes.action_type_id = ActionLogs.action_type_id WHERE Users.email = ?", [req.session.email], (e, row) => {
      if (e) {
        console.log(e.message);
      }
      const category = rows.map(r => r.category);
      const carbon = rows.map(r => r.calculated_co2e)
      return res.json({ category, carbon })
    });
  });
});

// get groups's carbon and the action type
app.get('/updateActionTypesGroup', function (req, res) {
  console.log("CO2 saved by action type by group"); 
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // check if user exists
    db.all("SELECT ActionTypes.category, ActionLogs.calculated_co2e FROM ActionLogs JOIN ParticipantGroups ON ParticipantGroups.user_id = ActionLogs.user_id JOIN ActionTypes ON ActionTypes.action_type_id = ActionLogs.action_type_id WHERE ParticipantGroups.group_id = (SELECT ParticipantGroups.group_id FROM ParticipantGroups JOIN Users ON Users.user_id = ParticipantGroups.user_id WHERE Users.email = ?)", [req.session.email], (e, row) => {
      if (e) {
        console.log(e.message);
      }
      const category = rows.map(r => r.category);
      const carbon = rows.map(r => r.calculated_co2e);
      return res.json({ category, carbon });
    });
  });
});

app.get('/updateSubmissions', function (req, res) {
  console.log("All submissions and the date they were made"); 
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // check if user exists
    db.all("SELECT Submissions.submission_id, date(ActionLogs.date) AS date FROM Submissions JOIN ActionLogs ON ActionLogs.log_id = Submissions.linked_action_log", (e, rows) => {
      if (e) {
        console.log(e.message);
      }
      return res.json(rows);
    });
  });
});

app.get('/updatePointsDate', function (req, res) {
  console.log("All points gained over time"); 
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // check if user exists
    db.all("SELECT SUM(Submissions.points) AS total, date(ActionLogs.date) AS date FROM Submissions JOIN ActionLogs ON ActionLogs.log_id = Submissions.linked_action_log GROUP BY ActionLogs.date", (e, rows) => {
      if (e) {
        console.log(e.message);
      }
      return res.json(rows);
    });
  });
});

app.get('/updateGroupNumbers', function (req, res) {
  console.log("All groups and the users in the groups"); 
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // check if user exists
    db.all("SELECT Groups.name AS name, COUNT(ParticipantGroups.user_id) AS total FROM Groups JOIN ParticipantGroups ON ParticipantGroups.group_id = Groups.group_id GROUP BY Groups.name", (e, rows) => {
      if (e) {
        console.log(e.message);
      }
      return res.json(rows);
    });
  });
});

app.get('/getLeaderboard', function (req, res) {
  console.log("Number of points per group"); 
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    db.all("SELECT Groups.name AS name, SUM(Submissions.points) AS total FROM Groups JOIN Submissions ON Submissions.group_id = Groups.group_id GROUP BY Groups.name", (e, rows) => {
      if (e) {
        console.log(e.message);
      }
      return res.json(rows);
    });
  });
});

// app.get('/getApprovalTimes', function (req, res) {
//   console.log("Length of time between submission logged and approved/denied"); 
//   const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
//     if (e) {
//       console.log(e.message);
//       return res.status(500).json({ error: "database failure" });
//     }
//     db.all("SELECT date(ModerationDecisions.timestamp) AS decision, date(ActionLogs.date) AS submit FROM ActionLogs JOIN ModerationDecisions ON ModerationDecisions.submission_id = Submissions.submission_id JOIN Submissions ON Submissions.linked_action_logs = ActionLogs.log_id JOIN ModerationDecisions ON ModerationDecisions.timestamp = ActionLogs.date WHERE Users.role = ?", [req.session.email], (e, rows) => {
//       if (e) {
//         console.log(e.message);
//       }
//       return res.json(rows);
//     });
//   });
// });
// // moderation decisions timestamp vs action logs date -> SUBMISSIONS
//   // join based on linked action logs/log id
//   // where users.role = moderator

// Define a route for GET requests to the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

// delete user information
app.post("/delete", (req,res) => {
  console.log("Delete request received");
  console.log(req.session.email);
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // find user id
    db.get("SELECT user_id FROM Users WHERE email = ?", [req.session.email], async (e, user) => {
      if (e || !user) {
        console.log(e.message);
        return res.status(400).json({ error: "no user found" });
      }
      if (user) {
        const user_id = user.user_id;
        // delete pending decisions
        db.each("SELECT submission_id FROM Submissions WHERE user_id = ?", [user_id], (e, row) => {
          if (e) {
            console.log(e.message);
            return res.sendStatus(500);
          }
          db.run("DELETE FROM ModerationDecisions WHERE submission_id = ?", [row.submission_id], e => {
            if (e) {
              console.log(e.message);
              return res.sendStatus(500);
            }
          });
        });          
        // delete submissions
        db.run("DELETE FROM Submissions WHERE user_id = ?", [user_id], e => {
          if (e) {
            console.log(e.message);
            return res.sendStatus(500);
          }
        });
        // remove all evidence submitted
        const fs = require('fs');
        db.each("SELECT evidence FROM ActionLogs WHERE user_id = ?", [user_id], (e, row) => {
          if (e) {
            console.log(e.message);
            return res.sendStatus(500);
          }
          fs.unlink(row.evidence, (err) => {
            if (e) {
              console.log(e.message);
              return res.sendStatus(500);
            }
            console.log("File removed successfully");
          });
        });
        // delete action logs
        db.run("DELETE FROM ActionLogs WHERE user_id = ?", [user_id], e => {
          if (e) {
            console.log(e.message);
            return res.sendStatus(500);
          }
        });
        // delete row from ParticipantGroups
        db.run("DELETE FROM ParticipantGroups WHERE user_id = ?", [user_id], e => {
          if (e) {
            console.log(e.message);
            return res.sendStatus(500);
          }
        });
        // delete row from User
        db.run("DELETE FROM Users WHERE user_id = ?", [user_id], e => {
          if (e) {
            console.log(e.message);
            return res.sendStatus(500);
          }
        });
        res.sendStatus(200);
      }
    });
  })
})

// addChallenge
//TODO

// edit a challenge route
//TODO

// get a listo f all the challenges returnigneverything aboutt them ONLY CURRENT ONES
app.get('/updateModChallengeList', function (req, res) {
  //make sure year is y-m-d
    return res.json({ id : [1], name : ['challenge 1'], scope : ['Group'], rules: ['you must do this'], points: [100], start : ['2020-07-10'], end: ['2030-07-10'], evidence: [true]});
});

// delete a challenge given the challenge id
app.post('/deleteChallenge', function (req, res) {})


//add points to leaderbaord and orderby statement
// update updateLog to get user challenge submissions only
// update submissios list to check if a flag has been raised and return it
// add flagging route
// add updatetotalgroup and updatepointsgroup to do group not individual x
// updatepoints needs to be points i just copid from updatetotal x
// getMembers needs addiing body to it x
// 5 updateTable routes  needs correcting


//NEEDS TO BE AT THE BOTTOM
// Define a route for GET requests to the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

app.use(function (req, res, next) {
  res.status(404).sendFile('validation/404.html', { root: 'public' });
});
