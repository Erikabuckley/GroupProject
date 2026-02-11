import sqlite3
from datetime import date, timedelta

# Connect to database
con = sqlite3.connect("CarbonChallenge.db")
cursor = con.cursor()

cursor.execute("DELETE FROM Users")
cursor.execute("DELETE FROM Groups")
cursor.execute("DELETE FROM Challenges")

def populate_users(cursor):
    users = []
    for i in range(1, 61): 
        display_name = f"user_{i}"
        # default role is participant
        role = "participant"
        email = f"user{i}@exeter.ac.uk"
        # use hashing 
        password = "123"

        users.append((display_name, role, email, password))
    
    cursor.executemany(
        """ 
        INSERT INTO Users (display_name, role, email, password)
        VALUES (?, ?, ?, ?)
        """,
        users
    )


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
end_date = today + timedelta(days = 365)
def populate_challenges(cursor):
    challenges_info = [
        {
            "title": "Litter picking",
            "scope": "Personal",
            "rules": "Pick up ten pieces of litter in a day",
            "scoring": "5 points" 
        },
        {
            "title": "Make a journey by foot",
            "scope": "Personal",
            "rules": "Switch a journey made by a vehicle to one by foot",
            "scoring": "5 points"
        },
        {
            "title": "Take public transport",
            "scope": "Personal",
            "rules": "Make a singular journey by public transport",
            "scoring": "5 points"
        },
        {
            "title": "Vegeterian for 5 days",
            "scope": "Personal",
            "rules": "Eat 5 vegetarian meals in a week",
            "scoring": "10 points"
        },
        {
            "title": "Vegan for 3 days",
            "scope": "Personal",
            "rules": "Eat 3 vegan meals in a week",
            "scoring": "10 points"
        },
        {
            "title": "100km cycle",
            "scope": "Group",
            "rules": "Complete a 100km cycle between the group over 1 month",
            "scoring": "30 points"
        },
        {
            "title": "Saving CO2",
            "scope": "Group",
            "rules": "Save 500kg CO2 between the group in a month)",
            "scoring": "40"
        },
        {
            "title": "Recycle",
            "scope": "Personal",
            "rules": "Take 50kg of recycling to a recycling point",
            "scoring": "30"
        }
    ]

    challenges = []

    for c in challenges_info:
        challenges.append((c["title"], c["scope"], c["rules"], c["scoring"], today, end_date))

    cursor.executemany(
        """
        INSERT INTO Challenges (title, scope, rules, scoring, start_date, end_date)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        challenges
    )

# def populate_action_logs(cursor):

populate_users(cursor)
populate_groups(cursor)
populate_challenges(cursor)

cursor.execute("SELECT COUNT(*) FROM Users")
print("Users:", cursor.fetchone()[0])

cursor.execute("SELECT COUNT(*) FROM Groups")
print("Groups:", cursor.fetchone()[0])

cursor.execute("SELECT COUNT(*) FROM Challenges")
print("Challenges:", cursor.fetchone()[0])

con.commit()
con.close()

