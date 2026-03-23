import sqlite3
import random
import bcrypt
from datetime import timedelta, datetime, timezone

# Connect to database
con = sqlite3.connect("CarbonChallenge.db")
cursor = con.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
print("Tables:", cursor.fetchall())

# ensure the database tables are empty before populating them
cursor.execute("DELETE FROM Users")
cursor.execute("DELETE FROM Groups")
cursor.execute("DELETE FROM Challenges")
cursor.execute("DELETE FROM ActionLogs")
cursor.execute("DELETE FROM ParticipantGroups")
cursor.execute("DELETE FROM Submissions")
cursor.execute("DELETE FROM ModerationDecisions")
cursor.execute("DELETE FROM AntiGamingFlags")

# reset ids
cursor.execute("DELETE FROM sqlite_sequence")

# insert users into db

def populate_users(cursor):
    
    participants = []
    moderators = []
    for i in range(1, 61):
        display_name = f"user_{i}"
        role = "participant"
        email = f"user{i}@exeter.ac.uk"
        # create basic password
        plain_password = f"user{i}123"
        # create hashed password and decode to string
        hashed_password =  bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8')

        participants.append((display_name, role, email, hashed_password))

    for i in range(1, 6):
        display_name = f"moderator{i}"
        role = "moderator"
        email = f"moderator{i}@exeter.ac.uk"
        # create basic password
        plain_password = f"moderator{i}123"
        # create hashed password and decode to string
        hashed_password =  bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8')

        moderators.append((display_name, role, email, hashed_password))


    cursor.executemany(
        """ 
        INSERT INTO Users (display_name, role, email, password)
        VALUES (?, ?, ?, ?)
        """,
        participants
    )
    cursor.executemany(
        """ 
        INSERT INTO Users (display_name, role, email, password)
        VALUES (?, ?, ?, ?)
        """,
        moderators
    )

def seed_users():
    users = [
        ('Test user', 'user', 'user@exeter.ac.uk', 'user123'),
        ('Test moderator', 'moderator', 'moderator@exeter.ac.uk', 'moderator123'),
    ]

    for display_name, role, email, plain_password in users:
        # Hash password and decode to string
        hashed_password = bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8')
        cursor.execute(
            "INSERT INTO Users (display_name, role, email, password) VALUES (?,?,?,?)",
            (display_name, role, email, hashed_password)
        )
    print("Seeded users successfully!")


# insert groups into db

def populate_groups(cursor):
    groups = ["Lafrowda", "East Park", "Birks", "Rowe House", "Duryard", "St David's", "Point Exe", "Mardon Hall", "Lopes Hall", "Nash Grove", "Staff"]

    for name in groups: 
        cursor.execute(
            """ 
            INSERT INTO Groups (name)
            VALUES (?)
            """,
            (name,)
        )


today = datetime.now(timezone.utc)

start_date = (today - timedelta(days=365)).replace(
    hour=0, minute=0, second=0, microsecond=0
).isoformat(timespec="milliseconds").replace('+00:00','Z')

end_date = (today + timedelta(days=365)).replace(
    hour=0, minute=0, second=0, microsecond=0
).isoformat(timespec="milliseconds").replace('+00:00','Z')

# insert challenges into db


def populate_challenges(cursor):
    challenges_info = [
        {
            "title": "Litter picking",
            "scope": "Personal",
            "rules": "Pick up ten pieces of litter in a day",
            "scoring": 5
        },
        {
            "title": "Make a journey by foot",
            "scope": "Personal",
            "rules": "Switch a journey made by a vehicle to one by foot",
            "scoring": 5
        },
        {
            "title": "Take public transport",
            "scope": "Personal",
            "rules": "Make a singular journey by public transport",
            "scoring": 5
        },
        {
            "title": "Vegetarian for 5 days",
            "scope": "Personal",
            "rules": "Eat 5 vegetarian meals in a week",
            "scoring": 10
        },
        {
            "title": "Vegan for 3 days",
            "scope": "Personal",
            "rules": "Eat 3 vegan meals in a week",
            "scoring": 10
        },
        {
            "title": "100km cycle",
            "scope": "Group",
            "rules": "Complete a 100km cycle between the group over 1 month",
            "scoring": 30
        },
        {
            "title": "Saving CO2",
            "scope": "Group",
            "rules": "Save 500kg CO2 between the group in a month",
            "scoring": 40
        },
        {
            "title": "Recycle",
            "scope": "Personal",
            "rules": "Take 50kg of recycling to a recycling point",
            "scoring": 30
        }
    ]

    challenges = []

    for c in challenges_info:
        challenges.append((c["title"], c["scope"], c["rules"],
                          c["scoring"], start_date, end_date,'yes'))

    cursor.executemany(
        """
        INSERT INTO Challenges (title, scope, rules, scoring, start_date, end_date, evidence_required)
        VALUES (?, ?, ?, ?, ?, ?,?)
        """,
        challenges
    )

