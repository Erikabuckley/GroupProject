# How to import sql script
import sqlite3

# Create a db connection
con = sqlite3.connect("carbonGame.db")

# Read the SQL file
with open("CHANGE THIS.sql", "r") as f:
    sql_script = f.read()

# Execute the SQL script
con.executescript(sql_script)

# Save & close
con.commit()
con.close()