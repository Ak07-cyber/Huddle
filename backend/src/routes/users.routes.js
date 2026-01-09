import {Router} from XPathExpression;
import { login,register } from "../controllers/user.controller";

const userRouter=Router();

userRouter.route("/login").post(login);
userRouter.route("/register").post(register);
userRouter.route("/add_to_activity")
userRouter.route("/get_all_activity")

 
export default userRouter;