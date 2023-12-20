const Media = require("../models/media.model")
const Artist = require("../models/artist.model")
const Playlist = require("../models/playlist.model")
const mm = require('music-metadata');
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const fs = require("fs");
const path = require("path")
const fluentffmpeg = require('fluent-ffmpeg');
const slugify = require('slugify');
const cloudfront = 'https://d2be9zb8yn0dxh.cloudfront.net/';
const logger = require('../logger')

const uploadS3 = (params) => {
    return s3.upload(params).promise();
};

/* CREATE */
exports.createOne = async(req,res) => {
    try {
        const s3 = new AWS.S3()
        const uploadS3 = (params) => {
            return s3.upload(params).promise()
        }

        let allArtists = []
        let album;

        if (req.file) {
            try {
                const metadata = await mm.parseFile(req.file.path);

                if(metadata.common.album !== undefined){
                    if(metadata.common.albumartist === undefined)metadata.common.albumartist = metadata.common.artist

                    await Playlist.findOne({isAlbum : true, name:metadata.common.album, creator:metadata.common.albumartist}).then((doc) => {
                        if(doc){
                            logger.info('Album trouvé :', doc);
                            album = doc;
                        } else {
                            logger.info('Aucun album existant trouvé.');
                        }
                    })
                    if(album === undefined){
                        const uploadThumbParams = {
                            Bucket: 'spotifake-ral',
                            Key: `playlist/thumb_${metadata.common.album}`,
                            Body: metadata.common.picture[0].data,
                        }

                        await uploadS3(uploadThumbParams).then(async (data) => {
                            const thumbPath = cloudfront+data.Key;
                            logger.info('Téléversement réussi. Lien du fichier:', path);

                            album = new Playlist({
                                name: metadata.common.album === undefined ? "undefined" : metadata.common.album,
                                createdAt: metadata.common.date === undefined ? "undefined" : metadata.common.date,
                                creator: metadata.common.albumartist === undefined ? "undefined" : metadata.common.albumartist,
                                media: [],
                                thumbnail: thumbPath,
                                isAlbum: true
                            });

                            return await album.save()
                        }).then((savedAlbum) => {
                            logger.info('Création de l\'album réussie:', savedAlbum);
                            album = savedAlbum;
                        }).catch((error) => {
                            logger.error('Une erreur est survenue lors du téléversement du thumbnail:', error);
                            return res.status(500).send(`Erreur lors du téléversement du thumbnail de l'album`);
                        });
                    }

                    //création des artist inconnus
                    for (const artist of metadata.common.artists) {
                        let mediaArtist;
                        await Artist.findOne({ name: artist })
                            .then((doc) => {
                                if(doc){
                                    mediaArtist = doc;
                                    logger.info("artist trouvé :",doc)
                                } else {
                                    logger.info("Artist pas trouvé en base")
                                }
                            })
                            .catch((error) => {
                                logger.error('Erreur lors de la recherche d\'artiste :', error);
                            });
                        if (mediaArtist === undefined){
                            mediaArtist = new Artist({
                                name : artist === undefined ? "undefined" : artist,
                                albums : [],
                                titles : []
                            })
                            mediaArtist = await mediaArtist.save();
                            logger.info("Création de l'artist réussi")
                        }
                        allArtists.push(mediaArtist._id)

                        if(metadata.common.albumartist === artist){
                            await Artist.findByIdAndUpdate(mediaArtist._id,{$addToSet:{albums : album._id}})
                        }
                    }
                }

                const fileName = slugify(path.parse(req.file.originalname).name, { lower: true });
                await new Promise((resolve, reject) => {
                    fluentffmpeg()
                      .input(fs.createReadStream(req.file.path))
                      .audioCodec('aac')  // Utiliser le codec AAC pour le format m4a
                      .toFormat('m4a')    // Spécifier le format de sortie
                      .on('end', () => {
                        logger.info('Conversion terminée avec succès');
                        resolve();
                    })
                      .on('error', (err) => {
                          logger.error('Erreur lors de la conversion :', err);
                          reject(err);
                      })
                      .pipe(fs.createWriteStream(`${path.join(__dirname, '../uploads/media/')}${fileName}.m4a`));
                });

                const uploadMediaParams = {
                    Bucket: 'spotifake-ral',
                    Key: `media/media_${req.file.originalname}`,
                    Body: fs.createReadStream(`${path.join(__dirname, '../uploads/media/')}${fileName}.m4a`),
                };

                const uploadThumbnailParams = {
                    Bucket: 'spotifake-ral',
                    Key: `media/thumbnail_${path.parse(req.file.originalname).name}.jpg`,
                    Body: metadata.common.picture[0].data,
                };

                let mediaPath;
                let thumbnailPath;
                await uploadS3(uploadMediaParams).then(async (data) => {

                    await uploadS3(uploadThumbnailParams).then(async (data) => {
                        thumbnailPath = cloudfront+data.Key
                    })

                    mediaPath = cloudfront + data.Key;
                    const newMedia = new Media({
                        title: metadata.common.title === undefined ? "undefined" : metadata.common.title,
                        artist: allArtists === undefined ? "undefined" : allArtists,
                        album: album._id === undefined ? "undefined" : album._id,
                        releaseDate: metadata.common.date === undefined ? "undefined" : metadata.common.date,
                        storage: mediaPath,
                        thumbnail:thumbnailPath
                    });

                    return await newMedia.save();
                }).then(async (savedMedia) => {
                    logger.info('Création du media réussi:', savedMedia);
                    await Playlist.findByIdAndUpdate(savedMedia._doc.album, {$addToSet:{medias: savedMedia._id}});
                    for (const artist of savedMedia._doc.artist) {
                        await Artist.findByIdAndUpdate(artist,{$addToSet:{titles : savedMedia._id}})
                    }
                    res.status(201).json(savedMedia);
                }).catch((error) => {
                    logger.error('Une erreur est survenue lors du téléversement de', req.file.originalname, ':', error);
                    return res.status(500).send(`Erreur lors du téléversement de ${req.file.originalname}.`);
                });
            } catch (error) {
                logger.error('Erreur lors de la lecture des métadonnées :', error.message);
               return  res.status(500).send('Erreur lors de la lecture des métadonnées.');
            }
        } else {
            return res.status(400).send("Aucun fichier");
        }
    } catch (error) {
        logger.error('Erreur lors du traitement de la requête :', error);
        return res.status(500).send('Erreur lors du traitement de la requête.');
    }
}


