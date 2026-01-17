import mongoose from "mongoose";

const meetingSchema=new Schema({
    user_id:{type:String},
    meetingCode:{type:String ,required:true},
    date:{type:Date,default:Date.now,required:true}
});

const meetingModel=mongoose.model("meetingModel",meetingSchema);

export {meetingModel};