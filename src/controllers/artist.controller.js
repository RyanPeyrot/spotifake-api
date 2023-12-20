const Artist = require("../models/artist.model")
const AWS = require('aws-sdk');
const fs = require('fs');
const Media = require('../models/media.model');
const s3 = new AWS.S3();
const cloudfront = 'https://d2be9zb8yn0dxh.cloudfront.net/';
const logger = require('../utils/logger')
const uploadS3 = (params) => {
  return s3.upload(params).promise();
};

exports.createOne = async (req,res) => {
  let uploadedFileName
  if (req.file) {
      const uploadMediaParams = {
        Bucket: 'spotifake-ral',
        Key: `artist/thumbnail_${req.file.originalname}`,
        Body: fs.createReadStream(req.file.path),
      };

      await uploadS3(uploadMediaParams)
        .then((data) => {
          uploadedFileName = cloudfront+data.Key;
        })
        .catch((err) => {
          logger.error('Erreur lors du téléchargement:', err);
          res.status(500).json({ message: 'Erreur lors du téléchargement du fichier' });
        });
  }

  try{
    const newArtist = new Artist({
      name : req.body.name,
      albums: req.body.albums,
      titles: req.body.titles,
      thumbnail: req.file !== undefined ? uploadedFileName : cloudfront
    });

    const artists = await newArtist.save();
    if (artists) {
      logger.info("Création de l'artist réussi")
      return res.status(200).json(artists)
    } else {
      return res.status(404).json({message: "Erreur lors de la création"})
    }
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ message: 'Erreur lors de la creation de l\'artist' });
  }
}

exports.getAll = async (req,res) => {
  try{
    Artist.find().populate('titles')
      .populate('albums').then((doc) => {
      if (doc) {
        logger.info("requête artist/getALL réussi")
        return res.status(200).json(doc)
      } else {
        return res.status(404).json({message: "Aucun artists"})
      }
    })
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ message: 'Erreur lors de la recuperation des artists' });
  }
}

exports.getOneById = async (req,res) => {
  try{
    Artist.findById(req.params.id).populate('titles')
      .populate('albums').then((doc) => {
      if (doc) {
        logger.info('Requête artist/getById réussi')
        return res.status(200).json(doc)
      } else {
        return res.status(404).json({message:"Aucun artist trouvé"})
      }
    })
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ message: 'Erreur lors de la recuperation de l\'artist' });
  }
}

exports.getOneByName = async (req,res) => {
  try{
    Artist.findOne({name: req.headers.name}).populate('titles')
      .populate('albums').then((doc) => {
      if (doc) {
        logger.info('Requête Artist/getByName réussi')
        return res.status(200).json(doc)
      } else {
        return res.status(404).json({message:"Aucun artist trouvé"})
      }
    })
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ message: 'Erreur lors de la recuperation de l\'artist' });
  }
}

exports.updateOne = async (req, res) => {
  try {
    const updatedArtist = await Artist.findOneAndUpdate(
      { _id: req.params.id },
      { $set: req.body },
      { new: true } // Pour renvoyer le document mis à jour
    );

    if (updatedArtist) {
      logger.info('Artists updated')
      return res.status(200).json(updatedArtist);
    } else {
      return res.status(404).json({ message: "Aucun artist trouvé" });
    }
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'artiste' });
  }
};

exports.updateThumbnail = async (req, res) => {
  try {
    if (req.file) {
      const uploadMediaParams = {
        Bucket: 'spotifake-ral',
        Key: `artist/thumbnail_${req.file.originalname}`,
        Body: fs.createReadStream(req.file.path),
      };

      const exist = await Artist.findById(req.params.id)

      if(exist){
        await uploadS3(uploadMediaParams)
          .then(async (data) => {

            const updatedArtist = await Artist.findOneAndUpdate(
              {_id: req.params.id},
              {thumbnail: cloudfront + data.Key},
              {new: true} // Pour renvoyer le document mis à jour
            );

            if (updatedArtist) {
              logger.info('Thumbnail updated')
              return res.status(200).json(updatedArtist);
            } else {
              logger.error("une erreur est survenue durant l'update de l'artist")
            }
          })
          .catch((err) => {
            logger.error('Erreur lors du téléchargement:', err);
            res.status(500).json({ message: 'Erreur lors du téléchargement du fichier' });
          });
      } else {
        return res.status(404).json({message: "Aucun artist trouvé"});
      }
    } else {
      return res.status(500).json({message:"Aucun fichier transmis"})
    }
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'artiste' });
  }
}

exports.deleteOne = async (req,res) => {
  try {
    await Artist.findOneAndDelete({ _id: req.params.id }).then(async (doc) => {
      if (doc) {
        for (const mediaId of doc.titles) {
          await Media.findByIdAndUpdate(mediaId, {$pull: {artist: doc._id}})
        }
        logger.info('Artist deleted')
        return res.status(200).json(doc);
      } else {
        return res.status(404).json({message: "Aucun artist trouvé"});
      }
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'artiste' });
  }
}
