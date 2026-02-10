# How to import sql script
import sqlite3

# Create a db connection
con = sqlite3.connect("CarbonChallenge.db")

# Read the SQL file
with open("sql_tables.sql", "r") as f:
    sql_script = f.read()

# Execute the SQL script
# con.set_trace_callback(print)
con.executescript(sql_script)
cursor = con.execute(
    "SELECT name FROM sqlite_master WHERE type='table';"
)
print(cursor.fetchall())
con.commit()

print("SQL script executed successfully")

# Save & close
con.close()
