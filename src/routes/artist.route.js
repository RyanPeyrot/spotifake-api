const express = require("express");
const router = express.Router();
const controller = require("../controllers/artist.controller")
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Définir le dossier de destination
    cb(null, path.join(__dirname, '../uploads/thumbnail/'));
  },
  filename: (req, file, cb) => {
    // Utiliser le nom d'origine du fichier
    cb(null, file.originalname);
  },
});

// Multer configuration
const upload = multer({ storage: storage });

//router.get(<path>,<controller>.<method>)
router.post("/",upload.single('file'),controller.createOne);
router.get("/",controller.getAll);
router.get("/name/",controller.getOneByName);
router.get("/:id",controller.getOneById);
router.put("/:id",controller.updateOne);
router.delete("/:id",controller.deleteOne);

module.exports = router;
