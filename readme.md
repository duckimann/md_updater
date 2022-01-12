# MangaDex Updater

This was using in combination with Komga

Each folder (Serie name) will have at least 1 zip file with ComicInfo.xml

# Folder Structure
```
/komga
|   docker-compose.yml
|   login.txt
+---data
|   \---Ongoing
|       +---A Wife Who Heals with Tights
|       |       Ch. 1.zip
|       +---Arifureta Shokugyou de Sekai Saikyou
|       |       Ch. 0.zip
|       +---Asoko de Hataraku Musubu-san
|       |       Ch. 1.zip
|       +---Berserk Of Gluttony
|       |       Ch. 0.zip
\---ongoing_updater
    |   index.js
    |   mangadex.js
    |   package-lock.json
    |   package.json
    |   
    +---downloading
```

# How to add the comicinfo.xml?
Use [comictagger](https://github.com/comictagger/comictagger).

# How to use
Place the folder structure like above, fill in your login creds/token and run the index.js