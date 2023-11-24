const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const playlistSchema = mongoose.Schema({
    nom : {
        type: String,
        required:true,
    },
    createdAt : {
        type: Date,
        required: true,
    },
    creator : {
        type: String,
        required: true,
    },
    medias : [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media'
    }],
    thumbnail: {
        type: String
    },
    isAlbum : {
        type: Boolean
    }
})

module.exports = mongoose.model('Playlist', playlistSchema);
