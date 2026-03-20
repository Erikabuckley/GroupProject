require('dotenv').config();
const { generateSitemap } = require("./sitemap");
const express = require('express'); //imports express ie framework we are using
const session = require("express-session");
const cors = require("cors"); //imports the cors ie lets us actually send data to github without blocking it
const path = require('path');
const multer = require("multer");
const sharp = require("sharp"); // image processing for file integrity
const phash = require('sharp-phash'); // image hashing for duplicate uploads
const distance = require('sharp-phash/distance'); // compares hashes for duplicate uploads
const { OPEN_READWRITE } = require('sqlite3');
const sqlite3 = require('sqlite3').verbose();
const port = 8080; //specify the port number
const bcrypt = require('bcryptjs'); //imports bcrypt for hashing
const fs = require('fs/promises');
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(cors());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // Prevent client-side access to cookies
      sameSite: 'strict',
      // Mitigate CSRF attacks
      maxAge: 10000 * 60 * 60
    }
  })
);
generateSitemap();

// route to set session data
app.post("/setSession", (req,res) => {
  console.log("Checked user permissions"); //log that it has been done successfully
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    db.get("SELECT role, display_name FROM Users WHERE Users.email =?", [req.body.email], (e, row) => {
      if (e) {
        console.log(e.message);
        return res.status(500).json({ error: "database failure" });

      } 
      if (row) {
        req.session.email = req.body.email;
        req.session.role = row.role;
        req.session.name = row.display_name;
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
  console.log("Login request received"); // log that it has been done successfully
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
          console.log("User sign in successful"); // log that user has been signed in
        } else {
          console.log("Incorrect password entered");
          return res.status(401).json({ error: "Incorrect password, please try again" }); // return error
        }
      } else {
        console.log("user does not exist"); // log that user doesn't exist
        return res.status(401).json({ error: "No user with that email, please try again" });
      }
    })
  });
});

