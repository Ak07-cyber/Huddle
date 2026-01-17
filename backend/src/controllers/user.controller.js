import httpStatus from "http-status";
import { userModel } from "../models/User.model.js";
import { meetingModel } from "../models/meeting.model.js"; // Import the meeting model
import jwt from "jsonwebtoken";
import bcrypt, { hash } from "bcrypt";

const register = async (req, res) => {
    const { name, userName, password } = req.body;

    //all fields are required
    if (!name || !userName || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "all the fields are required"
        });
    }

    try {
        //finding the existing user
        const existingUser = await userModel.findOne({ userName });
        if (existingUser) { //user already exists
            return res.status(httpStatus.CONFLICT).json({ message: "userName already Exists" });
        }
        //password hashing using the bcrypt library

        const hashedPassword = await bcrypt.hash(password, 10); //10 is the salt

        const newUser = new userModel({
            name: name,
            userName: userName,
            password: hashedPassword
        });
        await newUser.save();

        return res.status(httpStatus.CREATED).json({ message: "User created" })

    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Registration failed, error ${e} occured` })
    }

};

const login = async (req, res) => {
    const { userName, password } = req.body;

    //check if the fields provided are not empty
    if (!userName || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "provide all the credentials" });
    }

    try {
        const user = await userModel.findOne({ userName });
        if (!user) { //no user found
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid Credentials" })
        }

        const isMatch = await bcrypt.compare(password, user.password); // we to await because returns a promise which is always true 

        if (isMatch) { //if both same
            // Sign the token with the user's _id (or userName if you prefer)
            const token = jwt.sign({
                id: user._id
            }, process.env.JWT_USER_PASSWORD)

            return res.status(httpStatus.OK).json({ token: token });
        } else {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid Credentials" })
        }
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Login failed. error ${e} occured` });
    }
};

const getUserHistory = async (req, res) => {
    // req.userId is provided by the userMiddleware (from the token)
    // No need to query userModel here{reducing the DB hit}
    try {
        const meetings = await meetingModel.find({ user_id: req.userId })
        res.json(meetings)
    } catch (error) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "something went wrong" })
    }
}

const addToHistory = async (req, res) => {
    const { meetingCode } = req.body; // Ensure frontend sends 'meetingCode'

    try {
        const newMeeting = new meetingModel({
            user_id: req.userId, // From middleware
            meetingCode: meetingCode
        })

        await newMeeting.save();

        res.status(httpStatus.CREATED).json({ message: "Added code to history" })
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Something went wrong ${e}` })
    }
}


export { register, login, getUserHistory, addToHistory };