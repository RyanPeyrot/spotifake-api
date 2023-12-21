const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const playlistSchema = mongoose.Schema({
    name : {
        type: String,
        required:true,
    },
    createdAt : {
        type:Date,
        default : Date.now(),
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
        type: String,
        default : 'https://d2be9zb8yn0dxh.cloudfront.net/'
    },
    isAlbum : {
        type: Boolean,
        default : false
    }
})

module.exports = mongoose.model('Playlist', playlistSchema);
