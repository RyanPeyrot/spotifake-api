const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const app = express();
const apiRouter = require('./routes/index');
const cors = require('cors');
const aws = require("aws-sdk");
import { createServer } from "http";
import { Server } from "socket.io";

//const logger = require('./utils/logger')
require('dotenv').config();

//app.use(require('morgan')('combined', { stream: logger.stream }));

mongoose.set('strictQuery',false);
app.use(bodyParser.json());

app.use(cors());

const httpServer = createServer();

// Initialisation du serveur socket.io sur le serveur HTTP.
// Configuration pour autoriser les requêtes CORS depuis localhost:3000.
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000"
    }
});

// Un objet Map pour stocker les utilisateurs connectés.
const users = new Map();

// Événement déclenché lorsqu'un nouveau client se connecte.
io.on('connection', (socket) => {


    // Lorsqu'un client envoie son nom d'utilisateur après la connexion.
    socket.on('register', (username) => {
        // Stocker le nom d'utilisateur avec l'ID du socket correspondant.
        users.set(socket.id, username);
        console.log(`${username} s'est connecté`);
    });

    // Lorsqu'un client se déconnecte.
    socket.on('disconnect', () => {
        // Récupérer le nom d'utilisateur à partir de l'ID du socket, ou utiliser 'Anonyme'.
        const username = users.get(socket.id) || 'Anonyme';
        console.log(`${username} s'est déconnecté`);

        // Supprimer l'utilisateur de la liste.
        users.delete(socket.id);
    });

    // Lorsqu'un client partage une musique.
    socket.on('shareTime', (musique) => {
        // Diffuser la musique à tous les clients connectés.
        io.emit('shareTime', musique);
    });
});
mongoose.connect(`mongodb+srv://${process.env.DBUSER}:${process.env.DBPASS}@${process.env.DBCLUSTER}.vfjzeo9.mongodb.net/spotifakedb2?retryWrites=true&w=majority
`).then(()=>{
    console.log("Connection successfull");
}).catch(err=>console.error(err));

app.use('/spotifake-ral/v1',apiRouter)
app.listen(process.env.PORT,function (){
    console.log("server launch");
});

aws.config.update({
    accessKeyId:process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY,
    region:process.env.AWS_REGION
})
