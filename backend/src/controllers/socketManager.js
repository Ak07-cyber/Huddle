import { Server } from "socket.io";

let connections = {}; //stores the path{room id} : and the socket.id of every user in the particular room;
let messages = {}; //stores all the chat history of the particular room
let timeOnline = {}; //stores when a user joined

export const connectToSocket = (server) => {
    //attaching Socket.io to the exisiting HTTP server
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });

    io.on("connection", (socket) => { //Runs once for Each Connected User
        console.log("user Connected:", socket.id)

        socket.on("join-call", (path) => { //path here is the link

            //creating room if no rooms exists to join
            if (!connections[path]) {
                connections[path] = [];
            }

            //adding the user's socket id to the room path provided
            connections[path].push(socket.id); // Fixed typo: [paths] -> [path]

            //storing the joining time of the user
            timeOnline[socket.id] = new Date(); // Fixed typo: [socketid] -> [socket.id]

            //notifying all the users in the existing room that a new user joined
            // Fixed: removed .array (connections[path] is already an array)
            connections[path].forEach((socketId) => {
                io.to(socketId).emit(
                    "user-joined",
                    socket.id,
                    connections[path] //lists all the user in the room
                );
            });

            //providing all the previous chat to the new user if it exists;
            if (messages[path]) { //message exists
                messages[path].forEach((msg) => { // Fixed: removed .array and updated callback variable
                    io.to(socket.id).emit(
                        "chat-message",
                        msg.data,
                        msg.sender,   // username of the sender
                        msg.socketId //sender id
                    );
                });
            }

        });

        //WEBRTC SIGNALING(p2p handshake) we are using the peer 2 peer architecture
        socket.on("signal", (toSocketId, signalData) => {
            //forwarding the WEBRTC signal to the target peer
            io.to(toSocketId).emit(
                "signal",   //event name
                socket.id,  //sender socket id
                signalData //offer /answer
            );
        });

        //chat message Handling
        socket.on("chat-message", (data, sender) => {
            let roomFound = null;

            //finding which room does the socket belongs to forward the message to all the members of the room
            for (const [room, sockets] of Object.entries(connections)) {
                if (sockets.includes(socket.id)) {
                    roomFound = room; //path 
                    break;
                }
            }

            //if socket is not part of any room ,ignore
            if (!roomFound) return;

            //create a message array for the if it doesnt exist
            if (!messages[roomFound]) {
                messages[roomFound] = [];
            }

            //storing the message in memory 
            messages[roomFound].push({
                sender: sender,
                data: data,
                socketId: socket.id
            });

            console.log(`Message in ${roomFound}`, sender, data);

            //broadcasting the message to all the existing user of the room in which the message came
            connections[roomFound].forEach((socketId) => {
                io.to(socketId).emit(
                    "chat-message",
                    data,
                    sender,
                    socket.id
                );
            });
        });

        //Disconnect Handling//
        socket.on("disconnect", () => {
            console.log("user Disconnected:", socket.id);

            //remove socket from all the rooms...
            for (const [room, sockets] of Object.entries(connections)) {
                
                // Check if the disconnected user is inside this room
                const index = sockets.indexOf(socket.id);

                if (index !== -1) {
                    // 1. Notify other users in the room that this user left
                    sockets.forEach((socketId) => {
                        io.to(socketId).emit("user-left", socket.id);
                    });

                    // 2. Remove the socket from the connections array
                    sockets.splice(index, 1);

                    // 3. If the room is empty, delete it to save memory
                    if (sockets.length === 0) {
                        delete connections[room];
                    }
                }
            }

            // Clean up time tracking
            delete timeOnline[socket.id];
        });
    });

    return io;
};