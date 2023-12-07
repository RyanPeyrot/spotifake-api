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
        required: true
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
    }
})

module.exports = mongoose.model('Media', mediaSchema);
