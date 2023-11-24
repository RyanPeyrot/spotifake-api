const Playlist = require("../models/playlist.model");
const Media = require("../models/media.model")
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path')

/* CREATE */
exports.createPlaylist = async (req, res) => {
    try {
        const newPlaylist = new Playlist({
            nom : req.body.nom,
            createdAt: req.body.createdAt,
            creator: req.body.creator,
            media:[],
            thumbnail:"", //TODO : récuperer une image de base.
            isAlbum:req.body.isAlbum,
        });

        const savedPlaylist = await newPlaylist.save();
        res.status(201).json(savedPlaylist);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la création de la playlist' });
    }
};


/* GET */

exports.getAll = async (req, res, next) => {
    try {
        const Playlists = await Playlist.find();
        res.status(200).json(Playlists);
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Erreur lors de la récupération des playlists'});
    }
}

exports.getPlaylistById = async (req, res) => {
    try {
        const PlaylistId = req.params.id;

        const playlist = await Playlist.findById(PlaylistId);

        if (!playlist) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        res.status(200).json(playlist);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la récupération de la playlist' });
    }
};

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

        res.status(200).json(updatedPlaylist);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour de la playlist' });
    }
};

exports.addOneSong = async (req, res) => {
    try {
        const playlistId = req.params.id
        const mediaId = req.body.media.id //TODO enlever le find by et le .id si on transmet le media complet dans la requete.

        const media = await Media.findById(mediaId);
        if(media){
            const updatedPlaylist = await  Playlist.findByIdAndUpdate(
                playlistId,
                {$push: {media:media}},
                {new: true}
            );

            if (!updatedPlaylist) {
                return res.status(404).json({ message: 'Playlist non trouvée.' });
            }
            res.status(200).json(updatedPlaylist);
        } else {
            return res.status(404).json({ message: 'Média non trouvé' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour de la playlist' });
    }
}

exports.editThumbnail = async (req, res) => {
    try{
        //TODO : Penser à rename le fichier en front au bon format.
        const s3 = new AWS.S3()


        const uploadParams = {
            Bucket: 'spotifake-ral',
            Key: req.file.originalname,
            Body: fs.createReadStream('../uploads/playlist/',req.file.filename),
        };

        s3.upload(uploadParams, (err,data) => {
            if (err) {
                console.error('Erreur lors du téléversement:', err);
                // Gérer l'erreur et renvoyer une réponse appropriée
            } else {
                console.log('Téléversement réussi. Lien du fichier:', data.Location);
                // Renvoyer une réponse réussie ou effectuer d'autres actions nécessaires
            }
        });

        const playlistId = req.params.id
        const mediaId = req.body.media

        const thumbnail = await Media.findOne({id : mediaId}, 'thumbnail')
        if(thumbnail){
            const updatedPlaylist = await Playlist.findOneAndUpdate(
                playlistId,
                {thumbnail:thumbnail},
                {new : true}
            )

            if(!updatedPlaylist){
                return res.status(404).json({message : "Erreur lors de l'update de la playlist"})
            }
            res.status(200).json(updatedPlaylist);
        } else {
            return res.status(404).json({message : "Error lors de la récupération de la thumbnail"})
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour de la playlist' });
    }
}


/* DELETE */

exports.deletePlaylist = async (req, res) => {
    try {
        const PlaylistId = req.params.id;

        const deletedPlaylist = await Playlist.findOneAndDelete(PlaylistId);

        if (!deletedPlaylist) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la suppression de l\'utilisateur' });
    }
};
