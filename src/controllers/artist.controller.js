const Artist = require("../models/artist.model")

exports.createOne = async (req,res) => {
  try{
    const newArtist = new Artist({
      name : req.body.name,
      albums: req.body.albums,
      titles: req.body.titles,
      thumbnail: req.body.thumbnail != undefined ? req.body.thumbnail : 'https://d2be9zb8yn0dxh.cloudfront.net/'
    });

    const artists = await newArtist.save();
    if (artists) {
      return res.status(200).json(artists)
    } else {
      return res.status(404).json({message: "Erreur lors de la création"})
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Erreur lors de la creation de l\'artist' });
  }
}

exports.getAll = async (req,res) => {
  try{
    Artist.find().populate('titles')
      .populate('albums').then((doc) => {
      if (doc) {
        return res.status(200).json(doc)
      } else {
        return res.status(404).json({message: "Aucun artists"})
      }
    })
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Erreur lors de la recuperation des artists' });
  }
}

exports.getOneById = async (req,res) => {
  try{
    Artist.findById(req.params.id).populate('titles')
      .populate('albums').then((doc) => {
      if (doc) {
        return res.status(200).json(doc)
      } else {
        return res.status(404).json({message:"Aucun artist trouvé"})
      }
    })
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Erreur lors de la recuperation de l\'artist' });
  }
}

exports.getOneByName = async (req,res) => {
  try{
    Artist.findOne({name: req.headers.name}).populate('titles')
      .populate('albums').then((doc) => {
      if (doc) {
        return res.status(200).json(doc)
      } else {
        return res.status(404).json({message:"Aucun artist trouvé"})
      }
    })
  } catch (error) {
    console.error(error);
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
      return res.status(200).json(updatedArtist);
    } else {
      return res.status(404).json({ message: "Aucun artist trouvé" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'artiste' });
  }
};

exports.deleteOne = async (req,res) => {
  try {
    const deletedArtist = await Artist.findOneAndDelete({ _id: req.params.id });

    if (deletedArtist) {
      return res.status(200).json(deletedArtist);
    } else {
      return res.status(404).json({ message: "Aucun artist trouvé" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'artiste' });
  }
}
