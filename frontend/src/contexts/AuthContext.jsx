import axios from axios;
import httpStatus from "http-status";
import { useContext, createContext, useState } from "react";
import { useNavigate } from "react-router-dom"; //for navigating to the home page after successfull login
import server from "../environment";



export const AuthContext=createContext({});

const client =axios.create({
    baseURL: "${server}/api/v1/users" //production..
})

export const AuthProvider=({children})=>{
    const authContext=useContext(AuthContext);// No need
    
    const [userData,setUserData] =useState(authContext);

    const router=useNavigate();

    const handleRegister=async (name,username,password)=>{
        try{
            let request=await client.post("/register",{
                name:name,
                userName:username,
                password:password
            })

            if(request.status===httpStatus.CREATED){
                return request.data.message;
            }
        }catch(err){
            throw err;
        }
    }

    const handleLogin=async (username,password)=>{
        try{
            let request=await client.post("/login",{
                userName:username,
                password:password
            });
            console.log(username,password);
            console.log(request.data);

            if(request.status===httpStatus.OK){
                localStorage.setItem("token",request.data.token);
                router("/home");
            }
        }catch(error){
            throw error;
        }
    }

    const getHistoryOfUser = async ()=>{
        try{
            let request=await client.get("/get_all_activity",{
                params:{
                    token:localStorage.getItem("token")
                }
            });
            return request.data
        }catch(error){
            throw error;
        }
    }

    const addToUserHistory = async (meetingCode) =>{
        try{
            let request=await client.post("/add_to_activity",{
                token:localStorage.getItem("token"),
                meeting_code:meetingCode
            });
            return request;
        }catch(error){
            throw error;
        }
    };

    const data={
        userData,setUserData,addToUserHistory,handleLogin,handleRegister,getHistoryOfUser
    }

    return <AuthContext.provider value={data}>
        {children}
    </AuthContext.provider>

}