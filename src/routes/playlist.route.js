const express = require("express");
const router = express.Router();
const controller = require("../controllers/playlist.controller")
const path = require("path");
const multer = require("multer");

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
router.post("/",controller.createPlaylist);
router.get("/",controller.getAll);
router.get("/name/",controller.getByName);
router.get("/:id",controller.getPlaylistById);
router.delete("/song/:id",controller.deleteOneSong);
router.delete("/:id",controller.deletePlaylist);
router.put("/song/:id",controller.addOneSong);
router.put("/thumbnail/:id",upload.single('file'),controller.updateThumbnail);
router.put("/:id",controller.updatePlaylist);

module.exports = router;
