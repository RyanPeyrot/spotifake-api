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
    }],
    thumbnail : {
        type:String,
        default : 'https://d2be9zb8yn0dxh.cloudfront.net/'
    }
})

module.exports = mongoose.model('Artist', artistSchema);
