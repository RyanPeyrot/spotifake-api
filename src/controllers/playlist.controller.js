const Playlist = require("../models/playlist.model");
const Media = require("../models/media.model")
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const fs = require('fs');
const cloudfront = 'https://d2be9zb8yn0dxh.cloudfront.net/';

const uploadS3 = (params) => {
    return s3.upload(params).promise();
};

/* CREATE */
exports.createPlaylist = async (req, res) => {
    try {
        const playlist = new Playlist(req.body);
        const savedPlaylist = await playlist.save();
        res.json(savedPlaylist);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la création de la playlist' });
    }
};


/* GET */

exports.getAll = async (req, res) => {
    try {
        const Playlists = await Playlist.find().populate({ path: 'medias', populate: { path: 'artist', model: 'Artist' } });
        return res.status(200).json(Playlists);
    } catch (error) {
        console.error(error);
        return res.status(500).json({message: 'Erreur lors de la récupération des playlists'});
    }
}

exports.getPlaylistById = async (req, res) => {
    try {
        const playlistId = req.params.id;
        const playlist = await Playlist.findById(playlistId).populate({ path: 'medias', populate: { path: 'artist', model: 'Artist' } });

        if (playlist) {
            return res.status(200).json(playlist);
        } else {
            return res.status(404).json({ message: 'Aucune playlist trouvée' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur lors de la récupération de la playlist' });
    }
};


exports.getByName = async (req,res) => {
    try{

        await Playlist.findOne({name:req.headers.name}).populate({ path: 'medias', populate: { path: 'artist', model: 'Artist' } }).then((doc) => {
            if (doc) {
                return res.status(200).json(doc)
            } else {
                return res.status(404).json({message: 'Aucune playlist trouvé'})
            }
        })
    }catch (error){
        console.error(error);
        return res.status(500).json({ message: 'Erreur lors de la récupération de la playlist' });
    }
}

/* UPDATE */

exports.updatePlaylist = async (req, res) => {
    try {
        const PlaylistId = req.params.id;
        const {nom,creator } = req.body;

        const updatedPlaylist = await Playlist.findByIdAndUpdate(
            PlaylistId,
            {nom, creator },
            { new: true }
        );

        if (!updatedPlaylist) {
            return res.status(404).json({ message: 'Playlist non trouvé' });
        }

        return res.status(200).json(updatedPlaylist);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur lors de la mise à jour de la playlist' });
    }
};

exports.updateThumbnail = async (req, res) => {
    try {
        if (req.file) {
            const uploadMediaParams = {
                Bucket: 'spotifake-ral',
                Key: `playlist/thumbnail_${req.file.originalname}`,
                Body: fs.createReadStream(req.file.path),
            };

            const exist = await Playlist.findById(req.params.id)

            if(exist){
                await uploadS3(uploadMediaParams)
                  .then(async (data) => {

                      const updatedPlaylist = await Playlist.findOneAndUpdate(
                        {_id: req.params.id},
                        {thumbnail: cloudfront + data.Key},
                        {new: true} // Pour renvoyer le document mis à jour
                      );

                      if (updatedPlaylist) {
                          return res.status(200).json(updatedPlaylist);
                      } else {
                          console.error("une erreur est survenue durant l'update de la playlist")
                      }
                  })
                  .catch((err) => {
                      console.error('Erreur lors du téléchargement:', err);
                      res.status(500).json({ message: 'Erreur lors du téléchargement du fichier' });
                  });
            } else {
                return res.status(404).json({message: "Aucune playlist trouvé"});
            }
        } else {
            return res.status(500).json({message:"Aucun fichier transmis"})
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'artiste' });
    }
}

exports.addOneSong = async (req, res) => {
    try {
        const playlistId = req.params.id
        const mediaId = req.body.media

        const exist = await Media.findById(mediaId);
        if(exist){
            const updatedPlaylist = await  Playlist.findByIdAndUpdate(
                playlistId,
                {$addToSet: {medias:mediaId}},
                {new: true}
            );

            if (!updatedPlaylist) {
                return res.status(404).json({ message: 'Playlist non trouvée.' });
            }
            return res.status(200).json(updatedPlaylist);
        } else {
            return res.status(404).json({ message: 'Média non trouvé' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur lors de la mise à jour de la playlist' });
    }
}

/* DELETE */

exports.deletePlaylist = async (req, res) => {
    try {
        const PlaylistId = req.params.id;

        await Playlist.findOneAndDelete(PlaylistId).then(async (doc) => {
            if (doc) {
                for (const mediaId of doc.medias) {
                    await Media.findByIdAndUpdate(mediaId, {album: ''})
                }
                return res.status(200).json({message: 'Playlist supprimé avec succès'});
            } else {
                return res.status(404).json({message: 'Playlist non trouvé'});
            }
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur lors de la suppression de la playlist' });
    }
};

exports.deleteOneSong = async (req, res) => {
    try {
        const playlistId = req.params.id
        const mediaId = req.headers.media

        const exist = await Media.findById(mediaId);
        if(exist){
            const updatedPlaylist = await  Playlist.findByIdAndUpdate(
              playlistId,
              {$pull: {medias:mediaId}},
              {new: true}
            );

            if (!updatedPlaylist) {
                return res.status(404).json({ message: 'Playlist non trouvée.' });
            }
            return res.status(200).json(updatedPlaylist);
        } else {
            return res.status(404).json({ message: 'Média non trouvé' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur lors de la mise à jour de la playlist' });
    }
}