# insert action logs into db

def populate_action_conversion_factors(cursor):
    cursor.execute("DELETE FROM ConversionFactors")
    cursor.execute("DELETE FROM ActionTypes")
    cursor.execute("INSERT INTO ConversionFactors (factor_id, source, unit_in, unit_out, value, notes) VALUES (101, 'https://www.carbonindependent.org/17.html', 'km', 'g', 280, 'empty'), (102, 'https://www.sciencedirect.com/science/article/pii/S0921344915301245', 'bottles', 'g', 19, 'empty'), (103, 'https://www.carbonindependent.org/20.html', 'miles', 'g', 180, 'empty'), (104, 'https://link.springer.com/article/10.1007/s10584-014-1169-1#Sec8', 'day', 'g', 1740, 'empty'), (105, 'https://link.springer.com/article/10.1007/s10584-014-1169-1#Sec8', 'day', 'g', 1820, 'empty'),(106, 'https://beryl.cc/carbon-saving-calculator', 'km', 'g', 138, 'empty')")
    cursor.execute("INSERT INTO ActionTypes (action_type_id, category, name, unit, default_factor_id) VALUES (1, 'TRAVEL', 'walk 1km', 'km', 101), (2, 'WASTE', 'pick up 1 plastic bottle', 'bottles', 102), (3, 'TRAVEL', '1 mile bus ride', 'miles', 103), (4, 'FOOD', 'vegan for a day', 'kcal', 104), (5, 'FOOD', 'vegeterian for a day', 'kcal', 105),(6, 'TRAVEL', 'Cycle 1km', 'km', 106)")


def populate_action_logs(cursor):
    action_logs = []
    evidence_logs = set(random.sample(range(600), 600))
    
    for i in range(1, 601):
        # get user ids
        cursor.execute("SELECT user_id FROM Users WHERE user_id < 66")
        user_ids = [row[0] for row in cursor.fetchall()]

        # action type id (FK) - 5 action types populated in db - choose one randomly
        action_type_id = random.randint(1, 5)

        # randomly choose user id
        user_id = random.choice(user_ids)

        # randomly choose number for quantity
        quantity = random.randint(1, 10)

        # randomly choose a date in the last 30 days
        date = (today - timedelta(seconds=random.randint(0, 30 * 24 * 60 * 60))).isoformat(timespec="milliseconds").replace('+00:00','Z')

        # choose 80 logs to have evidence 
        # list of images for each action type's evidence 
        images = {"FOOD" : "../uploads/food.png", 
                  "WASTE" : "../uploads/waste.png",
                  "TRAVEL" : "../uploads/travel.png"}
        if i in evidence_logs:
            cursor.execute("SELECT category FROM ActionTypes WHERE ActionTypes.action_type_id = ?", (action_type_id,))
            category = cursor.fetchone()[0]
            evidence = images[category]
        else:
            evidence = None

        # calculated co2e = quantity * default factor id (from action type)
        # calculated_co2e = random.randint(1, 100)
        cursor.execute("SELECT default_factor_id FROM ActionTypes WHERE ActionTypes.action_type_id = ?", (action_type_id,))
        default_factor_id = cursor.fetchone()[0]
        calculated_co2e = quantity*default_factor_id

        action_logs.append((action_type_id, user_id, quantity,
                           date, evidence, calculated_co2e))
        

    cursor.executemany(
        """ 
        INSERT INTO ActionLogs(action_type_id, user_id, quantity, date, evidence, calculated_co2e)
        VALUES(?, ?, ?, ?, ?, ?)
        """,
        action_logs
    )


def populate_action_conversion_factors(cursor):
    cursor.execute("DELETE FROM ConversionFactors")
    cursor.execute("DELETE FROM ActionTypes")
    cursor.execute("INSERT INTO ConversionFactors (factor_id, source, unit_in, unit_out, value, notes) VALUES (101, 'https://www.carbonindependent.org/17.html', 'km', 'g', 280, 'empty'), (102, 'https://www.sciencedirect.com/science/article/pii/S0921344915301245', 'bottles', 'g', 19, 'empty'), (103, 'https://www.carbonindependent.org/20.html', 'miles', 'g', 180, 'empty'), (104, 'https://link.springer.com/article/10.1007/s10584-014-1169-1#Sec8', 'day', 'g', 1740, 'empty'), (105, 'https://link.springer.com/article/10.1007/s10584-014-1169-1#Sec8', 'day', 'g', 1820, 'empty'),(106, 'https://beryl.cc/carbon-saving-calculator', 'km', 'g', 138, 'empty')")
    cursor.execute("INSERT INTO ActionTypes (action_type_id, category, name, unit, default_factor_id) VALUES (1, 'TRAVEL', 'Walk 1km', 'km', 101), (2, 'WASTE', 'Pick up 1 plastic bottle', 'bottles', 102), (3, 'TRAVEL', '1 mile bus ride', 'miles', 103), (4, 'FOOD', 'Vegan for a day', 'kcal', 104), (5, 'FOOD', 'Vegeterian for a day', 'kcal', 105),(6, 'TRAVEL', 'Cycle 1km', 'km', 106)")

