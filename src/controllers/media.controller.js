const Media = require("../models/media.model")
const Artist = require("../models/artist.model")
const Playlist = require("../models/playlist.model")
const mm = require('music-metadata');
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path")
const { promisify } = require('util');
const {createPlaylist} = require('./playlist.controller');


const writeFileAsync = promisify(fs.writeFile);

//Cloudfront pour lire les fichiers avec s3

/* CREATE */
exports.createOne = async(req,res) => {
    try {
        const s3 = new AWS.S3()
        const uploadS3 = (params) => {
            return s3.upload(params).promise()
        }

        if (req.file) {
            try {
                const metadata = await mm.parseFile(req.file.path);

                if(metadata.common.album !== undefined){
                    if(metadata.common.albumartist === undefined)metadata.common.albumartist = metadata.common.artist
                    let album;
                    //création/ajout à l'album
                    await Playlist.findOne({isAlbum : true, name:metadata.common.album, creator:metadata.common.albumartist},(err,playlist) => {
                        if(err){
                            console.error("Erreur lors de la récupération de l'album")
                        }
                        if(playlist){
                            console.log('Album trouvé :', playlist);
                        } else {
                            console.error('Aucun album existant trouvé.');
                        }
                        album = playlist;
                    })
                    if(album === null){
                        const uploadThumbParams = {
                            Bucket: 'spotifake-ral',
                            Key: `playlist/thumb_${metadata.common.album}`,
                            Body: metadata.common.picture[0].data,
                        }

                        uploadS3(uploadThumbParams).then((data) => {
                            console.log('Téléversement réussi. Lien du fichier:', data.Location);

                            album = new Playlist({
                                name: metadata.common.album === undefined ? "undefined" : metadata.common.album,
                                createdAt: metadata.common.date === undefined ? "undefined" : metadata.common.date,
                                creator: metadata.common.albumartist === undefined ? "undefined" : metadata.common.albumartist,
                                media: [],
                                thumbnail: data.Location === undefined ? "undefined" : data.Location,
                                isAlbum: true
                            });

                            return album.save()
                        }).then((savedAlbum) => {
                            console.log('Création de l\'album réussie:', savedAlbum);
                            album = savedAlbum;
                        }).catch((error) => {
                            console.error('Une erreur est survenue lors du téléversement du thumbnail:', error);
                            return res.status(500).send(`Erreur lors du téléversement du thumbnail de l'album`);
                        });
                    }

                    //création des artist inconnus
                    let allArtists = []
                    for (const artist of metadata.common.artists) {
                        const index = metadata.common.artists.indexOf(artist);
                        let mediaArtist;
                        await Artist.findOne({ name: artist })
                            .then((result) => {
                                mediaArtist = result;
                            })
                            .catch((error) => {
                                // Gérez les erreurs ici
                                console.error('Erreur lors de la recherche d\'artiste :', error);
                            });
                        if (mediaArtist === null){
                            mediaArtist = new Artist({
                                name : artist === undefined ? "undefined" : artist,
                                albums : [],
                                titles : []
                            })
                            mediaArtist = await mediaArtist.save();
                        }
                        allArtists.push(mediaArtist._id)

                        if(metadata.common.albumartist === artist){
                            await Artist.findByIdAndUpdate(mediaArtist._id,{$addToSet:{albums : album._id}})
                        }
                    }
                }

                const uploadMediaParams = {
                    Bucket: 'spotifake-ral',
                    Key: `media/media_${req.file.originalname}`,
                    Body: fs.createReadStream(req.file.path),
                };

                uploadS3(uploadMediaParams).then((data) => {
                    const newMedia = new Media({
                        title: metadata.common.title === undefined ? "undefined" : metadata.common.title,
                        artist: allArtists === undefined ? "undefined" : allArtists,
                        album: album._id === undefined ? "undefined" : album._id,
                        releaseDate: metadata.common.date === undefined ? "undefined" : metadata.common.date,
                        storage: data.Location === undefined ? "undefined" : data.Location,
                    });

                    return newMedia.save();
                }).then(async (savedMedia) => {
                    console.log('Création du media réussi:', savedMedia);
                    await Playlist.findByIdAndUpdate(savedMedia._doc.album, {medias: savedMedia._id});
                    for (const artist of savedMedia._doc.artist) {
                        await Artist.findByIdAndUpdate(artist,{titles : savedMedia._id})
                    }
                    res.status(201).json(savedMedia);
                }).catch((error) => {
                    console.error('Une erreur est survenue lors du téléversement de', req.file.originalname, ':', error);
                    return res.status(500).send(`Erreur lors du téléversement de ${req.file.originalname}.`);
                });
            } catch (error) {
                console.error('Erreur lors de la lecture des métadonnées :', error.message);
               return  res.status(500).send('Erreur lors de la lecture des métadonnées.');
            }
        } else {
            return res.status(400).send("Aucun fichier");
        }
    } catch (error) {
        console.error('Erreur lors du traitement de la requête :', error);
        return res.status(500).send('Erreur lors du traitement de la requête.');
    }
}


