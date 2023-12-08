const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const artistSchema = mongoose.Schema({
    name:{
        type: String,
        required:true,
    },
    albums:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Playlist'
    }],
    titles :[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media'
    }]
})

module.exports = mongoose.model('Artist', artistSchema);