// get data from the sign up
app.post('/signUp', async (req, res) => {
  console.log("Sign up request received"); // log that it has been done successfully
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

// ANTI GAMING FLAG FUNCTIONS
// FILE INTEGRITY FLAG
async function check_file(file_path) {
  try {
    // const fs = require("fs");
    // console.log("File exists in function:", fs.existsSync(file_path));
    await sharp(file_path).metadata();
    return true; // returns true for a valid image
  } catch (e) {
    console.log("File corrupted:", file_path);
    console.log(e.message);
    return false; // returns false for a corrupted image
  }
}

// DUPLICATE UPLOAD FLAG
// function to compare two hashes - false if found
async function compareImages(newImageHash, oldImageFullPath) {
  // read old image
  const oldImage = await fs.readFile(oldImageFullPath);
  // generate old image hash
  const oldImageHash = await phash(oldImage);
  // calculate hamming distance
  const hammingDistance = distance(newImageHash, oldImageHash);
  // determine originality
  if (hammingDistance <= 5) {
    // images are very similar (likely duplicates)
    return false; // returns false as likely not original
  } else {
    // images are different
    return true; // returns true as likely to be original
  }
}

// function to check originality of new image
async function check_originality(newImagePath) {
  // read new image
  const newImage = await fs.readFile(newImagePath);
  // generate new image hash
  const newImageHash = await phash(newImage);

  // read old images
  const dirPath = path.join(__dirname, 'public', 'uploads');
  const images = await fs.readdir(dirPath);
  for (const oldImagePath of images) {
    const oldImageFullPath = path.join(__dirname, 'public', 'uploads', oldImagePath);
    if (oldImageFullPath === newImagePath) {
      continue;
    }
    const original = await compareImages(newImageHash, oldImageFullPath);
    if (!original) {
      return false; // returns false if duplicate found
    }
  }
  return true; // returns true if original image
}

// get data from the  action
app.post('/addAction', upload.single('upload'), function (req, res) {
  console.log("Action request received");

  // Handle uploaded file
  let uploadedFilePath = null;
  if (req.file) {
    uploadedFilePath = `/uploads/${req.file.filename}`;
    console.log("File saved to:", uploadedFilePath);
  }

  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }

    const date = new Date().toISOString();

    // Get action type
    db.get(
      "SELECT action_type_id, default_factor_id FROM ActionTypes WHERE name = ?",
      [req.body.mission],
      async (e, actionType) => {
        if (e) {
          console.log(e.message);
          return res.status(400).json({ error: "database error" });
        }
        if (!actionType) return res.status(400).json({ error: "no action type found" });

        const type_id = actionType.action_type_id;
        const factor_id = actionType.default_factor_id;

        // Get conversion factor
        db.get(
          "SELECT source, value FROM ConversionFactors WHERE factor_id = ?",
          [factor_id],
          async (e, factor) => {
            if (e || !factor) {
              console.log(e?.message);
              return res.status(400).json({ error: "no conversion factor found" });
            }

            const evidencePath = uploadedFilePath;
            const co2_saved = factor.value * req.body.quantity;
            const source_url = factor.source;
            const value = factor.value;

            // Get user
            db.get(
              "SELECT user_id FROM Users WHERE email = ?",
              [req.session.email],
              async (e, user) => {
                if (e || !user) {
                  console.log(e?.message);
                  return res.status(400).json({ error: "no user found" });
                }

                // Insert into ActionLogs
                db.run(
                  "INSERT INTO ActionLogs (action_type_id, user_id, quantity, date, evidence, calculated_co2e) VALUES (?, ?, ?, ?, ?, ?)",
                  [type_id, user.user_id, req.body.quantity, date, evidencePath, co2_saved],
                  function (e) {
                    if (e) {
                      console.log(e.message);
                      return res.status(500).json({ error: "Failed to create action log" });
                    }

                    const log_id = this.lastID;

                    // If no challenge, return immediately
                    if (req.body.challenge === 'No') {
                      // Check if evidence provided when not required
                      if (evidencePath) {
                        // remove evidence
                        db.run("UPDATE ActionLogs SET evidence = NULL WHERE log_id =?", [log_id],(e, row) => {
                          if (e) {
                            console.log(e.message);
                            return res.status(500).json({ error: "database failure" });
                          }
                        });
                        try {
                          const evidenceFullPath =  path.join(__dirname, 'public', evidencePath);
                          fs.unlink(evidenceFullPath);
                          console.log("File removed successfully");
                        } catch (e) {
                          console.log(e.message);
                        }
                        return res.status(202).json({ carbon: co2_saved, source: source_url, value: value });
                      }else{
                        return res.json({ carbon: co2_saved, source: source_url, value: value });
                      }
                    }

                    // Get challenge info
                    db.get(
                      "SELECT challenge_id, scope, evidence_required FROM Challenges WHERE title = ?",
                      [req.body.challenge],
                      async (e, challenge) => {
                        if (e || !challenge) {
                          console.log(e?.message);
                          return res.status(400).json({ error: "no challenge found" });
                        }
                        const challengeEvidenceRequired = challenge.evidence_required;
                        // Check if evidence not provided when required
                        if (challengeEvidenceRequired && !evidencePath) {
                          return res.status(400).json({ error: "This challenge requires evidence" });
                        }

                        // if personal submitted for a group challenge - 403
                        if (challenge.scope === "Group" && req.body.group === "Individual challenge") {
                          return res.status(403).json({ error: "Insuffiecient group information for submission" })
                        }

                        let group_id;
                        // if group submitted for a personal challenge
                        if (challenge.scope === "Personal") {
                          group_id = null;
                        } else { // if actually a group challenge
                          // Get group info
                          db.get(
                            "SELECT group_id FROM Groups WHERE name = ?",
                            [req.body.group],
                            async (e, group) => {
                              if (e || !group) {
                                console.log(e?.message || "Group not found");
                                return res.status(400).json({ error: "no group found" });
                              }
                              group_id = group.group_id;
                          });
                        } 

                        // Insert into Submissions
                        db.run(
                          "INSERT INTO Submissions (challenge_id, user_id, group_id, linked_action_log, points, status) VALUES (?, ?, ?, ?, 0, 'Pending')",
                          [challenge.challenge_id, user.user_id, group_id, log_id],
                          async function (e) {
                            if (e) {
                              console.log(e.message);
                              return res.status(500).json({ error: "Failed to create submission" });
                            } else {
                              const id = this.lastID;
                              // ANTI GAMING FLAGS HERE
                              if (req.file) {
                                const uploadedFilePath = req.file.path;
                                // flag for file integrity
                                const isValid = await check_file(uploadedFilePath);
                                if (!isValid) { // if corrpted
                                  db.run("INSERT INTO AntiGamingFlags (submission_id, flag_type, rule_triggered) VALUES (?, 1, 'Rule 1: Corrupted File')", [id], e => {
                                    if (e) {
                                      console.log(e.message);
                                      return res.status(500).json({ error: "Failed to flag" });
                                    }
                                  })
                                }
                                // flag for duplicate uploads
                                const original = await check_originality(uploadedFilePath);
                                if (!original) { 
                                  db.run("INSERT INTO AntiGamingFlags (submission_id, flag_type, rule_triggered) VALUES (?, 2, 'Rule 2: Duplicate Upload')", [id], e => {
                                    if (e) {
                                      console.log(e.message);
                                      return res.status(500).json({ error: "Failed to flag" });
                                    }
                                  })
                                }
                              }
                              // flag for submission frequency
                              db.get("SELECT user_id FROM Users WHERE email = ?", [req.session.email], (e, row) => {
                                if (e) {
                                  console.log(e.message);
                                }
                                db.get("SELECT COUNT(*) AS total FROM Submissions JOIN ActionLogs ON ActionLogs.log_id = Submissions.linked_action_log WHERE Submissions.user_id = ? AND datetime(ActionLogs.date) >= datetime('now', '-30 seconds')", [row.user_id], (e, countRow) => {
                                  if (e) {
                                    console.log(e.message);
                                    return res.status(500).json({ error: "database failure" });
                                  }

                                  if (countRow.total >= 3) {
                                    db.run("INSERT INTO AntiGamingFlags (submission_id, flag_type, rule_triggered) VALUES (?, 3, 'Rule 3: Upload frequency')", [id], e => {
                                    if (e) {
                                      console.log(e.message);
                                      return res.status(500).json({ error: "Failed to flag" });
                                    }
                                    });
                                  }
                                });
                              });
                              // Check if evidence provided when not required
                              if (!challengeEvidenceRequired && evidencePath) {
                                // remove evidence
                                db.run("UPDATE ActionLogs SET evidence = NULL WHERE log_id =?", [log_id], (e, row) => {
                                  if (e) {
                                    console.log(e.message);
                                    return res.status(500).json({ error: "database failure" });
                                  }
                                });
                                try {
                                  const evidenceFullPath =  path.join(__dirname, 'public', evidencePath);
                                  await fs.unlink(evidenceFullPath);
                                  console.log("File removed successfully");
                                } catch (e) {
                                  console.log(e.message);
                                }
                                return res.status(202).json({ carbon: co2_saved, source: source_url, value: value });
                              }
                              return res.json({ carbon: co2_saved, source: source_url, value: value});
                            }
                        });
                    });
                });
            });
        });
    });
  });
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
        console.log("Upgrade successful")
        return
      }
      return res.status(404).json({ error: "user not found" })
    });
  });
});

