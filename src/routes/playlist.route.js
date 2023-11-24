const express = require("express");
const router = express.Router();
const controller = require("../controllers/playlist.controller")
const path = require("path");
const fs = require("fs");

const uploadDestination = path.join(__dirname, '../uploads/thumbnail');
try {
    await fs.access(chemin, fs.constants.F_OK);
} catch (err) {
    if (err.code === 'ENOENT') {
        // Le chemin n'existe pas, donc nous le créons
        await fs.mkdir(chemin, { recursive: true });
        console.log(`Le dossier ${chemin} a été créé.`);
    } else {
        // Une autre erreur s'est produite
        console.error(`Erreur lors de la vérification du chemin : ${err.message}`);
    }
}

const storage = multer.diskStorage({
    destination: uploadDestination,
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

//router.get(<path>,<controller>.<method>)
router.post("/",controller.createPlaylist);
router.get("/:id",controller.getPlaylistById);
router.get("/",controller.getAll);
router.delete("/:id",controller.deletePlaylist);
router.put("/:id",controller.updatePlaylist);
router.put("/:id",controller.addOneSong);
router.put("/:id",upload.single('file'),controller.editThumbnail)

module.exports = router;
