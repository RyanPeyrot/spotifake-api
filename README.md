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
  "storage": "storage_path"
}
```
**Playlists**
```json
{
  "name": "Playlist Name",
  "createdAt": "2023-01-01",
  "creator": "Playlist Creator",
  "medias": ["mediaId1", "mediaId2"],
  "thumbnail": "thumbnail_path",
  "isAlbum": false
}

```

**Artists**
```json
{
  "name": "Artist Name",
  "albums": ["albumId1", "albumId2"],
  "titles": ["mediaId1", "mediaId2"]
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
```

**Medias**
```
post("/"); body : un fichier avec des metadata
get("/");
get("/title/"); -> headers title : "title"
get("/:id");
put("/:id");
delete("/:id");
```
**Playlists**
```
post("/"); body json similaire au model
get("/");
get("/name/"); -> headers name : "name"
get("/:id");
delete("/:id");
put("/:id");
put("/:id");
```

**Artists**
```
post("/"); body json similaire au model
get("/");
get("/name/"); -> headers name : "name"
get("/:id");
put("/:id");
delete("/:id");
```
