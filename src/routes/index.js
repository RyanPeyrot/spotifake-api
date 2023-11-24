const express = require("express");
const router = express.Router();

const userRouter = require('./user.route')
const playlistRouter = require('./playlist.route')

router.use('/users',userRouter);
router.use('/playlists',playlistRouter);

module.exports = router;