# populate groups with 30 users
def populate_participant_groups(cursor):
    groups = set()
    while (len(groups) < 100):
        group_id = random.randint(1, 11)
        user_id = random.randint(1, 60)
        groups.add((user_id, group_id))
    cursor.executemany(
        """
        INSERT INTO ParticipantGroups(user_id, group_id)
        VALUES(?, ?)
        """, 
        groups
    )

# insert 200 challenge submissions into db

def populate_submissions(cursor):
    submissions = []
    for i in range(1, 401):

        # get linked_action_log ids
        cursor.execute("SELECT log_id FROM ActionLogs WHERE ActionLogs.user_id IN (SELECT user_id FROM ParticipantGroups) AND ActionLogs.evidence IS NOT NULL")
        log_ids = [row[0] for row in cursor.fetchall()]
        while True:
            log_id = random.choice(log_ids)

            # check if decision already exists
            if all(log_id != d[0] for d in submissions):
                break  # found a log without a submission, proceed

        # get challenge_ids
        cursor.execute("SELECT challenge_id FROM Challenges")
        challenge_ids = [row[0] for row in cursor.fetchall()]
        challenge_id = random.choice(challenge_ids)

        # get user_ids
        cursor.execute("SELECT user_id FROM ActionLogs WHERE ActionLogs.log_id = ?", (log_id,))
        user_id = cursor.fetchone()[0]
        
        # get group_ids 
        cursor.execute("SELECT group_id FROM ParticipantGroups WHERE ParticipantGroups.user_id = ?", (user_id,))
        group_id = cursor.fetchone()[0]

        # get random number for points 
        points = random.randint(5, 20)

        # use placeholder text for status 
        status = "Pending"

        submissions.append((log_id, challenge_id, user_id, group_id, points, status))

    cursor.executemany(
        """
        INSERT INTO Submissions(linked_action_log, challenge_id, user_id, group_id, points, status)
        VALUES(?, ?, ?, ?, ?, ?)
        """,
        submissions
    )

    # insert 40 moderation decisions into db

def populate_moderation_decisions(cursor):
    decisions = []
    for i in range(1, 301):

        # get submission_ids 
        cursor.execute("SELECT submission_id FROM Submissions")
        submission_ids = [row[0] for row in cursor.fetchall()]
        
        
        while True:
            submission_id = random.choice(submission_ids)

            # check if decision already exists
            if all(submission_id != d[0] for d in decisions):
                break  # found a submission without a decision, proceed

        # get moderator_ids
        cursor.execute("SELECT user_id FROM Users WHERE Users.role = 'moderator'")
        moderator_ids = [row[0] for row in cursor.fetchall()]
        moderator_id = random.choice(moderator_ids)

        # decision - randomly choose between approved and denied
        decision = random.choice(["approve", "deny"])

        # reason - use placeholder text
        reason = "explanation"

        # timestamp - choose randomly from time of submission to now 
        cursor.execute("SELECT date FROM ActionLogs JOIN Submissions ON ActionLogs.log_id = Submissions.linked_action_log WHERE Submissions.submission_id = ?", (submission_id,))
        submission_date = datetime.fromisoformat(cursor.fetchone()[0])

        now = datetime.now(timezone.utc)
        time_diff = now - submission_date

        random_seconds = random.randint(0, int(time_diff.total_seconds()))
        timestamp = (submission_date + timedelta(seconds=random_seconds)).isoformat(timespec="milliseconds").replace('+00:00','Z')



        decisions.append((submission_id, moderator_id, decision, reason, timestamp))

    cursor.executemany(
        """
        INSERT INTO ModerationDecisions(submission_id, moderator_id, decision, reason, timestamp)
        VALUES(?, ?, ?, ?, ?)
        """, 
        decisions)

# update submission status for moderated submissions
def update_submission_status(cursor):
    cursor.execute("""
        UPDATE Submissions
        SET status = CASE
            WHEN md.decision = 'approve' THEN 'Approved'
            WHEN md.decision = 'deny' THEN 'Denied'
            ELSE status
        END
        FROM ModerationDecisions md
        WHERE Submissions.submission_id = md.submission_id
    """)