// approve or deny a submission
app.post('/approveDeny', function (req, res) {
  console.log("Approve deny request received"); //log that it has been done successfully
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
            return res.status(500).json({ error: "database failure" });
          } else {
            console.log("Request added to db");
            if (req.body.outcome === 'approve') {
              db.get("SELECT challenge_id FROM Submissions WHERE submission_id = ? ", [req.body.id], (e, challenge) => {
                if (e) {
                  console.log(e.message);
                  return res.status(500).json({ error: "database failure" });
                } else{
                  db.get("SELECT scoring AS score FROM Challenges WHERE challenge_id = ? ", [challenge.challenge_id], (e, row) => {
                    if (e) {
                      console.log(e.message);
                      return res.status(500).json({ error: "database failure" });
                    }
                    console.log("Retrieved points sucesfully");
                    if (row){
                      db.run("UPDATE Submissions SET status = 'Approved', points = ? WHERE submission_id = ? ", [row.score, req.body.id], (e, row) => {
                        if (e) {
                          console.log(e.message);
                          return res.status(500).json({ error: "database failure" });
                        }
                        console.log("Submission approve successful");
                        res.end();
                      });
                    }
                  });
                }
              });
            } else if (req.body.outcome === 'deny') {
              // if sensitive info
              if (req.body.info === true) {
                // get file path
                db.get("SELECT evidence, log_id FROM ActionLogs JOIN Submissions ON Submissions.linked_action_log = ActionLogs.log_id WHERE Submissions.submission_id = ?", [req.body.id], async (e, row) => {
                  if (e) {
                    console.log(e.message);
                    return res.status(500).json({ error: "database failure" });
                  }
                  if (row) {
                    // delete file
                    try {
                      const evidenceFullPath =  path.join(__dirname, 'public', row.evidence);
                      await fs.unlink(evidenceFullPath);
                      console.log("File removed successfully");
                    } catch (e) {
                      console.log(e.message);
                    }
                    // set path to null
                    db.run("UPDATE ActionLogs SET evidence = NULL WHERE log_id =?", [row.log_id], (e) => {
                      if (e) {
                        console.log(e.message);
                        return res.status(500).json({ error: "database failure" });
                      }
                    });
                  }
                });
              } // closes if sensitive info block
              
              
              db.run("UPDATE Submissions SET status = 'Denied' WHERE submission_id = ? ", [req.body.id], (e, row) => {
                if (e) {
                  console.log(e.message);
                }
                console.log("Submission deny successful");
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
      console.log("Total update successful");
      return res.json({ total: row.total + 0 })
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
      console.log("Individual total update successful");
      return res.json({ total: row.total + 0 })
    });
  });
});

