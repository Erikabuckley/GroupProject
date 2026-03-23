import sqlite3
import random
import bcrypt
#Change password
def changePassword(cursor, email, old, new):
    # Get user
    cursor.execute("SELECT user_id, password FROM Users WHERE email = ?", (email,))
    row = cursor.fetchone()

    if not row:
        return False  # User not found

    user_id, real_hash = row

    # Check old password
    if not bcrypt.checkpw(old.encode('utf-8'), real_hash.encode('utf-8')):
        return False  # incorrect password

    # Hash new password
    hashed_new = bcrypt.hashpw(new.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8')

    # Update password
    cursor.execute(
        "UPDATE Users SET password = ? WHERE user_id = ?",
        (hashed_new, user_id)
    )
    return True
    
#Add new conversion factor
def addConversionFactor(cursor, source, unit_in, unit_out, value, notes, uncertainty):
    cursor.execute("INSERT INTO ConversionFactors (source, unit_in, unit_out, value, notes, uncertainty) VALUES (?,?,?,?,?,?)", (source, unit_in, unit_out, value, notes, uncertainty,))
    return True
    
#Upgrade account
def upgradeAccount(cursor, email, password):
    # Get user
    cursor.execute("SELECT user_id, password FROM Users WHERE email = ?", (email,))
    row = cursor.fetchone()

    if not row:
        return False  # User not found

    user_id, real_hash = row

    # Check old password
    if not bcrypt.checkpw(password.encode('utf-8'), real_hash.encode('utf-8')):
        return False  # incorrect password

    # Upgrade account 
    cursor.execute(
        "UPDATE Users SET role = 'moderator' WHERE user_id = ?",
        (user_id,)
    )
    return True

# Connect to database
con = sqlite3.connect("CarbonChallenge.db")
cursor = con.cursor()

#Call required function here

con.commit()
con.close()