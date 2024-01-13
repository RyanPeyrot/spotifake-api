const Session = require("../models/session.model")

exports.createSession = async(req,res) => {
  try {
    const newSession = new Session();
    if(req.body.user.isEmpty || req.body.user === ""){
      console.log("erreur non d'utilisateur pour la session : ",req.body.user)
      return res.status(500).json({message:"Veuillez specifié un nom d'utilisateur valide"})
    }
    newSession.users = [req.body.user];
    const session = await newSession.save();
    console.log("Création d'une session");
    res.json(session)
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la création de la session' });
  }
};

exports.joinSession = async(req,res) => {
  try {
    const sessionId = req.params.id;
    const user = req.body.user;

    const updatedSession = await Session.findByIdAndUpdate(sessionId,
      {$addToSet: {users:user}},
      {new: true});

    if(!updatedSession){
      console.log("Session inexistante", sessionId)
      return res.status(404).json({ message: 'session inéxistante.' });
    }

    console.log("Session join")
    return res.status(200).json(updatedSession)

  } catch (error) {
    console.log("erreur lors de l'acces a la sessions",error)
    return res.status(500).json({message:"erreur lors de l'acces a la sessions"})
  }
};

exports.getAllSessions = async(req, res) => {
  try {
    const session = await Session.find();
    return res.status(200).json(session)
  } catch (error) {
    console.log("erreur lors de la recuperations des sessions",error)
    return res.status(500).json({message:"erreur lors de la récuperation des sessions"})
  }
};

exports.getSession = async(req,res) => {
  try {
    const session = await Session.findById(req.params.id);
    if(session === null){
      return res.status(404).json({message:'Session inexistante'})
    }
    return res.status(200).json(session)
  } catch (error) {
    console.log("erreur lors de la recuperations de la session "+req.params.id,error)
    return res.status(500).json({message:"erreur lors de la récuperation de la session"})
  }
};

exports.leaveSession = async(req,res) => {
  try {
    const sessionId = req.params.id;
    const user = req.headers.user;

    const updatedSession = await Session.findByIdAndUpdate(sessionId,
      {$pull: {users:user}},
      {new: true});

    if(!updatedSession){
      console.log("Session inexistante", sessionId)
      return res.status(404).json({ message: 'session inéxistante.' });
    }

    console.log("Session leave")
    if(updatedSession.users.length < 1){
      const deletedSession = await Session.findByIdAndDelete(sessionId)
      if(deletedSession){
        console.log("Session vide supprimée");
        return res.status(200).json("Session vide supprimée")
      } else {
        console.log("Erreur lors de la suppression de la session vide");
        return res.status(500).json("Erreur lors de la suppression de la session vide")
      }
    }
    return res.status(200).json(updatedSession)

  } catch (error) {
    console.log("erreur lors de la sortie de la sessions", error)
    return res.status(500).json({message: "erreur lors de la sortie de la sessions"})
  }
};

exports.deleteSession = async(req,res) => {
  try {
    const sessionId = req.params.id;

    const deletedSession = await Session.findByIdAndDelete(sessionId);

    if(!deletedSession){
      console.log("Session inexistante", sessionId)
      return res.status(404).json({ message: 'session inéxistante.' });
    }

    return res.status(200).json({message: "session supprimer", oldSession:deletedSession})

  } catch (error) {
    console.log("erreur lors de la sortie de la sessions", error)
    return res.status(500).json({message: "erreur lors de la sortie de la sessions"})
  }
};

exports. updateCurrentMedia = async (req, res) => {
  try {
    const sessionId = req.params. id;
    const mediaId = req. body. mediaId;
    const updatedSession = await Session.findByIdAndUpdate(
    sessionId,
      { currentMedia: mediaId },
      { new: true }
  );
    if (!updatedSession) {
      return res.status (404). json ({ message: 'Session non trouvée.'});
    }
      return res.status (200) . json (updatedSession);
    } catch (error) {
      console.error (error);
      return res.status (500). json ({ message: 'Erreur lors de la mise à jour'});
    }
};
