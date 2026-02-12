import sqlite3

# Connect to database
con = sqlite3.connect("CarbonChallenge.db")
cursor = con.cursor()

cursor.execute("INSERT INTO ConversionFactors (factor_id, source, unit_in, unit_out, value, notes) VALUES (101, 'wiki.com', 'km', 'co2', 5, 'empty'), (102, 'wiki.com', 'pcs', 'co2', 2, 'empty')")
cursor.execute("INSERT INTO ActionTypes (action_type_id, category, name, unit, default_factor_id) VALUES (1, 'TRAVEL', 'walk 1km', 'km', 101), (2, 'WASTE', 'pick up 3 pieces', 'pcs', 102)")

con.commit()
con.close()

print("Data inserted successfully.")