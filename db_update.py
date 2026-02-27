import sqlite3
import random
import string
import hashlib
from datetime import date, timedelta

# Connect to database
con = sqlite3.connect("CarbonChallenge.db")
cursor = con.cursor()

# ensure the database tables are empty before populating them
# cursor.execute("DROP TABLE Moderators")
# cursor.execute("DROP TABLE Participants")
# cursor.execute("DROP TABLE Maintainers")

cursor.execute("ALTER TABLE Challenges ADD COLUMN evidence_required Boolean;")
con.commit()
con.close()