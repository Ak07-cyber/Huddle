import express from "express";
import mongoose from "mongoose";

import {Server} from "socket.io";
import {createServer} from "node:http";

import { connectToSocket } from "./controllers/socketManager";

import cors from "cors";

const app=express();
const server=createServer(app);// server variable is the main server and any routes to be handled will be handled by the app which is a express instance
const io=connectToSocket(server); //connecting the socket io to the main server and it will handle based on the connection type

app.use(cors());
app.use(express.json({limit:"50kb"}));
app.use(express.urlencoded({limit:"50kb" ,extended:true}));
app.set("port",process.env.PORT || 8000);


const start=async()=>{
    const connectionDb=await mongoose.connect("./");
    if(!connectionDb){
        console.log("Database Connection failed");
        return;
    }
    server.listen(app.get("port"),()=>{

    })
}

