# New players: [name, pos, decades, nat, ballonor, legend, club]
new_players = [
    ["Oliver Kahn", "GK", [1990, 2000], "Allemagne", 0, 1, "Bayern Munich"],
    ["Dino Zoff", "GK", [1960, 1970, 1980], "Italie", 0, 1, "Juventus"],
    ["José Luis Chilavert", "GK", [1980, 1990, 2000], "Paraguay", 0, 1, "Vélez Sarsfield"],

    ["Cafu", "DEF", [1990, 2000], "Brésil", 0, 1, "AC Milan"],
    ["Lilian Thuram", "DEF", [1990, 2000], "France", 0, 1, "Juventus"],
    ["Carles Puyol", "DEF", [2000, 2010], "Espagne", 0, 1, "FC Barcelone"],
    ["Javier Zanetti", "DEF", [1990, 2000, 2010], "Argentine", 0, 1, "Inter Milan"],
    ["Bixente Lizarazu", "DEF", [1990, 2000], "France", 0, 1, "Bayern Munich"],
    ["Alessandro Nesta", "DEF", [1990, 2000, 2010], "Italie", 0, 1, "AC Milan"],
    ["Jaap Stam", "DEF", [1990, 2000], "Pays-Bas", 0, 1, "Manchester United"],
    ["Sol Campbell", "DEF", [1990, 2000, 2010], "Angleterre", 0, 0, "Arsenal"],
    ["Éric Abidal", "DEF", [2000, 2010], "France", 0, 0, "FC Barcelone"],
    ["Raphaël Varane", "DEF", [2010, 2020], "France", 0, 1, "Real Madrid"],
    ["Marquinhos", "DEF", [2010, 2020], "Brésil", 0, 0, "PSG"],
    ["Antonio Rüdiger", "DEF", [2010, 2020], "Allemagne", 0, 0, "Real Madrid"],
    ["David Alaba", "DEF", [2010, 2020], "Autriche", 0, 1, "Real Madrid"],
    ["Fernando Hierro", "DEF", [1990, 2000], "Espagne", 0, 1, "Real Madrid"],

    ["Roy Keane", "MID", [1990, 2000], "Irlande", 0, 1, "Manchester United"],
    ["Emmanuel Petit", "MID", [1990, 2000], "France", 0, 1, "Arsenal"],
    ["Deco", "MID", [2000, 2010], "Portugal", 0, 1, "FC Barcelone"],
    ["Michael Laudrup", "MID", [1980, 1990], "Danemark", 0, 1, "FC Barcelone"],
    ["Clarence Seedorf", "MID", [1990, 2000, 2010], "Pays-Bas", 0, 1, "AC Milan"],
    ["Gennaro Gattuso", "MID", [1990, 2000, 2010], "Italie", 0, 1, "AC Milan"],
    ["Michel Platini", "MID", [1970, 1980], "France", 1, 1, "Juventus"],
    ["Granit Xhaka", "MID", [2010, 2020], "Suisse", 0, 0, "Arsenal"],
    ["Thiago Alcântara", "MID", [2010, 2020], "Espagne", 0, 0, "FC Barcelone"],
    ["Frank Rijkaard", "MID", [1980, 1990], "Pays-Bas", 0, 1, "AC Milan"],

    ["Ferenc Puskás", "ATT", [1950, 1960], "Hongrie", 0, 1, "Real Madrid"],
    ["Eusébio", "ATT", [1960, 1970], "Portugal", 1, 1, "Benfica"],
    ["Gerd Müller", "ATT", [1960, 1970], "Allemagne", 1, 1, "Bayern Munich"],
    ["Alfredo Di Stéfano", "ATT", [1950, 1960], "Argentine", 1, 1, "Real Madrid"],
    ["Garrincha", "ATT", [1950, 1960], "Brésil", 0, 1, "Botafogo"],
    ["Roberto Baggio", "ATT", [1980, 1990, 2000], "Italie", 1, 1, "Juventus"],
    ["Alessandro Del Piero", "ATT", [1990, 2000, 2010], "Italie", 0, 1, "Juventus"],
    ["Francesco Totti", "ATT", [1990, 2000, 2010], "Italie", 0, 1, "AS Roma"],
    ["Rivaldo", "ATT", [1990, 2000], "Brésil", 1, 1, "FC Barcelone"],
    ["Gabriel Batistuta", "ATT", [1990, 2000], "Argentine", 0, 1, "Fiorentina"],
    ["Hernán Crespo", "ATT", [1990, 2000, 2010], "Argentine", 0, 0, "Inter Milan"],
    ["George Weah", "ATT", [1990, 2000], "Liberia", 1, 1, "AC Milan"],
    ["Ruud Gullit", "ATT", [1980, 1990], "Pays-Bas", 1, 1, "AC Milan"],
]

print(len(new_players))
import json
with open('new_players.json', 'w', encoding='utf-8') as f:
    json.dump(new_players, f, ensure_ascii=False, indent=2)
