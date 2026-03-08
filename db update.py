import sqlite3
import bcrypt

def seed_users():
    users = [
        ('maintainer', 'maintainer', 'maintainer@exeter.ac.uk', 'maintainer123'),
        #('moderator', 'moderator', 'moderator@exeter.ac.uk', 'moderator123'),
        #('user', 'user', 'user@exeter.ac.uk', 'user123'),
    ]

    # Connect to the database
    con = sqlite3.connect("CarbonChallenge.db")
    cursor = con.cursor()

    for display_name, role, email, plain_password in users:
        # Hash the password with bcrypt, cost=10 rounds
        hashed_password = bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt(rounds=10))
        # Insert into Users table
        cursor.execute(
            "INSERT INTO Users (display_name, role, email, password) VALUES (?,?,?,?)",
            (display_name, role, email, hashed_password)
        )

    con.commit()
    con.close()
    print("Seeded users successfully!")

# Run the seeding
seed_users()