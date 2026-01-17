import { Router } from "express";
import { login, register, addToHistory, getUserHistory } from "../controllers/user.controller.js";
import { userMiddleware } from "../middlewares/user.middleware.js";

const userRouter=Router();

userRouter.route("/login").post(login);
userRouter.route("/register").post(register);
userRouter.route("/add_to_activity").post(userMiddleware, addToHistory);
userRouter.route("/get_all_activity").get(userMiddleware, getUserHistory);

 
export default userRouter;