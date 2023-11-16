const express = require("express");
const router = express.Router();
const controller = require("../controllers/user.controller")
//router.get(<path>,<controller>.<method>)
router.post("/",controller.createUser);
router.get("/:id",controller.getUserById);
router.get("/",controller.getAll);
router.delete("/:id",controller.deleteUser);
router.put("/:id",controller.updateUser);

module.exports = router;