// update total carbon saved by individual
app.get('/updatePointsIndi', function (req, res) {
  console.log("Total individual update request received");
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
      console.log("Individual points update successful");
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

// get challenges
app.get('/updateChallengeList', function (req, res) {
  console.log("Challenge list update"); //log that it has been done successfully

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
  console.log("Mission list update"); //log that it has been done successfully
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
  console.log("Group list update"); //log that it has been done successfully

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
  console.log("User group list update"); //log that it has been done successfully

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
  console.log("Submissions list update"); //log that it has been done successfully
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, async (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }

    db.all("SELECT ActionTypes.name, Submissions.submission_id, ActionLogs.evidence, Challenges.title, Flags.flags FROM ActionLogs JOIN ActionTypes ON ActionLogs.action_type_id = ActionTypes.action_type_id JOIN Submissions ON ActionLogs.log_id = Submissions.linked_action_log JOIN Challenges ON Challenges.challenge_id = Submissions.challenge_id LEFT JOIN (SELECT submission_id, GROUP_CONCAT(rule_triggered, ', ') AS flags FROM AntiGamingFlags GROUP BY submission_id) AS Flags ON Flags.submission_id = Submissions.submission_id WHERE Submissions.status = 'Pending' ", [], (e, rows) => {
      if (e) {
        console.log(e.message);
        return res.status(500).json({ error: "database failure" });
      }

      if (!rows || rows.length === 0) {
        console.log("No submissions exist");
        return res.json({ title: [], id: [], evidence: [], challenge_title: [], flag: [] });
      }
      
      const title = rows.map(r => r.name);
      const id = rows.map(r => r.submission_id);
      const evidence = rows.map(r => r.evidence);
      const challenge_title = rows.map(r => r.title);
      const flag = rows.map(r => r.flags ? r.flags : "No automatic flags triggered");
      return res.json({ title, id, evidence, challenge_title, flag});
      

    }); // closes db.all
  }); // closes const db
}); // closes app.get

//get log
app.get('/updateLog', function (req, res) {
  console.log("Submissions list update"); //log that it has been done successfully
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, async (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // find user id
    db.get("SELECT user_id FROM Users WHERE email = ?", [req.session.email], async (e, user) => {
      if (e) {
          console.log("DB error:", e.message);
          return res.status(500).json({ error: "database error" });
      }
      if (!user) {
          console.log("No user found for email:", req.session.email);
          return res.status(400).json({ error: "no user found" });
      }
      if (user) {
        const user_id = user.user_id;
        db.all("SELECT ActionTypes.name, Submissions.submission_id, ActionLogs.evidence, Challenges.title, Submissions.status, ModerationDecisions.reason FROM Submissions LEFT JOIN ActionLogs ON Submissions.linked_action_log = ActionLogs.log_id JOIN ActionTypes ON ActionLogs.action_type_id = ActionTypes.action_type_id JOIN Challenges ON Challenges.challenge_id = Submissions.challenge_id LEFT JOIN ModerationDecisions ON ModerationDecisions.submission_id = Submissions.submission_id WHERE Submissions.user_id = ?", [user_id], (e, rows) => {
          if (e) {
            console.log(e.message);
            return res.status(500).json({ error: "database failure" });
          }

          if (!rows || rows.length === 0) {
            console.log("No submissions exist");
            return res.json({title : [], id: [], evidence: [], challenge_title: [], status: [], reason:[] });
          }
          // ADD CHECK IF A FLAG HAS BEEN RAISED AND CHANGE RESPONSE
          const title = rows.map(r => r.name);
          const id = rows.map(r => r.submission_id);
          const evidence = rows.map(r => r.evidence);
          const challenge_title = rows.map(r => r.title);
          const status = rows.map(r => r.status);
          const reason = rows.map(r => r.reason);
          return res.json({ title, id, evidence, challenge_title, status, reason });

        }); // closes db.all
      }
    });

    
  }); // closes const db
}); // closes app.get


