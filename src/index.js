const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const app = express();
const apiRouter = require('./routes/index');
const cors = require('cors');
const aws = require("aws-sdk");
const http = require('http');
const socketIo = require('socket.io');

//const logger = require('./utils/logger')
require('dotenv').config();

//app.use(require('morgan')('combined', { stream: logger.stream }));

mongoose.set('strictQuery',false);
app.use(bodyParser.json());

app.use(cors());
const httpServer = http.createServer(app)
const io = new socketIo.Server(httpServer, {
    cors: {
        origin: "*"
    }
});

io.on('connection', (socket) => {
    console.log('Un utilisateur est connecté');

    socket.on("joinSession", (sessionId) => {
        socket.join(sessionId);
        console.log("un utilisateur à rejoins la session: ",sessionId)
    })
    socket.on('updateMedia', async (sessionId, mediaId) => {
        try {
            // Mettre à jour la session avec le nouveau média
            const updatedSession = await Session.findByIdAndUpdate(
                sessionId,
                { currentMedia: mediaId},
                { new: true }
            );


            if (!updatedSession) {
                // Gérer le cas où la session n'est pas trouvée
                socket.emit('updateError', 'Session non trouvée.');
                return;
            }

            // Notifier tous les clients connectés à cette session
            io.to(sessionId) .emit ('mediaUpdated', updatedSession);
        } catch (error) {
            console.error('Erreur lors de la mise à jour du média :', error);
            socket.emit('updateError', 'Erreur lors de la mise à jour du média')
        }
    });

    socket.on('disconnect', () => {
        console.log('Un utilisateur est déconnecté');
    });
});

mongoose.connect(`mongodb+srv://${process.env.DBUSER}:${process.env.DBPASS}@${process.env.DBCLUSTER}.vfjzeo9.mongodb.net/spotifakedb2?retryWrites=true&w=majority
`).then(()=>{
    console.log("Connection successfull");
}).catch(err=>console.error(err));

app.use('/spotifake-ral/v1',apiRouter)
httpServer.listen(process.env.PORT,function (){
    console.log("server launch");
});

aws.config.update({
    accessKeyId:process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY,
    region:process.env.AWS_REGION
})
