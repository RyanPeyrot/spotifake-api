const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const app = express();
const apiRouter = require('./routes/index');
const cors = require('cors');
require('dotenv').config();

mongoose.set('strictQuery',false);
app.use(bodyParser.json());

app.use(cors());
mongoose.connect(`mongodb+srv://${process.env.DBUSER}:${process.env.DBPASS}@${process.env.DBCLUSTER}.vfjzeo9.mongodb.net/?retryWrites=true&w=majority
`).then(()=>{
    console.log("Connection successfull");
}).catch(err=>console.log(err));

app.use('/spotifake-ral/v1',apiRouter)
app.listen(process.env.PORT,function (){
    console.log("server launch");
});
