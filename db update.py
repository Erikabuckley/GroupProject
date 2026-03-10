import sqlite3
import bcrypt

def seed_users():
    users = [
        ('user', 'user', 'user@exeter.ac.uk', 'user123'),
        ('moderator', 'moderator', 'moderator@exeter.ac.uk', 'moderator123'),
    ]

    con = sqlite3.connect("CarbonChallenge.db")
    cursor = con.cursor()

    for display_name, role, email, plain_password in users:
        # Hash password and decode to string
        hashed_password = bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8')
        cursor.execute(
            "INSERT INTO Users (display_name, role, email, password) VALUES (?,?,?,?)",
            (display_name, role, email, hashed_password)
        )

    con.commit()
    con.close()
    print("Seeded users successfully!")

seed_users()