/* GET */
exports.getAll = async(req,res) => {
    try {
        const medias = await Media.find().populate('artist')
          .populate('album');
        logger.info("Récuperation des medias réussi")
        return res.status(200).json(medias);
    } catch (error) {
        logger.error(error);
        return res.status(500).json({message: 'Erreur lors de la récupération des média'});
    }
}

exports.getOneById = async (req,res) => {
    try{
        Media.findById(req.params.id).populate('artist')
          .populate('album').then((doc) => {
            if (doc) {
                logger.info("requete media/getById reussi")
                return res.status(200).json(doc)
            } else {
                return res.status(404).json({message: 'Aucun média trouvé'})
            }
        })
    }catch (error){
        logger.error(error);
        return res.status(500).json({message: 'Erreur lors de la récupération des média'});
    }
}

exports.getOneByName = async (req,res) => {
    try {
        Media.findOne({title: req.headers.title}).populate('artist')
          .populate('album').then((doc) => {
            if (doc) {
                logger.info("requête media/getByName")
                return res.status(200).json(doc)
            } else {
                return res.status(404).json({message: 'Aucun média trouvé'})
            }
        })
    } catch (error) {
        logger.error(error);
        return res.status(500).json({message: 'Erreur lors de la récupération des média'});
    }
}

/* UPDATE */
exports.updateMedia = async (req,res) => {
    try {
        Media.findByIdAndUpdate(req.params.id, req.body, {new: true},(err,media) => {
            if (err) {
                logger.error(err);
                return res.status(500).json({message: 'Erreur lors de l\'update du média'});
            }
            if (media) {
                logger.info("Media Updated")
                return res.status(200).json(media)
            } else {
                return res.status(404).json({message: 'Aucun média trouvé'})
            }
        })
    } catch (error) {
        logger.error(error);
        return res.status(500).json({message: 'Erreur lors de l\'update du média'});
    }
}

exports.updateSong = async (req, res) => {
    try {
        if (req.file) {
            const uploadMediaParams = {
                Bucket: 'spotifake-ral',
                Key: `media/media_${req.file.originalname}`,
                Body: fs.createReadStream(req.file.path),
            };

            const exist = await Media.findById(req.params.id)

            if(exist){
                await uploadS3(uploadMediaParams)
                  .then(async (data) => {

                      const updatedMedia = await Media.findOneAndUpdate(
                        {_id: req.params.id},
                        {storage: cloudfront + data.Key},
                        {new: true} // Pour renvoyer le document mis à jour
                      );

                      if (updatedMedia) {
                          logger.info("Modification du son réussi")
                          return res.status(200).json(updatedMedia);
                      } else {
                          logger.error("une erreur est survenue durant l'update du son")
                      }
                  })
                  .catch((err) => {
                      logger.error('Erreur lors du téléchargement:', err);
                      res.status(500).json({ message: 'Erreur lors du téléchargement du fichier' });
                  });
            } else {
                return res.status(404).json({message: "Aucun media trouvé"});
            }
        } else {
            return res.status(500).json({message:"Aucun fichier transmis"})
        }
    } catch (error) {
        logger.error(error);
        return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'artiste' });
    }
}

