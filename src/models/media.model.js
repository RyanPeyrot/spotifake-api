const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const mediaSchema = mongoose.Schema({})

module.exports = mongoose.model('Media', mediaSchema);
