import React, { useEffect, useRef } from "react";
import server from "../environment";
 

export default function VideoMeetComponent(){

    var socketRef=useRef(); //peers SocketId
    let SocketIdRef=useRef(); //user SocketId

    let localVideoref=useRef();  

    let [videoAvailable, setVideoAvailable] = useState(true);   //browser permission

    let [audioAvailable, setAudioAvailable] = useState(true);   //browser Permission

    let [video, setVideo] = useState([]);   //userVideo

    let [audio, setAudio] = useState(); //userAudio

    let [screen, setScreen] = useState(); //screenShare

    let [showModal, setModal] = useState(true);

    let [screenAvailable, setScreenAvailable] = useState(); //for screenShare

    let [messages, setMessages] = useState([])  //all the upto time message in the current room

    let [message, setMessage] = useState("");  //any new message written 

    let [newMessages, setNewMessages] = useState(3);  
 
    let [askForUsername, setAskForUsername] = useState(true);  // Guest Login

    let [username, setUsername] = useState("");

    const videoRef = useRef([])

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

            if(videoAvailable || audioAvailable){ //displaying the user video to user itself
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