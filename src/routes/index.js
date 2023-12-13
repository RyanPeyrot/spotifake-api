const express = require("express");
const router = express.Router();

const userRouter = require('./user.route')
const playlistRouter = require('./playlist.route')
const mediaRouter = require('./media.route')
const artistsRouter = require('./artist.route')

router.use('/users',userRouter);
router.use('/playlists',playlistRouter);
router.use('/medias',mediaRouter);
router.use('/artists',artistsRouter);


module.exports = router;