//gets information for the table
app.get('/updateTableIndi', function (req, res) {
  const type = req.query.type;
  if (type === 'date'){
    // odored by date
    const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
      if (e) {
        console.log(e.message);
        return res.status(500).json({ error: "database failure" });
      }
      db.all("SELECT date(ActionLogs.date) AS date, ActionTypes.name AS name, ActionLogs.calculated_co2e AS carbon, ActionTypes.category AS types FROM ActionLogs JOIN Users ON Users.user_id = ActionLogs.user_id JOIN ActionTypes ON ActionTypes.action_type_id = ActionLogs.action_type_id WHERE Users.email=? ORDER BY date(ActionLogs.date)", [req.session.email], (e,rows) => {
        if (e) {
          console.log(e.message);
          return res.status(500).json({ error: "database failure" });
        }
        const date = rows.map(r => r.date);
        const title = rows.map(r => r.name);
        const co2 = rows.map(r => r.carbon);
        const cat = rows.map(r => r.types);
        
        return res.json({ date, title, co2, cat });
      });
    });
  } else if (type === 'type'){

    const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
      if (e) {
        console.log(e.message);
        return res.status(500).json({ error: "database failure" });
      }
      db.all("SELECT date(ActionLogs.date) AS date, ActionTypes.name AS name, ActionLogs.calculated_co2e AS carbon, ActionTypes.category AS types FROM ActionLogs JOIN Users ON Users.user_id = ActionLogs.user_id JOIN ActionTypes ON ActionTypes.action_type_id = ActionLogs.action_type_id WHERE Users.email=? ORDER BY types", [req.session.email], (e,rows) => {
        if (e) {
          console.log(e.message);
          return res.status(500).json({ error: "database failure" });
        }
        const date = rows.map(r => r.date);
        const title = rows.map(r => r.name);
        const co2 = rows.map(r => r.carbon);
        const cat = rows.map(r => r.types);
        
        return res.json({ date, title, co2, cat });
      });
    });
  }
});

