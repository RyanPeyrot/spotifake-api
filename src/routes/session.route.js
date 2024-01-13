const express = require("express");
const router = express.Router();
const controller = require("../controllers/session.controller")

router.post("/",controller.createSession)
router.put("/:id",controller.joinSession)
router.get("/:id",controller.getSession)
router.get("/",controller.getAllSessions)
router.delete("/user/:id",controller.leaveSession)
router.delete("/:id",controller.deleteSession)
router.put("/:id/media", controller.updateCurrentMedia)

module.exports = router;
