import { Server } from "socket.io";

let connections={}; //stores the path{room id} : and the socket.id of every user in the particular room;
let messages={}; //stores all the chat history of the particular room in the format "path": [{sender ,data,socket.id}], stores chat history per room 
let timeOnline={}; //stores when a user joined (used for duration/states);

export const connectToSocket=(Server)=>{
    //attaching Socket.io to the exisiting HTTP server
    const io=new Server(server);

    io.on("connection",(socket)=>{ //Runs once for Each Connected User
        console.log("user Connected:", socket.id)
        
        socket.on("join-call",(path)=>{//path here the link
            
            //creating room if no rooms exists to join
            if(!connections[path]){
                connections[path]=[];
            }

            //adding the user's socket id to the room path provided
            connections[paths].push(socket.id);

            //storing the joining time of the user
            timeOnline[socketid]=new Date();

            //notifying all the users in the existing room that a new user joined
            connections[path].array.forEach((socketid) => {
                io.to(socketid).emit(
                    "user-joined",
                    socket.id,
                    connections[path] //lists all the user in the room
                );
            });

            //providing all the previous chat to the new user if it exists;
            if(messages[path]){//message exists
                messages[path].array.forEach((message) => {
                    io.to(socketid).emit(
                        "chat-message",
                        msg.data,
                        msg.sender,   // username of the sender
                        msg.socketid //sender id
                    );
                });
            }

        });

        

    })

    return io;
}  