app.get('/updateTableGroup', function (req, res) {
  const type = req.query.type;
  if (type === 'indi'){

    const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
      if (e) {
        console.log(e.message);
        return res.status(500).json({ error: "database failure" });
      }
      db.all("SELECT ParticipantGroups.group_id AS group_id, date(ActionLogs.date) AS date, ActionTypes.name AS name, ActionLogs.calculated_co2e AS carbon, ActionTypes.category AS types, ParticipantGroups.user_id AS user FROM ActionLogs JOIN Users ON Users.user_id = ActionLogs.user_id JOIN ParticipantGroups ON ParticipantGroups.user_id = ActionLogs.user_id JOIN ActionTypes ON ActionTypes.action_type_id = ActionLogs.action_type_id WHERE Users.email=?", [req.session.email], (e,rows) => {
        if (e) {
          console.log(e.message);
          return res.status(500).json({ error: "database failure" });
        }
        const id = rows.map(r => r.group_id);
        const date = rows.map(r => r.date);
        const title = rows.map(r => r.name);
        const co2 = rows.map(r => r.carbon);
        const cat = rows.map(r => r.types);
        // const userId = rows.map(r => r.user);
        const userId = rows.length > 0 ? rows[0].user : null;
        
        return res.json({ id, date, title, co2, cat, userId });
      });
    });
    // all does not matter about order but the ids too
    // return res.json({id: [1,2,3], date: ['2020-01-01', '2020-01-01', '2020-01-01'], title : ['action', 'action', 'action'], co2 : [100,100,100], cat : ['food', 'food', 'food'], userId :1});
  } else if(type === 'date'){
    // odored by date

    const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
      if (e) {
        console.log(e.message);
        return res.status(500).json({ error: "database failure" });
      }
      db.all("SELECT date(ActionLogs.date) AS date, ActionTypes.name AS name, ActionLogs.calculated_co2e AS carbon, ActionTypes.category AS types FROM ActionLogs JOIN ActionTypes ON ActionTypes.action_type_id = ActionLogs.action_type_id JOIN ParticipantGroups ON ParticipantGroups.user_id = ActionLogs.user_id WHERE ParticipantGroups.group_id = (SELECT ParticipantGroups.group_id FROM ParticipantGroups JOIN Users ON Users.user_id = ParticipantGroups.user_id WHERE Users.email = ?) ORDER BY date(ActionLogs.date)", [req.session.email], (e,rows) => {
        if (e) {
          console.log(e.message);
          return res.status(500).json({ error: "database failure" });
        }
        const date = rows.map(r => r.date);
        const title = rows.map(r => r.name);
        const co2 = rows.map(r => r.carbon);
        const cat = rows.map(r => r.types);
        
        return res.json({ date, title, co2, cat });
      });
    });
    // return res.json({date: ['2020-01-01', '2020-01-01', '2020-01-01'], title : ['action', 'action', 'action'], co2 : [0,0,0], cat : ['food', 'food', 'food']});
  }else if (type === 'type'){

    const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
      if (e) {
        console.log(e.message);
        return res.status(500).json({ error: "database failure" });
      }
      db.all("SELECT date(ActionLogs.date) AS date, ActionTypes.name AS name, ActionLogs.calculated_co2e AS carbon, ActionTypes.category AS types FROM ActionLogs JOIN ActionTypes ON ActionTypes.action_type_id = ActionLogs.action_type_id JOIN ParticipantGroups ON ParticipantGroups.user_id = ActionLogs.user_id WHERE ParticipantGroups.group_id = (SELECT ParticipantGroups.group_id FROM ParticipantGroups JOIN Users ON Users.user_id = ParticipantGroups.user_id WHERE Users.email=?) ORDER BY types", [req.session.email], (e,rows) => {
        if (e) {
          console.log(e.message);
          return res.status(500).json({ error: "database failure" });
        }
        const date = rows.map(r => r.date);
        const title = rows.map(r => r.name);
        const co2 = rows.map(r => r.carbon);
        const cat = rows.map(r => r.types);
        
        return res.json({ date, title, co2, cat });
      });
    });
    // ordered by type
    // return res.json({date: ['2020-01-01', '2020-01-01', '2020-01-01'], title : ['action', 'action', 'action'], co2 : [10,10,10], cat : ['food', 'food', 'food']});
  }
});

