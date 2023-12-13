const express = require("express");
const router = express.Router();
const controller = require("../controllers/artist.controller")


//router.get(<path>,<controller>.<method>)
router.post("/",controller.createOne);
router.get("/",controller.getAll);
router.get("/name/",controller.getOneByName);
router.get("/:id",controller.getOneById);
router.put("/:id",controller.updateOne);
router.delete("/:id",controller.deleteOne);

module.exports = router;
