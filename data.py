import sqlite3

con = sqlite3.connect("carbonGame.db")
cursor = con.cursor()

cursor.execute("CREATE TABLE data") ##########write code in here aoife