exports.updateThumbnail = async (req, res) => {
    try {
        if (req.file) {
            const uploadMediaParams = {
                Bucket: 'spotifake-ral',
                Key: `media/thumbnail_${req.file.originalname}`,
                Body: fs.createReadStream(req.file.path),
            };

            const exist = await Media.findById(req.params.id)

            if(exist){
                await uploadS3(uploadMediaParams)
                  .then(async (data) => {

                      const updatedMedia = await Media.findOneAndUpdate(
                        {_id: req.params.id},
                        {thumbnail: cloudfront + data.Key},
                        {new: true} // Pour renvoyer le document mis à jour
                      );

                      if (updatedMedia) {
                          logger.info("Thumbnail updated")
                          return res.status(200).json(updatedMedia);
                      } else {
                          logger.error("une erreur est survenue durant l'update du media")
                      }
                  })
                  .catch((err) => {
                      logger.error('Erreur lors du téléchargement:', err);
                      res.status(500).json({ message: 'Erreur lors du téléchargement du fichier' });
                  });
            } else {
                return res.status(404).json({message: "Aucun media trouvé"});
            }
        } else {
            return res.status(500).json({message:"Aucun fichier transmis"})
        }
    } catch (error) {
        logger.error(error);
        return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'artiste' });
    }
}

/*  DELETE  */
exports.deleteMedia = async (req,res) => {
    try {
        await Media.findByIdAndDelete(req.params.id).then(async (doc) => {
            if (doc) {
                for (const artistId of doc.artist) {
                    await Artist.findByIdAndUpdate(artistId, {$pull: {titles: doc._id}})
                }
                await Playlist.findByIdAndUpdate(doc.album,{$pull:{medias:doc._id}})
                logger.info("Média supprimer")
                return res.status(200).json({message: "Fichier bien supprimer", doc})
            } else {
                return res.status(404).json({message: 'Aucun média trouvé'})
            }
        })
    } catch (error) {
        logger.error(error);
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

        logger.info("nombre fichiers : ",fichiersTrouves.length)

        async function traiterFichiers(index) {

            if (index >= fichiersTrouves.length) {
                logger.info("fin du traitement des fichiers");
                return;
            }

            const fichier = fichiersTrouves[index];

            logger.info("Traite fichier : ",index,"  --  ",fichier.path);

            try {
                const metadata = await mm.parseFile(fichier.path);
                let album;
                let allArtists = [];

                if(metadata.common.album !== undefined){
                    logger.info("Gestion album")
                    if(metadata.common.albumartist === undefined)metadata.common.albumartist = metadata.common.artist
                    //création/ajout à l'album
                    await Playlist.findOne({isAlbum : true, name:metadata.common.album, creator:metadata.common.albumartist})
                      .then((result) => {
                          album = result;
                      })
                      .catch((error) => {
                          // Gérez les erreurs ici
                          logger.error('Erreur lors de la recherche d\'album :', error);
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
                            logger.error('Une erreur est survenue lors du téléversement du thumbnail:', error);
                            return res.status(500).send(`Erreur lors du téléversement du thumbnail de l'album`);
                        });
                    }

                    //création des artist inconnus
                    logger.info("Gestion artists");
                    for (const artist of metadata.common.artists) {
                        let mediaArtist;
                        await Artist.findOne({ name: artist })
                          .then((result) => {
                              mediaArtist = result;
                          })
                          .catch((error) => {
                              // Gérez les erreurs ici
                              logger.error('Erreur lors de la recherche d\'artiste :', error);
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

                logger.info("Gestion Media")
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
                    logger.info('Création du media réussi:', savedMedia);
                    await Playlist.findByIdAndUpdate(savedMedia._doc.album, {medias: savedMedia._id});
                    for (const artist of savedMedia._doc.artist) {
                        await Artist.findByIdAndUpdate(artist,{titles : savedMedia._id})
                    }
                }).catch((error) => {
                    logger.error('Une erreur est survenue lors du téléversement de', fichier.filename, ':', error);
                    return res.status(500).send(`Erreur lors du téléversement de ${fichier.filename}.`);
                });
            } catch (error) {
                logger.error('Erreur lors de la lecture des métadonnées :', error.message, fichier.path);
                return res.status(500).send('Erreur lors de la lecture des métadonnées.');
            }

            // Appel récursif pour passer à la prochaine itération
            await traiterFichiers(index + 1);
        }

        traiterFichiers(0)
    } catch (error) {
        logger.error('Erreur lors du traitement de la requête :', error);
        return res.status(500).send('Erreur lors du traitement de la requête.');
    }

}
