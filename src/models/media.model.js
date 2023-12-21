const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const mediaSchema = mongoose.Schema({
    title : {
        type: String,
        required:true,
    },
    artist : [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Artist'
    }],
    album : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Playlist'
    },
    releaseDate : {
        type: Date,
    },
    genre : [{
        type: String,
        required: true
    }],
    listenCount : {
        type: Number,
        default : 0
    },
    storage : {
        type : String,
        required : true
    },
    thumbnail : {
        type : String,
        default : 'https://d2be9zb8yn0dxh.cloudfront.net/'
    },
    duration : {
        type : Number,
        required : true,
    },
    createdAt : {
        type:Date,
        default : Date.now(),
        immutable: true,

    }
})

module.exports = mongoose.model('Media', mediaSchema);