app.get('/checkPerm', function (req, res) {
  console.log("Checked user permissions"); //log that it has been done successfully
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
    db.all("SELECT date(ActionLogs.date) AS date, SUM(ActionLogs.calculated_co2e) AS calculated_co2e FROM ActionLogs JOIN Users ON Users.user_id = ActionLogs.user_id WHERE Users.email = ? GROUP BY date(ActionLogs.date) ORDER BY date(ActionLogs.date)", [req.session.email], (e, rows) => {
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
    db.all("SELECT date(ActionLogs.date) AS date, SUM(ActionLogs.calculated_co2e) AS calculated_co2e FROM ActionLogs JOIN ParticipantGroups ON ParticipantGroups.user_id = ActionLogs.user_id WHERE ParticipantGroups.group_id = (SELECT ParticipantGroups.group_id FROM ParticipantGroups JOIN Users ON Users.user_id = ParticipantGroups.user_id WHERE Users.email = ?) GROUP BY date(ActionLogs.date) ORDER BY date(ActionLogs.date)", [req.session.email], (e, rows) => {
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
    db.all("SELECT ActionTypes.category, ActionLogs.calculated_co2e FROM ActionLogs JOIN Users ON Users.user_id = ActionLogs.user_id JOIN ActionTypes ON ActionTypes.action_type_id = ActionLogs.action_type_id WHERE Users.email = ? GROUP BY ActionTypes.category", [req.session.email], (e, rows) => {
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
    db.all("SELECT ActionTypes.category, ActionLogs.calculated_co2e FROM ActionLogs JOIN ParticipantGroups ON ParticipantGroups.user_id = ActionLogs.user_id JOIN ActionTypes ON ActionTypes.action_type_id = ActionLogs.action_type_id WHERE ParticipantGroups.group_id = (SELECT ParticipantGroups.group_id FROM ParticipantGroups JOIN Users ON Users.user_id = ParticipantGroups.user_id WHERE Users.email = ?) GROUP BY ActionTypes.category", [req.session.email], (e, rows) => {
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

app.get('/updatePointsDateIndi', function (req, res) {
  console.log("Points gained over time by individual user"); 
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // check if user exists
    db.all("SELECT SUM(Submissions.points) AS total, date(ActionLogs.date) AS date FROM Submissions JOIN ActionLogs ON ActionLogs.log_id = Submissions.linked_action_log JOIN Users ON Users.user_id = ActionLogs.user_id WHERE Users.email = ? GROUP BY ActionLogs.date", [req.session.email], (e, rows) => {
      if (e) {
        console.log(e.message);
      }
      return res.json(rows);
    });
  });
});

app.get('/updatePointsDateGroup', function (req, res) {
  console.log("Points gained over time by group"); 
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // check if user exists
    db.all("SELECT SUM(Submissions.points) AS total, date(ActionLogs.date) AS date FROM Submissions JOIN ActionLogs ON ActionLogs.log_id = Submissions.linked_action_log JOIN ParticipantGroups ON  ParticipantGroups.user_id = ActionLogs.user_id WHERE ParticipantGroups.group_id = (SELECT ParticipantGroups.group_id FROM ParticipantGroups JOIN Users ON Users.user_id = ParticipantGroups.user_id WHERE Users.email = ?) GROUP BY date(ActionLogs.date) ORDER BY date(ActionLogs.date)", [req.session.email], (e, rows) => {
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

app.get('/updateLeaderboard', function (req, res) {
  console.log("Number of points per group"); 
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    db.all("SELECT Groups.name AS name, SUM(Submissions.points) AS total FROM Groups LEFT JOIN Submissions ON Submissions.group_id = Groups.group_id ORDER BY total", (e, rows) => {
      if (e) {
        console.log(e.message);
        return res.status(500).json({ error: "database failure" });
      }
      
      if (!rows || rows.length === 0) {
        console.log("No groups exist");
        return res.json({ name: [], total : []});
      }

      // replace null totals with 0
      rows.forEach(r => {
        if (r.total === null) r.total = 0;
      });
      const names = rows.map(r => r.name);
      const totals = rows.map(r => r.total);
      res.json({ name: names, total: totals });
    });
  });
});

app.get('/updateSubmissionsCount', function (req, res) {
  console.log("Total number of submissions"); 
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // check if user exists
    db.all("SELECT COUNT(submission_id)FROM Submissions", (e, rows) => {
      if (e) {
        console.log(e.message);
      }
      return res.json(rows);
    });
  });
});

app.get('/updateActionsCount', function (req, res) {
  console.log("Total number of submissions"); 
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // check if user exists
    db.all("SELECT COUNT(log_id) as total FROM ActionLogs", (e, rows) => {
      if (e) {
        console.log(e.message);
      }
      return res.json(rows);
    });
  });
});

app.get('/getApprovalTimes', function (req, res) {
  console.log("Length of time between submission logged and approved/denied"); 
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    db.all("SELECT (julianday(ModerationDecisions.timestamp) - julianday(ActionLogs.date)) AS decision_time FROM ActionLogs JOIN Submissions ON Submissions.linked_action_log = ActionLogs.log_id JOIN ModerationDecisions ON ModerationDecisions.submission_id = Submissions.submission_id ORDER BY decision_time ASC", (e, rows) => {
      if (e) {
        console.log(e.message);
      }
      return res.json(rows);
    });
  });
});
// moderation decisions timestamp vs action logs date -> SUBMISSIONS
  // join based on linked action logs/log id
  // where users.role = moderator

app.get('/checkGroup', function (req, res) {
  console.log("Check whether user is part of a group");
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    db.get("SELECT group_id FROM ParticipantGroups JOIN Users ON Users.user_id = ParticipantGroups.user_id WHERE Users.email = ?", [req.session.email], (e, row) => {
      if (e) {
        console.log(e.message);
      }
      return res.json({ inGroup: !!row });
    });
  });
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
        console.log(e?.message);
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
        // const fs = require('fs');
        db.each("SELECT evidence FROM ActionLogs WHERE user_id = ?", [user_id], async (e, row) => {
          if (e) {
            console.log(e.message);
            return;
          }if (row.evidence) {
            try {
              const evidenceFullPath =  path.join(__dirname, 'public', row.evidence);
              await fs.unlink(evidenceFullPath);
              console.log("File removed successfully");
            } catch (e) {
              console.log(e.message);
            }
          }
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
        return res.json({ message: "Account deleted" });
      }
    });
  })
})

