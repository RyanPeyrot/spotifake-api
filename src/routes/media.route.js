const express = require("express");
const router = express.Router();
const controller = require("../controllers/media.controller")
const multer = require("multer");
const path = require('path');


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Définir le dossier de destination
        cb(null, path.join(__dirname, '../uploads/media/'));
    },
    filename: (req, file, cb) => {
        // Utiliser le nom d'origine du fichier
        cb(null, file.originalname);
    },
});

const upload = multer({ storage: storage });

//router.get(<path>,<controller>.<method>)
router.post("/",upload.single('file'),controller.createOne);
//router.get("/zack/",controller.addZackSongs);
router.get("/title/",controller.getOneByName);
router.get("/",controller.getAll);
router.get("/:id",controller.getOneById);
router.put("/song/:id",upload.single('file'),controller.updateSong);
router.put("/thumbnail/:id",upload.single('file'),controller.updateThumbnail);
router.put("/:id",controller.updateMedia);
router.delete("/:id",controller.deleteMedia);

module.exports = router;
