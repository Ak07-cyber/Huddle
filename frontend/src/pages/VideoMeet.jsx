import React, { useEffect, useRef } from "react";
import server from "../environment";

const server_url=server;

var connections={};

const peerConfigConnections={ //helps in establishing the peerConnections with other clients helps the client to puch through the network to reach you
    "iceServers":[
        {"urls":"stun:stun.l.google.com:19302"} // helps in determing the user public ip of the client for conenctions
    ]
}
 

export default function VideoMeetComponent(){

    var socketRef=useRef(); //peers SocketId
    let SocketIdRef=useRef(); //user SocketId

    let localVideoref=useRef();  

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
    useEffect(()=>{
        getPermissions();
    },[])
 
    const getPermissions=async()=>{
        try{
            const videoPermission=await navigator.mediaDevices.getUserMedia({video:true}); //navigator is a browser api for fetching the user permission 
            if(videoPermission){
                setAudioAvailable(true);
                console.log("video permission Granted"); //testing
            }else{
                setAudioAvailable(false);
                console.log("video permission denied"); //test
            }

            const audioPermissions=await navigator.mediaDevices.getUserMedia({audio:true}); //audio permission
            if(audioPermissions){
                setAudioAvailable(true);
                console.log("audio permission Granted");
            }else{
                setAudioAvailable(false);
                console.log("audio permsision Denied");
            }

            //we dont need permission for screenSharing rather the permission for which screen to stream;
            if(navigator.mediaDevices.getDisplayMedia){
                setScreenAvailable(true);
            }else{
                setScreenAvailable(false);
            }

            if(videoAvailable || audioAvailable){ //displaying the user video to user itself //if both are false then we dont need to send the streams
                const userMediaStream=await navigator.mediaDevices.getUserMedia({video:videoAvailable, audio:audioAvailable});
                if(userMediaStream){  
                    window.localStream=userMediaStream;
                    if(localVideoref.current){
                        localVideoref.current.srcObject=userMediaStream;
                    }
                }
            }
        }catch(error){
            console.log(error);
        }
    }

    //this useEffect runs everytime the user (toggles the mute or unmuted(video as well) and asks the hardware to update)
    useEffect(()=>{
        if(video !== undefined && audio !== undefined){
            getUserMedia();
        }
    },[video,audio]);

    let getMedia=()=>{ //runs after the connect function of the lobby conenct button
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    }

    let getUserMediaSucess= (stream)=>{

    }

    let getUserMedia= ()=>{
        if((video && videoAvailable) || (audio && audioAvailable)){
            navigator.mediaDevices.getUserMedia({video:video,audio:audio}) //update the hardware settings
            .then(getUserMediaSucess) //passess the fresh stream to the fucntion (which updates the stream and sends new stream to other people on the call)
            .then((stream)=>{ })
            .catch((e)=>console.log(e))

        }else{//The "Turn Off" Block
            try{
                let tracks=localVideoref.current.srcObject.getTracks();// grabs the current stream from the video tag
                tracks.forEach(track=>track.stop()) // stops the track so that if other apps want to use it and turns of the video light of the computer hardware
            }catch(e){ }
        }
    }

    let DisplayMediaSuccess =(stream)=>{

    }

    let connectToSocketServer=()=>{
        socketRef.current =io.connect(server_url, {secure:false})

        socketRef.current.on("signal", gotMessageFromServer)

        socketRef.current.on("connect",()=>{
            socketRef.current.emit("join-call", window.location.href); //sending the user the path
            SocketIdRef.current=socketRef.current.id;

            socketRef.current.on("chat-message",addMessage)

            socketRef.current.on("user-left",(id)=>{//removing the video of the client which left from the frontend
                setVideos((video) => videos.filter((video)=> video.socketId !==id))
            })
            
            socketRef.current.on("user-joined",(id,clients)=>{ //socket.id, connections[path]) from backend
                clients.forEach((socketListId)=>{
                    connections[socketListId]=new RTCPeerConnection(peerConfigConnections); //create a new RTC communication using the stun server
                    
                    //Browser is looking for any possible address where data can be sent to reach your computer.
                    connections[socketListId].onicecandidate=function(event){ //{"new path" (an ICE Candidate)}
                        if(event.candidate != null){
                            socketRef.current.emit("signal",socketListId,JSON.stringify({"ice":event.candidate})) //pass the iceCandidate path to the client
                        }
                    }

                    //waiting for the user streams
                    connections[socketListId].onaddstream=(event)=>{
                        let videoExists =videoRef.current.find(video=>video.socketId === socketListId);

                        if(videoExists){
                            console.log("FOUND EXISITING");

                            //updating the stream of the existing video
                            setVideos(videos=>{// we are creating a new copy,becase the memory address changes and triggers the react to re render
                                const updatedVideos=videos.map(video=>
                                    video.socketId===socketListId ?{ ...video,stream:event.stream}:video //To keep their ID consistent while swapping their old video feed for the new one,
                                    //  and to force React to update the screen.
                                );
                                videoRef.current=updatedVideos;
                                return updatedVideos;
                            });
                        }else{
                            //create a new video
                            console.log("creating New");
                            let newVideo={
                                socketId:socketListId,
                                stream:event.stream,
                                autoPlay:true,
                                playsinline:true
                            };

                            setVideos(videos=>{
                                const updatedVideos=[...videos,newVideo];
                                videoRef.current=updatedVideos;
                                return updatedVideos;
                            });
                        }
                    }

                    //adding the localstream to the webRTC to share the stream to the peers
                    if(window.localStream !==undefined && window.localStream !==null){//do i currently have a working camera and microphone stream
                        connections[socketListId].addStream(window.localStream); //send the stream to all the peers
                    }else{
                        //in webRTC if we initiate a connection with zero audio or video Tracks the conneciton negatiation falisl
                        //hence we create a fake stream
                        let blackSilence=(...args)=>new MediaStream([balck(...args),silence()]);
                        window.localStream=blackSilence()
                        connections[socketListId].addStream(window.localStream)

                    }
                })

                if(id===SocketIdRef.current){//is the person who joined the room me ? yes call everyone else
                    for(let id2 in connections){//loop through every person in the room
                        if(id2 ===SocketIdRef===current) continue; //skip Myself i dont to establish connection with myself

                        try{//defensive move to add the stream again (defensive) webRTC requires stream to be added before creating an offer
                            connections[id2].addStream(window.localStream)
                        }catch(e){ }

                        connections[id2].createOffer().then((description)=>{
                            connections[id2].setLocalDescription(description)
                            .then(()=>{
                                socketRef.current.emit("signal",id2,JSON.stringify({"sdp":connections[id2].LocalDescription})) //send the payload to the receipt
                            })
                            .catch(e=>console.log(e));
                        })
                    }
                }
            })
        })
    }


    return(
        <div>

            {askForUsername ==true ?
            <div>
                <h2>Enter the lobby</h2>
                 <TextField id="outlined-basic" label="Username" value={username} onChange={e => setUsername(e.target.value)} variant="outlined" />
                <Button variant="contained" onClick={connect}>Connect</Button>

                <div>
                    <video ref={localVideoref} autoPlay muted></video>
                </div>

            </div>:
                <div></div>
            };

        </div>
    )
}