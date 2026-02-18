import sqlite3
import random
import string
import hashlib
from datetime import date, timedelta

# Connect to database
con = sqlite3.connect("CarbonChallenge.db")
cursor = con.cursor()

# ensure the database tables are empty before populating them 
cursor.execute("DELETE FROM Users")
cursor.execute("DELETE FROM Groups")
cursor.execute("DELETE FROM Challenges")
cursor.execute("DELETE FROM ActionLogs")

# randomly generate a password and hash it
def hashed_password():
    password = ""
    for i in range (1, 5):
        password += string.ascii_letters
    for i in range(1, 3):
        password += string.digits
    for i in range(1, 2):
        password += string.punctuation
    return hashlib.sha256(password.encode()).hexdigest()
        
# insert users into db
def populate_users(cursor):
    users = []
    for i in range(1, 61): 
        display_name = f"user_{i}"
        # default role is participant
        role = "participant"
        email = f"user{i}@exeter.ac.uk"
        # store hashed password 
        password = hashed_password()

        users.append((display_name, role, email, password))
    
    cursor.executemany(
        """ 
        INSERT INTO Users (display_name, role, email, password)
        VALUES (?, ?, ?, ?)
        """,
        users
    )

# insert groups into db
def populate_groups(cursor):
    groups = []
    for i in range(1, 11):
        name = f"group_{i}"
        
        groups.append((name,))

    cursor.executemany(
        """ 
        INSERT INTO Groups (name)
        VALUES (?)
        """, 
        groups
    )

today = date.today()
start_date = today - timedelta(days = 365)
end_date = today + timedelta(days = 365)

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
            "title": "Vegeterian for 5 days",
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
            "rules": "Save 500kg CO2 between the group in a month)",
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
        challenges.append((c["title"], c["scope"], c["rules"], c["scoring"], start_date, end_date))

    cursor.executemany(
        """
        INSERT INTO Challenges (title, scope, rules, scoring, start_date, end_date)
        VALUES (?, ?, ?, ?, ?, ?)
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
        date = (today - timedelta(days = random.randint(0, 30)))

        # randomly choose whether evidence is required or not
        evidence_required = random.choice([True, False])

        # calculated co2e = quantity * default factor id (from action type)
        # use default factor id once made action table
        calculated_co2e = random.randint(1, 100)

        action_logs.append((action_type_id, user_id, quantity, date, evidence_required, calculated_co2e))

    cursor.executemany(
        """ 
        INSERT INTO ActionLogs(action_type_id, user_id, quantity, date, evidence_required, calculated_co2e)
        VALUES(?, ?, ?, ?, ?, ?)
        """,
        action_logs
    )

def populate_action_conversion_factors(cursor):
    cursor.execute("DELETE FROM ConversionFactors")
    cursor.execute("DELETE FROM ActionTypes")
    cursor.execute("INSERT INTO ConversionFactors (factor_id, source, unit_in, unit_out, value, notes) VALUES (101, 'https://www.carbonindependent.org/17.html', 'km', 'g', 280, 'empty'), (102, 'https://www.sciencedirect.com/science/article/pii/S0921344915301245', 'bottles', 'g', 19, 'empty'), (103, 'https://www.carbonindependent.org/20.html', 'miles', 'g', 180, 'empty'), (104, 'https://link.springer.com/article/10.1007/s10584-014-1169-1#Sec8', 'day', 'g', 1740, 'empty'), (105, 'https://link.springer.com/article/10.1007/s10584-014-1169-1#Sec8', 'day', 'g', 1820, 'empty')")
    cursor.execute("INSERT INTO ActionTypes (action_type_id, category, name, unit, default_factor_id) VALUES (1, 'TRAVEL', 'walk 1km', 'km', 101), (2, 'WASTE', 'pick up 1 plastic bottle', 'bottles', 102), (3, 'TRAVEL', '1 mile bus ride', 'miles', 103), (4, 'FOOD', 'vegan for a day', 'kcal', 104), (5, 'FOOD', 'vegeterian for a day', 'kcal', 105)")

populate_users(cursor)
populate_groups(cursor)
populate_challenges(cursor)
populate_action_logs(cursor)
populate_action_conversion_factors(cursor)

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

# save and close the connection
con.commit()
con.close()

