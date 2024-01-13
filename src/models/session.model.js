const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const sessionSchema = mongoose.Schema({
  users : [{
    type: String,
  }],
  currentMedia: {
    type: mongoose.Schema.Types.ObjectId,
    ref:'Media',
    default:null
  }
})

module.exports = mongoose.model('Session', sessionSchema);
