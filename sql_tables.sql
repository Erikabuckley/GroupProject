
CREATE TABLE IF NOT EXISTS Groups (
    group_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Users (    
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Participants (
    user_id INTEGER PRIMARY KEY,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS ParticipantGroups (
    user_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, group_id),
    FOREIGN KEY (user_id) REFERENCES Participants(user_id),
    FOREIGN KEY (group_id) REFERENCES Groups(group_id)
);

CREATE TABLE IF NOT EXISTS Moderators (
    user_id INTEGER PRIMARY KEY,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS Maintainers (
    user_id INTEGER PRIMARY KEY,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS ConversionFactors (
    factor_id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL, 
    unit_in TEXT NOT NULL, 
    unit_out TEXT NOT NULL, 
    value INTEGER NOT NULL,
    notes TEXT NOT NULL,
    uncertainty INTEGER
);

CREATE TABLE IF NOT EXISTS ActionTypes (
    action_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    default_factor_id INTEGER NOT NULL,
    FOREIGN KEY (default_factor_id) REFERENCES ConversionFactors(factor_id)
);

CREATE TABLE IF NOT EXISTS ActionLogs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    date TEXT NOT NULL,
    evidence_required TEXT NOT NULL,
    calculated_co2e INTEGER NOT NULL,
    FOREIGN KEY (action_type_id) REFERENCES ActionTypes(action_type_id),
    FOREIGN KEY (user_id) REFERENCES Participants(user_id)
);

CREATE TABLE IF NOT EXISTS Challenges (
    challenge_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL, 
    scope TEXT NOT NULL, 
    rules TEXT NOT NULL, 
    scoring INTEGER NOT NULL, 
    start_date TEXT NOT NULL, 
    end_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Submissions (
    submission_id INTEGER NOT NULL,
    linked_action_log INTEGER NOT NULL,
    challenge_id INTEGER NOT NULL, 
    user_id INTEGER NOT NULL, 
    group_id INTEGER NOT NULL,
    points INTEGER NOT NULL,
    status TEXT NOT NULL,
    PRIMARY KEY (submission_id, linked_action_log),
    FOREIGN KEY (linked_action_log) REFERENCES ActionLogs(log_id),
    FOREIGN KEY (challenge_id) REFERENCES Challenges(challenge_id),
    FOREIGN KEY (user_id) REFERENCES Participants(user_id),
    FOREIGN KEY (group_id) REFERENCES Groups(group_id)
);

CREATE TABLE IF NOT EXISTS ModerationDecisions (
    decision_id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    moderator_id INTEGER NOT NULL, 
    decision TEXT NOT NULL, 
    reason TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (submission_id) REFERENCES Submissions(submission_id),
    FOREIGN KEY (moderator_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS AntiGamingFlags (
    flag_id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL, 
    flag_type TEXT NOT NULL,
    rule_triggered TEXT NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (submission_id) REFERENCES Submissions(submission_id)
);