/* GET */
exports.getAll = async(req,res) => {
    try {
        const medias = await Media.find().populate('artist')
          .populate('album');
        return res.status(200).json(medias);
    } catch (error) {
        console.error(error);
        return res.status(500).json({message: 'Erreur lors de la récupération des média'});
    }
}

exports.getOneById = async (req,res) => {
    try{
        Media.findById(req.params.id).populate('artist')
          .populate('album').then((doc) => {
            if (doc) {
                return res.status(200).json(doc)
            } else {
                return res.status(404).json({message: 'Aucun média trouvé'})
            }
        })
    }catch (error){
        console.error(error);
        return res.status(500).json({message: 'Erreur lors de la récupération des média'});
    }
}

exports.getOneByName = async (req,res) => {
    try {
        Media.findOne({title: req.headers.title}).populate('artist')
          .populate('album').then((doc) => {
            if (doc) {
                return res.status(200).json(doc)
            } else {
                return res.status(404).json({message: 'Aucun média trouvé'})
            }
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({message: 'Erreur lors de la récupération des média'});
    }
}

/* UPDATE */
exports.updateMedia = async (req,res) => {
    try {
        Media.findByIdAndUpdate(req.params.id, req.body, {new: true},(err,media) => {
            if (err) {
                console.error(err);
                return res.status(500).json({message: 'Erreur lors de l\'update du média'});
            }
            if (media) {
                return res.status(200).json(media)
            } else {
                return res.status(404).json({message: 'Aucun média trouvé'})
            }
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({message: 'Erreur lors de l\'update du média'});
    }
}

/*  DELETE  */
exports.deleteMedia = async (req,res) => {
    try {
        Media.findByIdAndDelete(req.params.id,(err,media) => {
            if (err) {
                console.error(err);
                return res.status(500).json({message: 'Erreur lors de la suppression du média'});
            }
            if (media) {
                return res.status(200).json(media)
            } else {
                return res.status(404).json({message: 'Aucun média trouvé'})
            }
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({message: 'Erreur lors de la suppression du média'});
    }
}



/*    FONCTION POUR AJOUTER TOUTES LES CHANSON DE ZACK */
function addZackSongs() {
    try {
        const s3 = new AWS.S3()
        const uploadS3 = async (params) => {
            return s3.upload(params).promise()
        }

        function parcourirDossier(dossier) {
            const fichiers = [];

            // Liste le contenu du dossier
            const contenuDossier = fs.readdirSync(dossier);

            contenuDossier.forEach((element) => {
                const chemin = path.join(dossier, element);

                // Vérifie si l'élément est un dossier
                if (fs.statSync(chemin).isDirectory()) {
                    // Si c'est un dossier, parcourt récursivement
                    fichiers.push(...parcourirDossier(chemin));
                } else {
                    // Si c'est un fichier, ajoute les informations à la liste
                    fichiers.push({
                        filename: element,
                        path: chemin,
                    });
                }
            });

            return fichiers;
        }

        const dossierDeDepart = __dirname+"/../uploads/allSongs";
        const fichiersTrouves = parcourirDossier(dossierDeDepart);

        console.log("nombre fichiers : ",fichiersTrouves.length)

        async function traiterFichiers(index) {

            if (index >= fichiersTrouves.length) {
                console.log("fin du traitement des fichiers");
                return;
            }

            const fichier = fichiersTrouves[index];

            console.log("Traite fichier : ",index,"  --  ",fichier.path);

            try {
                const metadata = await mm.parseFile(fichier.path);
                let album;
                let allArtists = [];

                if(metadata.common.album !== undefined){
                    console.log("Gestion album")
                    if(metadata.common.albumartist === undefined)metadata.common.albumartist = metadata.common.artist
                    //création/ajout à l'album
                    await Playlist.findOne({isAlbum : true, name:metadata.common.album, creator:metadata.common.albumartist})
                      .then((result) => {
                          album = result;
                      })
                      .catch((error) => {
                          // Gérez les erreurs ici
                          console.error('Erreur lors de la recherche d\'album :', error);
                      });
                    if(album === null){
                        const uploadThumbParams = {
                            Bucket: 'spotifake-ral',
                            Key: `playlist/thumb_${metadata.common.album}`,
                            Body: metadata.common.picture[0].data,
                        }

                        await uploadS3(uploadThumbParams).then(async (data) => {
                            album = new Playlist({
                                name: metadata.common.album === undefined ? "undefined" : metadata.common.album,
                                createdAt: metadata.common.date === undefined ? "undefined" : metadata.common.date,
                                creator: metadata.common.albumartist === undefined ? "undefined" : metadata.common.albumartist,
                                media: [],
                                thumbnail: data.Location === undefined ? "undefined" : data.Location,
                                isAlbum: true
                            });

                            return album.save()
                        }).then((savedAlbum) => {
                            album = savedAlbum;
                        }).catch((error) => {
                            console.error('Une erreur est survenue lors du téléversement du thumbnail:', error);
                            return res.status(500).send(`Erreur lors du téléversement du thumbnail de l'album`);
                        });
                    }

                    //création des artist inconnus
                    console.log("Gestion artists");
                    for (const artist of metadata.common.artists) {
                        let mediaArtist;
                        await Artist.findOne({ name: artist })
                          .then((result) => {
                              mediaArtist = result;
                          })
                          .catch((error) => {
                              // Gérez les erreurs ici
                              console.error('Erreur lors de la recherche d\'artiste :', error);
                          });
                        if (mediaArtist === null){
                            mediaArtist = new Artist({
                                name : artist === undefined ? "undefined" : artist,
                                albums : [],
                                titles : []
                            })
                            mediaArtist = await mediaArtist.save();
                        }
                        allArtists.push(mediaArtist._id)

                        if(metadata.common.albumartist === artist){
                            await Artist.findByIdAndUpdate(mediaArtist._id,{$addToSet:{albums : album._id}})
                        }
                    }
                }

                const uploadMediaParams = {
                    Bucket: 'spotifake-ral',
                    Key: `media/media_${fichier.filename}`,
                    Body: fs.createReadStream(fichier.path),
                };

                console.log("Gestion Media")
                await uploadS3(uploadMediaParams).then(async (data) => {
                    const newMedia = new Media({
                        title: metadata.common.title === undefined ? "undefined" : metadata.common.title,
                        artist: allArtists === undefined ? "undefined" : allArtists,
                        album: album._id === undefined ? "undefined" : album._id,
                        releaseDate: metadata.common.date === undefined ? "undefined" : metadata.common.date,
                        genre: metadata.common.genre === undefined ? "undefined" : metadata.common.genre,
                        storage: data.Location === undefined ? "undefined" : data.Location,
                    });

                    return newMedia.save();
                }).then(async (savedMedia) => {
                    console.log('Création du media réussi:', savedMedia);
                    await Playlist.findByIdAndUpdate(savedMedia._doc.album, {medias: savedMedia._id});
                    for (const artist of savedMedia._doc.artist) {
                        await Artist.findByIdAndUpdate(artist,{titles : savedMedia._id})
                    }
                }).catch((error) => {
                    console.error('Une erreur est survenue lors du téléversement de', fichier.filename, ':', error);
                    return res.status(500).send(`Erreur lors du téléversement de ${fichier.filename}.`);
                });
            } catch (error) {
                console.error('Erreur lors de la lecture des métadonnées :', error.message, fichier.path);
                return res.status(500).send('Erreur lors de la lecture des métadonnées.');
            }

            // Appel récursif pour passer à la prochaine itération
            await traiterFichiers(index + 1);
        }

        traiterFichiers(0)
    } catch (error) {
        console.error('Erreur lors du traitement de la requête :', error);
        return res.status(500).send('Erreur lors du traitement de la requête.');
    }

}
