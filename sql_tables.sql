
CREATE TABLE IF NOT EXISTS Groups (
    group_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Users (    
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Participant (
    user_id INTEGER PRIMARY KEY,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS ParticipantGroup (
    user_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, group_id),
    FOREIGN KEY (user_id) REFERENCES Participant(user_id),
    FOREIGN KEY (group_id) REFERENCES Groups(group_id)
);

CREATE TABLE IF NOT EXISTS Moderator (
    user_id INTEGER PRIMARY KEY,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS Maintainer (
    user_id INTEGER PRIMARY KEY,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS ConversionFactor (
    factor_id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL, 
    unit_in TEXT NOT NULL, 
    unit_out TEXT NOT NULL, 
    value INTEGER NOT NULL,
    notes TEXT NOT NULL,
    uncertainty INTEGER
);

CREATE TABLE IF NOT EXISTS ActionType (
    action_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    default_factor_id INTEGER NOT NULL,
    FOREIGN KEY (default_factor_id) REFERENCES ConversionFactor(factor_id)
);

CREATE TABLE IF NOT EXISTS ActionLog (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    date TEXT NOT NULL,
    evidence_required TEXT NOT NULL,
    calculated_co2e INTEGER NOT NULL,
    confidence TEXT NOT NULL,
    FOREIGN KEY (action_type_id) REFERENCES ActionType(action_type_id),
    FOREIGN KEY (user_id) REFERENCES Participant(user_id)
);

CREATE TABLE IF NOT EXISTS Challenge (
    challenge_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL, 
    scope TEXT NOT NULL, 
    rules TEXT NOT NULL, 
    scoring TEXT NOT NULL, 
    start_date TEXT NOT NULL, 
    end_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Submission (
    submission_id INTEGER PRIMARY KEY AUTOINCREMENT, 
    challenge_id INTEGER NOT NULL, 
    user_id INTEGER NOT NULL, 
    linked_action_logs TEXT NOT NULL,
    points INTEGER NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (challenge_id) REFERENCES Challenge(challenge_id)
);

CREATE TABLE IF NOT EXISTS ModerationDecision (
    decision_id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    moderator_id INTEGER NOT NULL, 
    decision TEXT NOT NULL, 
    reason TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (submission_id) REFERENCES Submission(submission_id),
    FOREIGN KEY (moderator_id) REFERENCES User(user_id)
);

CREATE TABLE IF NOT EXISTS AntiGamingFlag (
    flag_id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL, 
    flag_type TEXT NOT NULL,
    rule_triggered TEXT NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (submission_id) REFERENCES Submission(submission_id)
);

