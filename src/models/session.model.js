const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const sessionSchema = mongoose.Schema({
  users : [{
    type: String,
  }]
})

module.exports = mongoose.model('Session', sessionSchema);
