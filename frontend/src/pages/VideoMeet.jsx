import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField } from '@mui/material';
import { Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import server from '../environment';

const server_url = server;

var connections = {};

const peerConfigConnections = { //helps in establishing the peerConnections with other clients helps the client to puch through the network to reach you
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" } // helps in determing the user public ip of the client for conenctions
    ]
}

export default function VideoMeetComponent() {

    var socketRef = useRef(); //peers SocketId
    let socketIdRef = useRef(); //user SocketId

    let localVideoref = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);   //browser permission

    let [audioAvailable, setAudioAvailable] = useState(true);   //browser Permission

    let [video, setVideo] = useState([]);   //userVideo status

    let [audio, setAudio] = useState(); //userAudio

    let [screen, setScreen] = useState(); //screenShare

    let [showModal, setModal] = useState(true);

    let [screenAvailable, setScreenAvailable] = useState(); //for screenShare

    let [messages, setMessages] = useState([])  //all the upto time message in the current room

    let [message, setMessage] = useState("");  //any new message written 

    let [newMessages, setNewMessages] = useState(3);

    let [askForUsername, setAskForUsername] = useState(true);  // Guest Login

    let [username, setUsername] = useState("");

    const videoRef = useRef([]) //you are saving the latest list of videos in a place where your event listeners can instantly read it without waiting for React to re-render.

    let [videos, setVideos] = useState([]);

    //when the app first mounts we need to get the userPermission irrespective of them being guest or registered user
    useEffect(() => {
        getPermissions();
    }, [])

    //function that triggers the browser box of which screen to share
    let getDisplayMedia = () => {
        if (screen) {//if screen is available
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                    .then(getDisplayMediaSuccess)
                    .then((stream) => { })
                    .catch((error) => console.log(error));
            }
        }
    }

    const getPermissions = async () => {
        try {
            const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true }); //navigator is a browser api for fetching the user permission 
            if (videoPermission) {
                setVideoAvailable(true);
                console.log("video permission Granted"); //testing
            } else {
                setVideoAvailable(false);
                console.log("video permission denied"); //test
            }

            const audioPermissions = await navigator.mediaDevices.getUserMedia({ audio: true }); //audio permission
            if (audioPermissions) {
                setAudioAvailable(true);
                console.log("audio permission Granted");
            } else {
                setAudioAvailable(false);
                console.log("audio permsision Denied");
            }

            //we dont need permission for screenSharing rather the permission for which screen to stream;
            if (navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
            } else {
                setScreenAvailable(false);
            }

            if (videoAvailable || audioAvailable) { //displaying the user video to user itself //if both are false then we dont need to send the streams
                const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: videoAvailable, audio: audioAvailable });
                if (userMediaStream) {
                    window.localStream = userMediaStream;
                    if (localVideoref.current) {
                        localVideoref.current.srcObject = userMediaStream;
                    }
                }
            }
        } catch (error) {
            console.log(error);
        }
    }

    //this useEffect runs everytime the user (toggles the mute or unmuted(video as well) and asks the hardware to update)
    useEffect(() => {
        if (video !== undefined && audio !== undefined) {
            getUserMedia();
        }
    }, [video, audio]);

    let getMedia = () => { //runs after the connect function of the lobby conenct button
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    }

    let getUserMediaSuccess = (stream) => {//whenever you successfully change the camera,mic event,its job is to hotswap the old video feed for tge newone without dropping the call
        try {
            window.localStream.getTracks().forEach(track => track.stop()); //stopping all the current track of the user
        } catch (error) { console.log(error) }

        window.localStream = stream;
        localVideoref.current.srcObject = stream; //updating the localStream of the user

        for (let id in connections) {
            if (id === socketIdRef.current) continue; //we dont need to send the updated stream to our socket itself

            connections[id].addStream(window.localStream); //adding the new stream for other users

            connections[id].createOffer().then((description) => { //description here is the settings video codec and encryption technic the user is going to use for the call (browsers)
                console.log(description);
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit("signal", id, JSON.stringify({ "sdp": connections[id].localDescription })) //sending a new offer for a new updated stream
                    })
                    .catch(e => console.log(e));
            })
        }

        //External stop Handler...

        //handles a specific purpose where the media stream is stopped by the browser or the operating system

        stream.getTracks().forEach(track => track.onended = () => {// onended fires when the hardware of the browser kills the stream
            setVideo(false);
            setAudio(false);

            try {//stoping all the current stream to avoid memory leaks or the ghost streams and for other apps
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) };

            //The screen share is gone. You are now sending nothing. The Fix: The code instantly generates a Fake Stream (Black Video + Silent Audio)


            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            localVideoref.current.srcObject = window.localStream

            //send the new stream to the peers in call
            for (let id in connections) {
                connections[id].addStream(window.localStream)

                connections[id].createOffer().then((description) => {
                    connections[id].setLocalDescription(description)
                        .then(() => {
                            socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                        })
                        .catch(e => console.log(e))
                })
            }
        })
    }

    let getUserMedia = () => {
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio }) //update the hardware settings
                .then(getUserMediaSuccess) //passess the fresh stream to the fucntion (which updates the stream and sends new stream to other people on the call)
                .then((stream) => { })
                .catch((e) => console.log(e))

        } else {//The "Turn Off" Block
            try {
                let tracks = localVideoref.current.srcObject.getTracks();// grabs the current stream from the video tag
                tracks.forEach(track => track.stop()) // stops the track so that if other apps want to use it and turns of the video light of the computer hardware
            } catch (e) { }
        }
    }

    let getDisplayMediaSuccess = (stream) => {
        try {//stoping all the old stream tracks for setting and sending the new tracks to the user
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (error) { console.log(error) }

        //setting the new stream 
        window.localStream = stream;
        localVideoref.current.srcObject = stream;

        //sending the new stream to connected users
        for (let id in connections) {
            if (id === socketIdRef.current) continue;

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit("signal", id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }
        // unknown event occures in the hardware or the browser
        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false)

            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            localVideoref.current.srcObject = window.localStream

            getUserMedia()

        })
    }

    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message)

        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
                            }).catch(e => console.log(e))
                        }).catch(e => console.log(e))
                    }
                }).catch(e => console.log(e))
            }

            if (signal.ice) { // this is new ip of the peer 
                //You add this IP to your connection list so media packets can flow through that path.
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
            }
        }
    }

    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false })

        socketRef.current.on("signal", gotMessageFromServer)

        socketRef.current.on("connect", () => {
            socketRef.current.emit("join-call", window.location.href); //sending the user the path
            socketIdRef.current = socketRef.current.id;

            socketRef.current.on("chat-message", addMessage)

            socketRef.current.on("user-left", (id) => {//removing the video of the client which left from the frontend
                setVideos((video) => videos.filter((video) => video.socketId !== id))
            })

            socketRef.current.on("user-joined", (id, clients) => { //socket.id, connections[path]) from backend
                clients.forEach((socketListId) => {
                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections); //create a new RTC communication using the stun server

                    //Browser is looking for any possible address where data can be sent to reach your computer.
                    connections[socketListId].onicecandidate = function (event) { //{"new path" (an ICE Candidate)}
                        if (event.candidate != null) {
                            socketRef.current.emit("signal", socketListId, JSON.stringify({ "ice": event.candidate })) //pass the iceCandidate path to the client
                        }
                    }

                    //waiting for the user streams
                    connections[socketListId].onaddstream = (event) => {
                        let videoExists = videoRef.current.find(video => video.socketId === socketListId);

                        if (videoExists) {
                            console.log("FOUND EXISITING");

                            //updating the stream of the existing video
                            setVideos(videos => {// we are creating a new copy,becase the memory address changes and triggers the react to re render
                                const updatedVideos = videos.map(video =>
                                    video.socketId === socketListId ? { ...video, stream: event.stream } : video //To keep their ID consistent while swapping their old video feed for the new one,
                                    //  and to force React to update the screen.
                                );
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        } else {
                            //create a new video
                            console.log("creating New");
                            let newVideo = {
                                socketId: socketListId,
                                stream: event.stream,
                                autoplay: true,
                                playsinline: true
                            };

                            setVideos(videos => {
                                const updatedVideos = [...videos, newVideo];
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        }
                    }

                    //adding the localstream to the webRTC to share the stream to the peers
                    if (window.localStream !== undefined && window.localStream !== null) {//do i currently have a working camera and microphone stream
                        connections[socketListId].addStream(window.localStream); //send the stream to all the peers
                    } else {
                        //in webRTC if we initiate a connection with zero audio or video Tracks the conneciton negatiation falisl
                        //hence we create a fake stream
                        let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
                        window.localStream = blackSilence()
                        connections[socketListId].addStream(window.localStream)

                    }
                })

                if (id === socketIdRef.current) {//is the person who joined the room me ? yes call everyone else
                    for (let id2 in connections) {//loop through every person in the room
                        if (id2 === socketIdRef.current) continue; //skip Myself i dont to establish connection with myself

                        try {//defensive move to add the stream again (defensive) webRTC requires stream to be added before creating an offer
                            connections[id2].addStream(window.localStream)
                        } catch (e) { }

                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit("signal", id2, JSON.stringify({ "sdp": connections[id2].localDescription })) //send the payload to the receipt
                                })
                                .catch(e => console.log(e));
                        })
                    }
                }
            })
        })
    }

    let silence = () => {//creating a silence audio stream
        let ctx = new AudioContext()
        let oscillator = ctx.createOscillator()
        let dst = oscillator.connect(ctx.createMediaStreamDestination())
        oscillator.start()
        ctx.resume()
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
    }
    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height })
        canvas.getContext('2d').fillRect(0, 0, width, height)
        let stream = canvas.captureStream()
        return Object.assign(stream.getVideoTracks()[0], { enabled: false })
    }

    let handleVideo = () => {
        setVideo(!video);
        // getUserMedia();
    }
    let handleAudio = () => {
        setAudio(!audio)
        // getUserMedia();
    }

    useEffect(() => {
        if (screen !== undefined) {
            getDisplayMedia();
        }
    }, [screen])
    let handleScreen = () => {
        setScreen(!screen);
    }

    let handleEndCall = () => {
        try {
            let tracks = localVideoref.current.srcObject.getTracks()
            tracks.forEach(track => track.stop())
        } catch (e) { }
        window.location.href = "/"
    }

    let openChat = () => {
        setModal(true);
        setNewMessages(0);
    }
    let closeChat = () => {
        setModal(false);
    }
    let handleMessage = (e) => {
        setMessage(e.target.value);
    }

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };



    let sendMessage = () => {
        console.log(socketRef.current);
        socketRef.current.emit('chat-message', message, username)
        setMessage("");

        // this.setState({ message: "", sender: username })
    }


    let connect = () => {
        setAskForUsername(false);
        getMedia();
    }


    return (
        <div>

            {askForUsername === true ?

                <div>


                    <h2>Enter into Lobby </h2>
                    <TextField id="outlined-basic" label="Username" value={username} onChange={e => setUsername(e.target.value)} variant="outlined" />
                    <Button variant="contained" onClick={connect}>Connect</Button>


                    <div>
                        <video ref={localVideoref} autoPlay muted></video>
                    </div>

                </div> :


                <div className={styles.meetVideoContainer}>

                    {showModal ? <div className={styles.chatRoom}>

                        <div className={styles.chatContainer}>
                            <h1>Chat</h1>

                            <div className={styles.chattingDisplay}>

                                {messages.length !== 0 ? messages.map((item, index) => {

                                    console.log(messages)
                                    return (
                                        <div style={{ marginBottom: "20px" }} key={index}>
                                            <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                                            <p>{item.data}</p>
                                        </div>
                                    )
                                }) : <p>No Messages Yet</p>}


                            </div>

                            <div className={styles.chattingArea}>
                                <TextField value={message} onChange={(e) => setMessage(e.target.value)} id="outlined-basic" label="Enter Your chat" variant="outlined" />
                                <Button variant='contained' onClick={sendMessage}>Send</Button>
                            </div>


                        </div>
                    </div> : <></>}


                    <div className={styles.buttonContainers}>
                        <IconButton onClick={handleVideo} style={{ color: "white" }}>
                            {(video === true) ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        <IconButton onClick={handleEndCall} style={{ color: "red" }}>
                            <CallEndIcon />
                        </IconButton>
                        <IconButton onClick={handleAudio} style={{ color: "white" }}>
                            {audio === true ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>

                        {screenAvailable === true ?
                            <IconButton onClick={handleScreen} style={{ color: "white" }}>
                                {screen === true ? <ScreenShareIcon /> : <StopScreenShareIcon />}
                            </IconButton> : <></>}

                        <Badge badgeContent={newMessages} max={999} color='orange'>
                            <IconButton onClick={() => setModal(!showModal)} style={{ color: "white" }}>
                                <ChatIcon />                        </IconButton>
                        </Badge>

                    </div>


                    <video className={styles.meetUserVideo} ref={localVideoref} autoPlay muted></video>

                    <div className={styles.conferenceView}>
                        {videos.map((video) => (
                            <div key={video.socketId}>
                                <video

                                    data-socket={video.socketId}
                                    ref={ref => {
                                        if (ref && video.stream) {
                                            ref.srcObject = video.stream;
                                        }
                                    }}
                                    autoPlay
                                >
                                </video>
                            </div>

                        ))}

                    </div>

                </div>

            }

        </div>
    )
}