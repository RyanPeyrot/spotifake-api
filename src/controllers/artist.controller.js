const Artist = require("../models/artist.model")

exports.createOne = async (req,res) => {
  try{
    await Artist.create((err, artists) => {
      if (artists) {
        return res.status(200).json(artists)
      } else {
        return res.status(404).json({message: "Aucun artists"})
      }
    })
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

exports.updateOne = async (req,res) => {
  try{
    Artist.findByIdAndUpdate(req.params.id,req.body,(err,artist) => {
      if(artist){
        return res.status(200).json(artist)
      } else {
        return res.status(404).json({message:"Aucun artist trouvé"})
      }
    })
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Erreur lors de la mise a jour de l\'artist' });
  }
}

exports.deleteOne = async (req,res) => {
  try{
    Artist.findByIdAndDelete(req.params.id,req.body,(err,artist) => {
      if(artist){
        return res.status(200).json(artist)
      } else {
        return res.status(404).json({message:"Aucun artist trouvé"})
      }
    })
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Erreur lors de la suppression de l\'artist' });
  }
}
