import sqlite3
import random
import bcrypt
from datetime import date, timedelta, datetime

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
        ('user', 'user', 'user@exeter.ac.uk', 'user123'),
        ('moderator', 'moderator', 'moderator@exeter.ac.uk', 'moderator123'),
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


today = date.today()
start_date = (today - timedelta(days=365)).isoformat()
end_date = (today + timedelta(days=365)).isoformat()

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


def populate_action_logs(cursor):
    action_logs = []
    for i in range(1, 501):
        # get user ids
        cursor.execute("SELECT user_id FROM Users")
        user_ids = [row[0] for row in cursor.fetchall()]

        # action type id (FK) - 3 types: travel, food, waste
        # do same way as user_id once made action type table?
        action_type_id = random.randint(1, 3)

        # randomly choose user id
        user_id = random.choice(user_ids)

        # randomly choose number for quantity
        quantity = random.randint(1, 10)

        # randomly choose a date in the last 30 days
        date = (today - timedelta(days=random.randint(0, 30))).isoformat()


        # calculated co2e = quantity * default factor id (from action type)
        # use default factor id once made action table
        calculated_co2e = random.randint(1, 100)

        action_logs.append((action_type_id, user_id, quantity,
                           date, calculated_co2e))

    cursor.executemany(
        """ 
        INSERT INTO ActionLogs(action_type_id, user_id, quantity, date, calculated_co2e)
        VALUES(?, ?, ?, ?, ?)
        """,
        action_logs
    )


def populate_action_conversion_factors(cursor):
    cursor.execute("DELETE FROM ConversionFactors")
    cursor.execute("DELETE FROM ActionTypes")
    cursor.execute("INSERT INTO ConversionFactors (factor_id, source, unit_in, unit_out, value, notes) VALUES (101, 'https://www.carbonindependent.org/17.html', 'km', 'g', 280, 'empty'), (102, 'https://www.sciencedirect.com/science/article/pii/S0921344915301245', 'bottles', 'g', 19, 'empty'), (103, 'https://www.carbonindependent.org/20.html', 'miles', 'g', 180, 'empty'), (104, 'https://link.springer.com/article/10.1007/s10584-014-1169-1#Sec8', 'day', 'g', 1740, 'empty'), (105, 'https://link.springer.com/article/10.1007/s10584-014-1169-1#Sec8', 'day', 'g', 1820, 'empty')")
    cursor.execute("INSERT INTO ActionTypes (action_type_id, category, name, unit, default_factor_id) VALUES (1, 'TRAVEL', 'walk 1km', 'km', 101), (2, 'WASTE', 'pick up 1 plastic bottle', 'bottles', 102), (3, 'TRAVEL', '1 mile bus ride', 'miles', 103), (4, 'FOOD', 'vegan for a day', 'kcal', 104), (5, 'FOOD', 'vegeterian for a day', 'kcal', 105)")

# populate groups with 30 users
def populate_participant_groups(cursor):
    groups = set()
    while (len(groups) < 30):
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
    for i in range(1, 201):

        # get linked_action_log ids
        cursor.execute("SELECT log_id FROM ActionLogs WHERE ActionLogs.user_id IN (SELECT user_id FROM ParticipantGroups)")
        log_ids = [row[0] for row in cursor.fetchall()]
        log_id = random.choice(log_ids)

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
        status = "submitted"

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
    for i in range(1, 41):

        # get submission_ids 
        cursor.execute("SELECT submission_id FROM Submissions")
        submission_ids = [row[0] for row in cursor.fetchall()]
        submission_id = random.choice(submission_ids)

        # get moderator_ids
        cursor.execute("SELECT user_id FROM Users WHERE Users.role = 'moderator'")
        moderator_ids = [row[0] for row in cursor.fetchall()]
        moderator_id = random.choice(moderator_ids)

        # decision - randomly choose between approved and denied
        decision = random.choice(["approved", "denied"])

        # reason - use placeholder text
        reason = "explanation"

        # timestamp - choose randomly from time of submission to now 
        cursor.execute("SELECT date FROM ActionLogs JOIN Submissions ON ActionLogs.log_id = Submissions.linked_action_log WHERE Submissions.submission_id = ?", (submission_id,))
        submission_date = datetime.strptime(cursor.fetchone()[0], "%Y-%m-%d").date()
        days = (today - submission_date).days
        if days > 0:
            days_to_add = random.randrange(days)
        else:
            days_to_add = 0
        timestamp = (submission_date + timedelta(days = days_to_add)).isoformat()

        decisions.append((submission_id, moderator_id, decision, reason, timestamp))

    cursor.executemany(
        """
        INSERT INTO ModerationDecisions(submission_id, moderator_id, decision, reason, timestamp)
        VALUES(?, ?, ?, ?, ?)
        """, 
        decisions)


populate_users(cursor)
seed_users()
populate_groups(cursor)
populate_challenges(cursor)
populate_action_logs(cursor)
populate_action_conversion_factors(cursor)
populate_participant_groups(cursor)
populate_submissions(cursor)
populate_moderation_decisions(cursor)

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
print("Submisions:", cursor.fetchone()[0])

cursor.execute("SELECT COUNT(*) FROM ModerationDecisions")
print("ModerationDecisions:", cursor.fetchone()[0])


# save and close the connection
con.commit()
con.close()
