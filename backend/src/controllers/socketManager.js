import { Server } from "socket.io";

let connections={}; //stores the path{room id} : and the socket.id of every user in the particular room;
let messages={}; //stores all the chat history of the particular room in the format "path": [{sender ,data,socket.id}], stores chat history per room 
let timeOnline={}; //stores when a user joined (used for duration/states);

export const connectToSocket=(Server)=>{
    //attaching Socket.io to the exisiting HTTP server
    const io=new Server(server,{
        cors:{
            origin:"* ",
            methods:["GET","POST"],
            allowedHeaders:["*"],
            credentials:true
        }
    });

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

        //WEBRTC SIGNALING(p2p handshake) we are using the peer 2 peer architecture
        socket.on("signal",(tosocketId,signalData)=>{
            //forwarding the WEBRTC signal to the target peer
            io.to(tosocketId).emit(
                "signal",   //event name
                socket.id,  //sender socket id
                signalData //offer /answer
            );
        });

        //chat message Handling
        socket.on("chat-message",(data,sender)=>{
            let roomFound=null;

            //finding which room does the socket belongs to forward the message to all the members of the room
            for(const[room,sockets] of Object.entries(connections)){
                if(sockets.includes(socket.id)){
                    roomFound=room; //path 
                    break;
                }
            }

            //if socket is not part of any room ,ignore
            if(!roomFound) return ;

            //create a message array for the if it doesnt exist
            if(!messages[roomFound]){
                messages[roomFound]=[];
            }

            //storing the message in memory 
            messages[roomFound].push({
                sender:sender,
                data:data,
                socketId:socket.id
            });

            console.log(`Message in ${roomFound}`,sender,data);

            //broadcasting the message to all the existing user of the room in which the message came
            connections[roomFound].forEach((socketId)=>{
                io.to(socketId).emit(
                    "chat-message",
                    data,
                    sender,
                    socket.id
                );
            });
        });

        //Disconnect Handling//
        socket.on("disconnect",()=>{
            console.log("user Disconnected:" ,socket.id);

            //remove socket from all the rooms...
            for(const room in connections){

            }
            delete timeOnline[socket.id];
        });
    });

    return io;
} ; 