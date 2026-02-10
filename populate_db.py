import sqlite3

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
        role = "participant"
        email = f"user{i}@ex.com"
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

def populate_challenges(cursor):
    challenges = []
    for i in range(1, 501):
        title = f"challenge_{i}"
        scope = ""
        rules = ""
        scoring = ""
        start_date = ""
        end_date = ""

        challenges.append((title, scope, rules, scoring, start_date, end_date))

    cursor.executemany(
        """
        INSERT INTO Challenges (title, scope, rules, scoring, start_date, end_date)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        challenges
    )

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

