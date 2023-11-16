const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const userSchema = mongoose.Schema({
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true,
        trim:true,
        minLength:8,
        maxLength:300
    },
    isAdmin:{
        type:Boolean,
        required:true,
        default:false
    },
    playlists : [{
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Playlists'
        }],
        default: [],
    }]
})

userSchema.path('email').validate(async function (value) {
    const emailCount = await mongoose.models.User.countDocuments({ email: value });
    return !emailCount; // La validation réussit si aucune autre entrée avec le même e-mail n'est trouvée
}, 'Cet e-mail est déjà utilisé.');

module.exports = mongoose.model('User', userSchema)