// addChallenge
app.post('/addChallenge', function (req, res) {
  console.log("New challenge request received");
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    db.run("INSERT INTO Challenges (title, scope, rules, scoring, start_date, end_date, evidence_required) VALUES (?,?,?,?,?,?,?)", [req.body.name, req.body.scope, req.body.rules, req.body.points, req.body.start, req.body.end, req.body.selectedValue], e => {
      db.close();
      if (e) {
        console.log(e.message);
        return res.status(500).json({ error: "Failed to create challenge" });
      } else {
        console.log('Challenge added sucessfully')
        return res.status(201).json({ message: "Challenge created" });
      }
    });
  });
});

// edit a challenge route
app.post('/editChallenge', function (req, res) {
  console.log("Edit challenge request received");
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    db.run("UPDATE Challenges SET title = ?, scope = ?, rules = ?, scoring = ?, start_date = ?, end_date = ?, evidence_required = ? WHERE challenge_id = ?", [req.body.name, req.body.scope, req.body.rules, req.body.points, req.body.start, req.body.end, req.body.selectedValue, req.body.id], e => {
      db.close();
      if (e) {
        console.log(e.message);
        return res.status(500).json({ error: "Failed to update challenge" });
      } else {
        console.log('Challenge updated sucessfully')
        return res.status(201).json({ message: "Challenge updated" });
      }
    });
  });
});

// get a list of all the challenges returning everything about them - ONLY CURRENT/ future ONES
app.get('/updateModChallengeList', function (req, res) {
  console.log("Update challenge list - mod page request received");
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    db.all("SELECT * FROM Challenges WHERE end_date > DATE('now')", [], (e, rows) => {
      db.close();
      if (e) {
        console.log(e.message);
        return res.status(500).json({ error: "database failure" });
      }
      if (!rows || rows.length === 0) {
        console.log("No challenges exist");
        return res.json({ challenges: [] });
      }
      const id = rows.map(r => r.challenge_id);
      const name = rows.map(r => r.title);
      const scope = rows.map(r => r.scope);
      const rules = rows.map(r => r.rules);
      const points = rows.map(r => r.scoring);
      const start = rows.map(r => r.start_date);
      const end = rows.map(r => r.end_date);
      const evidence = rows.map(r => r.evidence_required);
      return res.json({ id, name, scope, rules, points, start, end, evidence});
    });
  });
});

// delete a challenge given the challenge id
// including submissions and decisions not actions or evidence
app.post('/deleteChallenge', function (req, res) {
  console.log("Delete challenge request received");
  const db = new sqlite3.Database('CarbonChallenge.db', OPEN_READWRITE, (e) => {
    if (e) {
      console.log(e.message);
      return res.status(500).json({ error: "database failure" });
    }
    // delete decisions
    db.each("SELECT submission_id FROM Submissions WHERE challenge_id = ?", [req.body.id], (e, row) => {
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
    db.run("DELETE FROM Submissions WHERE challenge_id = ?", [req.body.id], e => {
      if (e) {
        console.log(e.message);
        return res.sendStatus(500);
      }
    });
    // delete challenges
    db.run("DELETE FROM Challenges WHERE challenge_id = ?", [req.body.id], e => {
      if (e) {
        console.log(e.message);
        return res.sendStatus(500);
      }
    });
    return res.json({ message: "Challenge deleted" });
  });
});

app.get('/getName', function (req, res) {
 return res.json({ dis_name: req.session.name });
});

app.get('/getBadges', function (req, res) {
 return res.json({ vals: [true, true, false, false, true, true]});
});

//add points to leaderboard and orderby statement
// update updateLog to get user challenge submissions only
// update submissions list to check if a flag has been raised and return it
// add flagging route
// add updatetotalgroup and updatepointsgroup to do group not individual x
// updatepoints needs to be points i just copied from updatetotal x
// getMembers needs adding body to it x
// 5 updateTable routes  needs correcting


//NEEDS TO BE AT THE BOTTOM
// Define a route for GET requests to the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
}

module.exports = app;

app.use(function (req, res, next) {
  res.status(404).sendFile('validation/404.html', { root: 'public' });
});
