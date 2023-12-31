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
const logger = require('../utils/logger')
const axios = require('axios');

const uploadS3 = (params) => {
    return s3.upload(params).promise();
};

/* CREATE */
exports.createOne = async(req,res) => {
    try {
        let allArtists = []
        let album;

        if (req.file) {
            try {
                const metadata = await mm.parseFile(req.file.path);

                if(metadata.common.album !== undefined) {
                    if (metadata.common.albumartist === undefined && metadata.common.artist !== undefined) metadata.common.albumartist = metadata.common.artist

                    await Playlist.findOne({
                        isAlbum: true,
                        name: metadata.common.album,
                        creator: metadata.common.albumartist
                    }).then((doc) => {
                        if (doc) {
                            console.log('Album trouvé :', doc);
                            album = doc;
                        } else {
                            console.log('Aucun album existant trouvé.');
                        }
                    })
                    if (album === undefined) {
                        let uploadThumbnailParams;
                        if(metadata.common.picture !== undefined){
                            uploadThumbnailParams = {
                                Bucket: 'spotifake-ral',
                                Key: `media/thumbnail_${path.parse(req.file.originalname).name}.jpg`,
                                Body: metadata.common.picture[0].data,
                            };
                        }
                        let thumbPath;
                        if(uploadThumbnailParams !== undefined){
                            await uploadS3(uploadThumbnailParams).then(async (data) => {
                                thumbPath = cloudfront+data.Key
                            }).then(() => {
                                console.log('Téléversement réussi. Lien du fichier:', path);
                            })
                              .catch((error) => {
                            console.error('Une erreur est survenue lors du téléversement du thumbnail:', error);
                            return res.status(500).send(`Erreur lors du téléversement du thumbnail de l'album`);
                        });
                        }

                            album = new Playlist({
                                name: metadata.common.album || "undefined",
                                ...(metadata.common.date !== undefined && { createdAt: thumbPath }),
                                creator: metadata.common.albumartist || "undefined",
                                media: [],
                                ...(thumbPath !== undefined && { thumbnail: thumbPath }),
                                isAlbum: true
                            });

                            let savedAlbum =  await album.save()
                            console.log('Création de l\'album réussie:', savedAlbum );
                            album = savedAlbum;
                    }
                }

                if(metadata.common.artists !== undefined){
                    //création des artist inconnus
                    for (const artist of metadata.common.artists) {
                        let mediaArtist;
                        await Artist.findOne({ name: artist })
                            .then((doc) => {
                                if(doc){
                                    mediaArtist = doc;
                                    console.log("artist trouvé :",doc)
                                } else {
                                    console.log("Artist pas trouvé en base")
                                }
                            })
                            .catch((error) => {
                                console.error('Erreur lors de la recherche d\'artiste :', error);
                            });
                        if (mediaArtist === undefined){
                            mediaArtist = new Artist({
                                name : artist || "undefined",
                                albums : [],
                                titles : []
                            })
                            mediaArtist = await mediaArtist.save();
                            console.log("Création de l'artist réussi")
                        }
                        allArtists.push(mediaArtist._id)

                        if(metadata.common.album !== undefined && metadata.common.albumartist === artist){
                            await Artist.findByIdAndUpdate(mediaArtist._id,{$addToSet:{albums : album._id}})
                        }
                    }
                }

                const fileName = slugify(path.parse(req.file.originalname).name, { lower: true });
                await new Promise((resolve, reject) => {
                    fluentffmpeg()
                      .input(fs.createReadStream(req.file.path))
                      .audioCodec('vorbis')  // Utiliser le codec AAC pour le format m4a
                      .toFormat('ogg')    // Spécifier le format de sortie
                      .on('end', () => {
                        console.log('Conversion terminée avec succès');
                        resolve();
                    })
                      .on('error', (err) => {
                          console.error('Erreur lors de la conversion :', err);
                          reject(err);
                      })
                      .pipe(fs.createWriteStream(`${path.join(__dirname, '../uploads/media/')}${fileName}.ogg`));
                });

                const uploadMediaParams = {
                    Bucket: 'spotifake-ral',
                    Key: `media/media_${req.file.originalname}`,
                    Body: fs.createReadStream(`${path.join(__dirname, '../uploads/media/')}${fileName}.ogg`),
                };

                let uploadThumbnailParams;
                if(metadata.common.picture !== undefined){
                    uploadThumbnailParams = {
                        Bucket: 'spotifake-ral',
                        Key: `media/thumbnail_${path.parse(req.file.originalname).name}.jpg`,
                        Body: metadata.common.picture[0].data,
                    };
                }

                let mediaPath;
                let thumbnailPath;
                await uploadS3(uploadMediaParams).then(async (data) => {

                    if(uploadThumbnailParams !== undefined){
                        await uploadS3(uploadThumbnailParams).then(async (data) => {
                            thumbnailPath = cloudfront+data.Key
                        })
                    }

                    mediaPath = cloudfront + data.Key;
                    const newMedia = new Media({
                        title: metadata.common.title || "undefined",
                        ...(allArtists !== undefined && { artist: allArtists }),
                        ...(album !== undefined && album._id !== undefined && { album: album._id }),
                        ...(metadata.common.date !== undefined && { releaseDate: metadata.common.date }),
                        storage: mediaPath,
                        ...(thumbnailPath !== undefined && { thumbnail: thumbnailPath }),
                        genre : metadata.common.genre || [],
                        duration : metadata.format.duration || 0
                    });

                    return await newMedia.save();
                }).then(async (savedMedia) => {
                    console.log('Création du media réussi:', savedMedia);
                    if(savedMedia._doc.album !== undefined ){
                        await Playlist.findByIdAndUpdate(savedMedia._doc.album, {$addToSet:{medias: savedMedia._id}});
                    }
                    if(savedMedia._doc.artist !== undefined){
                        for (const artist of savedMedia._doc.artist) {
                            await Artist.findByIdAndUpdate(artist,{$addToSet:{titles : savedMedia._id}})
                        }
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
        console.log("Récuperation des medias réussi")
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
                console.log("requete media getById reussi")
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
                console.log("requete media getByName")
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
        Media.findByIdAndUpdate(req.params.id, req.body, {new: true}).then((doc) => {
            if (doc) {
                console.log("Media Updated")
                return res.status(200).json(doc)
            } else {
                return res.status(404).json({message: 'Aucun média trouvé'})
            }
        })
    } catch (error) {
        console.error(error);
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
                          console.log("Modification du son reussi")
                          return res.status(200).json(updatedMedia);
                      } else {
                          console.error("une erreur est survenue durant l'update du son")
                      }
                  })
                  .catch((err) => {
                      console.error('Erreur lors du téléchargement:', err);
                      res.status(500).json({ message: 'Erreur lors du téléchargement du fichier' });
                  });
            } else {
                return res.status(404).json({message: "Aucun media trouvé"});
            }
        } else {
            return res.status(500).json({message:"Aucun fichier transmis"})
        }
    } catch (error) {
        console.error(error);
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
                          console.log("Thumbnail updated")
                          return res.status(200).json(updatedMedia);
                      } else {
                          console.error("une erreur est survenue durant l'update du media")
                      }
                  })
                  .catch((err) => {
                      console.error('Erreur lors du téléchargement:', err);
                      res.status(500).json({ message: 'Erreur lors du téléchargement du fichier' });
                  });
            } else {
                return res.status(404).json({message: "Aucun media trouvé"});
            }
        } else {
            return res.status(500).json({message:"Aucun fichier transmis"})
        }
    } catch (error) {
        console.error(error);
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
                console.log("Media supprimer")
                return res.status(200).json({message: "Fichier bien supprimer", doc})
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
exports.addZackSongs = async(req,res) =>  {
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
                let metadata;

                try {
                    metadata = await mm.parseFile(fichier.path);
                } catch (error) {
                    console.error("Erreur lors du parsing du fichier :", error);
                }

                let album;
                let allArtists = [];

                if (metadata) {
                    try {

                        if(metadata.common.album !== undefined) {
                            if (metadata.common.albumartist === undefined && metadata.common.artist !== undefined) metadata.common.albumartist = metadata.common.artist

                            await Playlist.findOne({
                                isAlbum: true,
                                name: metadata.common.album,
                                creator: metadata.common.albumartist
                            }).then((doc) => {
                                if (doc) {
                                    console.log('Album trouvé :', doc);
                                    album = doc;
                                } else {
                                    console.log('Aucun album existant trouvé.');
                                }
                            })
                            if (album === undefined) {
                                let uploadThumbnailParams;
                                if(metadata.common.picture !== undefined){
                                    uploadThumbnailParams = {
                                        Bucket: 'spotifake-ral',
                                        Key: `media/thumbnail_${path.parse(fichier.filename).name}.jpg`,
                                        Body: metadata.common.picture[0].data,
                                    };
                                }
                                let thumbPath;
                                if(uploadThumbnailParams !== undefined){
                                    await uploadS3(uploadThumbnailParams).then(async (data) => {
                                        thumbPath = cloudfront+data.Key
                                    }).then(() => {
                                        console.log('Téléversement réussi. Lien du fichier:', path);
                                    })
                                      .catch((error) => {
                                          console.error('Une erreur est survenue lors du téléversement du thumbnail:', error);
                                          return res.status(500).send(`Erreur lors du téléversement du thumbnail de l'album`);
                                      });
                                }

                                album = new Playlist({
                                    name: metadata.common.album || "undefined",
                                    ...(metadata.common.date !== undefined && { createdAt: metadata.common.date }),
                                    creator: metadata.common.albumartist || "undefined",
                                    media: [],
                                    ...(thumbPath !== undefined && { thumbnail: thumbPath }),
                                    isAlbum: true
                                });

                                let savedAlbum =  await album.save()
                                console.log('Création de l\'album réussie:', savedAlbum );
                                album = savedAlbum;
                            }
                        }

                        if(metadata.common.artists !== undefined){
                            //création des artist inconnus
                            for (const artist of metadata.common.artists) {
                                let mediaArtist;
                                await Artist.findOne({ name: artist })
                                  .then((doc) => {
                                      if(doc){
                                          mediaArtist = doc;
                                          console.log("artist trouvé :",doc)
                                      } else {
                                          console.log("Artist pas trouvé en base")
                                      }
                                  })
                                  .catch((error) => {
                                      console.error('Erreur lors de la recherche d\'artiste :', error);
                                  });
                                if (mediaArtist === undefined){
                                    mediaArtist = new Artist({
                                        name : artist || "undefined",
                                        albums : [],
                                        titles : []
                                    })
                                    mediaArtist = await mediaArtist.save();
                                    console.log("Création de l'artist réussi")
                                }
                                allArtists.push(mediaArtist._id)

                                if(metadata.common.album !== undefined && metadata.common.albumartist === artist){
                                    await Artist.findByIdAndUpdate(mediaArtist._id,{$addToSet:{albums : album._id}})
                                }
                            }
                        }

                        const fileName = slugify(path.parse(fichier.filename).name, { lower: true });
                        await new Promise((resolve, reject) => {
                            fluentffmpeg()
                              .input(fs.createReadStream(fichier.path))
                              .audioCodec('vorbis')  // Utiliser le codec AAC pour le format m4a
                              .toFormat('ogg')    // Spécifier le format de sortie
                              .on('end', () => {
                                  console.log('Conversion terminée avec succès');
                                  resolve();
                              })
                              .on('error', (err) => {
                                  console.error('Erreur lors de la conversion :', err);
                                  reject(err);
                              })
                              .pipe(fs.createWriteStream(`${path.join(__dirname, '../uploads/media/')}${fileName}.ogg`));
                        });

                        const uploadMediaParams = {
                            Bucket: 'spotifake-ral',
                            Key: `media/media_${fichier.filename}`,
                            Body: fs.createReadStream(`${path.join(__dirname, '../uploads/media/')}${fileName}.ogg`),
                        };

                        let uploadThumbnailParams;
                        if(metadata.common.picture !== undefined){
                            uploadThumbnailParams = {
                                Bucket: 'spotifake-ral',
                                Key: `media/thumbnail_${path.parse(fichier.filename).name}.jpg`,
                                Body: metadata.common.picture[0].data,
                            };
                        }

                        let mediaPath;
                        let thumbnailPath;
                        await uploadS3(uploadMediaParams).then(async (data) => {

                            if(uploadThumbnailParams !== undefined){
                                await uploadS3(uploadThumbnailParams).then(async (data) => {
                                    thumbnailPath = cloudfront+data.Key
                                })
                            }

                            mediaPath = cloudfront + data.Key;
                            const newMedia = new Media({
                                title: metadata.common.title || "undefined",
                                ...(allArtists !== undefined && { artist: allArtists }),
                                ...(album !== undefined && album._id !== undefined && { album: album._id }),
                                ...(metadata.common.date !== undefined && { releaseDate: metadata.common.date }),
                                storage: mediaPath,
                                ...(thumbnailPath !== undefined && { thumbnail: thumbnailPath }),
                                genre : metadata.common.genre || []
                            });

                            return await newMedia.save();
                        }).then(async (savedMedia) => {
                            console.log('Création du media réussi:', savedMedia);
                            if(savedMedia._doc.album !== undefined ){
                                await Playlist.findByIdAndUpdate(savedMedia._doc.album, {$addToSet:{medias: savedMedia._id}});
                            }
                            if(savedMedia._doc.artist !== undefined){
                                for (const artist of savedMedia._doc.artist) {
                                    await Artist.findByIdAndUpdate(artist,{$addToSet:{titles : savedMedia._id}})
                                }
                            }
                        }).catch((error) => {
                            console.error('Une erreur est survenue lors du téléversement de', fichier.filename, ':', error);
                        });
                    } catch (error) {
                        console.error('Erreur lors de la lecture des métadonnées :', error.message);
                    }
                } else {
                }
            } catch (error) {
                console.error('Erreur lors du traitement de la requête :', error);
            }

            // Appel récursif pour passer à la prochaine itération
            await traiterFichiers(index + 1);
        }

        await traiterFichiers(0)
    } catch (error) {
        console.error('Erreur lors du traitement de la requête :', error);
        return res.status(500).send('Erreur lors du traitement de la requête.');
    }

}
