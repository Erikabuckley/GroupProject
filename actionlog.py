import sqlite3

# Connect to database
con = sqlite3.connect("CarbonChallenge.db")
cursor = con.cursor()

cursor.execute("DELETE FROM ConversionFactors")
cursor.execute("DELETE FROM ActionTypes")
cursor.execute("INSERT INTO ConversionFactors (factor_id, source, unit_in, unit_out, value, notes) VALUES (101, 'https://www.carbonindependent.org/17.html', 'km', 'g', 5, 'empty'), (102, 'https://www.sciencedirect.com/science/article/pii/S0921344915301245', 'bottles', 'g', 2, 'empty'), (103, 'https://www.carbonindependent.org/20.html', 'miles', 'g', 3, 'empty'), (104, 'https://link.springer.com/article/10.1007/s10584-014-1169-1#Sec8', 'kcal', 'g', 5, 'empty'), (105, 'https://link.springer.com/article/10.1007/s10584-014-1169-1#Sec8', 'kcal', 'g', 4, 'empty')")
cursor.execute("INSERT INTO ActionTypes (action_type_id, category, name, unit, default_factor_id) VALUES (1, 'TRAVEL', 'walk 1km', 'km', 101), (2, 'WASTE', 'pick up 1 plastic bottle', 'bottles', 102), (3, 'TRAVEL', '1 mile bus ride', 'miles', 103), (4, 'FOOD', 'vegan for a day', 'kcal', 104), (5, 'FOOD', 'vegeterian for a day', 'kcal', 105)")


'''Drive 1mile = 280g carbon https://www.carbonindependent.org/17.html 

Picking up 1 plastic bottle =19.1g carbon because one bottle weighs 17.7g https://plastic.education/which-single-use-water-bottles-have-the-most-plastic/ at  1.08kgCo2 per kg of litter  https://www.sciencedirect.com/science/article/pii/S0921344915301245 

Bus insted of car for mile = 180g carbon saved https://www.carbonindependent.org/20.html 

Vegan one day 1.74kg per day  

Vegi one day 1.82kg per day https://link.springer.com/article/10.1007/s10584-014-1169-1#Sec8 
'''
con.commit()
con.close()

print("Data inserted successfully.")