# loop through denied submissions and add flags to show edge cases
def populate_flagged_submissions(cursor):
    submissions = []
    cursor.execute("SELECT submission_id FROM Submissions WHERE Submissions.status = 'Denied' ")
    submission_ids = [row[0] for row in cursor.fetchall()]
    rules = ["Rule 1: File integrity", "Rule 2: Duplicate upload", "Rule 3: Upload frequency"]
    for id in submission_ids:
        submission_id = id
        flag_type = random.randint(1, 3)
        rule_triggered = rules[flag_type-1]
        submissions.append((submission_id, flag_type, rule_triggered))
    cursor.executemany(
    """
    INSERT INTO AntiGamingFlags(submission_id, flag_type, rule_triggered)
    VALUES(?, ?, ?)
    """,
    submissions
    )
    
# loop through denied submissions and add flags to show edge cases
def populate_flagged_submissions_pending(cursor):
    submissions = []
    cursor.execute("SELECT submission_id FROM Submissions WHERE Submissions.status = 'Pending' ")
    submission_ids = [row[0] for row in cursor.fetchall()]
    rules = ["Rule 1: File integrity", "Rule 2: Duplicate upload", "Rule 3: Upload frequency"]
    for id in submission_ids:
        submission_id = id
        flag_type = random.randint(1, 3)
        rule_triggered = rules[flag_type-1]
        submissions.append((submission_id, flag_type, rule_triggered))
    cursor.executemany(
    """
    INSERT INTO AntiGamingFlags(submission_id, flag_type, rule_triggered)
    VALUES(?, ?, ?)
    """,
    submissions
    )
# update submission status for moderated submissions
def update_approval_reason(cursor):
    cursor.execute("""
        UPDATE ModerationDecisions
        SET reason = 'Flagged submission'
        FROM Submissions
        WHERE Submissions.submission_id = ModerationDecisions.submission_id AND ModerationDecisions.decision = 'deny'
    """)
    
#update evidence for decision
def update_action_evidence(cursor):
    cursor.execute("""
        UPDATE ActionLogs
        SET evidence = CASE
            WHEN agf.flag_type = '1' THEN '../uploads/corrupted.png'
            WHEN agf.flag_type = '2' THEN '../uploads/duplicate.png'
            ELSE evidence
        END
        FROM AntiGamingFlags  agf, Submissions
        WHERE ActionLogs.log_id = Submissions.linked_action_log AND Submissions.submission_id = agf.submission_id
    """)
    
def update_action_date(cursor):
    cursor.execute("""
        UPDATE ActionLogs
        SET date = datetime(ActionLogs.date, '-1 day')
        WHERE log_id IN (
            SELECT Submissions.linked_action_log
            FROM Submissions
            JOIN AntiGamingFlags agf
            ON Submissions.submission_id = agf.submission_id
            WHERE agf.flag_type = 3)
    """,)

populate_users(cursor)
seed_users()
populate_groups(cursor)
populate_challenges(cursor)
populate_action_conversion_factors(cursor)
populate_action_logs(cursor)
populate_participant_groups(cursor)
populate_submissions(cursor)
populate_moderation_decisions(cursor)
update_submission_status(cursor)
populate_flagged_submissions(cursor)
populate_flagged_submissions_pending(cursor)
update_approval_reason(cursor)
update_action_evidence(cursor)
update_action_date(cursor)

# check that the above have been added to the database

cursor.execute("SELECT COUNT(*) FROM Users")
print("Users:", cursor.fetchone()[0])

cursor.execute("SELECT COUNT(*) FROM Groups")
print("Groups:", cursor.fetchone()[0])

cursor.execute("SELECT COUNT(*) FROM Challenges")
print("Challenges:", cursor.fetchone()[0])

cursor.execute("SELECT COUNT(*) FROM ActionLogs")
print("Action logs:", cursor.fetchone()[0])

cursor.execute("SELECT COUNT(*) FROM ConversionFactors")
print("Conversion factors:", cursor.fetchone()[0])

cursor.execute("SELECT COUNT(*) FROM ParticipantGroups")
print("ParticipantGroups:", cursor.fetchone()[0])

cursor.execute("SELECT COUNT(*) FROM Submissions")
print("Submissions:", cursor.fetchone()[0])

cursor.execute("SELECT COUNT(*) FROM ModerationDecisions")
print("ModerationDecisions:", cursor.fetchone()[0])

cursor.execute("SELECT COUNT(*) FROM AntiGamingFlags")
print("AntiGamingFlags:", cursor.fetchone()[0])


# save and close the connection
con.commit()
con.close()
