# Document de rendu 
## Équipe :
PEYROT Ryan  
OLIVRIE Aubin  
SEVAULT Lucas  

## Liens GITHUB pour le rendu :
BackOffice : https://github.com/RyanPeyrot/spotifake-backoffice  
Front : https://github.com/RyanPeyrot/Spotifake  
Back : https://github.com/RyanPeyrot/spotifake-api  

## Lien de vos projets mis en prod :
Back : http://13.37.240.115:4000/spotifake-ral/v1/  



# Utilisation de l'api

## Les models
**Medias**
```json
{
  "title": "Song Title",
  "artist": ["artistId1", "artistId2"],
  "album": "albumId",
  "releaseDate": "2023-01-01",
  "genre": ["Genre1", "Genre2"],
  "listenCount": 100,
  "storage": "storage_path",
  "thumbnail": "https://d2be9zb8yn0dxh.cloudfront.net/"
}
```
**Playlists**
```json
{
  "name": "Playlist Name",
  "createdAt": "2023-01-01",
  "creator": "Playlist Creator",
  "medias": ["mediaId1", "mediaId2"],
  "thumbnail": "https://d2be9zb8yn0dxh.cloudfront.net/",
  "isAlbum": false
}

```

**Artists**
```json
{
  "name": "Artist Name",
  "albums": ["albumId1", "albumId2"],
  "titles": ["mediaId1", "mediaId2"],
  "thumbnail": "https://d2be9zb8yn0dxh.cloudfront.net/"
}
```

**Session**
```json
{
  "users": ["user1","user2"]
}
```

## Les Routes
```
/spotifake-ral/v1
```

**Routes de base:**
```
/playlists
/medias
/artists
/sessions
```

**Medias**
```
post("/"); body : un fichier avec des metadata
get("/");
get("/title/"); -> headers title : "title"
get("/:id");
put("/song/:id"); -> body un fichier son
put("/thumbnail/:id"); -> body un fichier image
put("/:id");
delete("/:id");
```
**Playlists**
```
post("/"); body json similaire au model
get("/");
get("/name/"); -> headers name : "name"
get("/:id");
delete("/song/:id"); -> media : id du media à delete
delete("/:id");
put("/song/:id"); -> body media : id du media à ajouter
put("/thumbnail/:id"); -> body fichier image pour la thumbnail
put("/:id");
```

**Artists**
```
post("/"); body json similaire au model
get("/");
get("/name/"); -> headers name : "name"
get("/:id");
put("/thumbnail/:id"); -> body : un fichier image
put("/:id");
delete("/:id");
```

**Sessions**
```
post("/") Création de la session via un body json : {user : "nom du user"}
put("/:id",controller.joinSession) Ajout d'un user a la liste avec body json similaire a la création
get("/:id",controller.getSession) recupere une session
get("/",controller.getAllSessions) recupere toute les session
delete("/user/:id",controller.leaveSession) supprimer le user et delete la session si aucun user dedans,
    headers json : {user : "nom du user"}
delete("/:id",controller.deleteSession) supprime la session correspondante
```


## Lien utiles

Image par default : https://d2be9zb8yn0dxh.cloudfront.net/

Arborescence s3:

<pre>
├── spotifake-ral
    ├── artist
        ├── thumbnail_'nom du fichier>'
    ├── playlist
        ├── thumbnail_'nom du fichier>'
    ├── media
        ├── thumbnail_'nom du fichier>'
        └── media_'nom du fichier>'
    └── thumbnail_default.jpg
</pre>
