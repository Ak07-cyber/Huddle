//works as a auth guard for required url;

import jwt from "jsonwebtoken";

export function userMiddleware(req,res,next){
    const token=req.headers.token;
    const decoded=jwt.verify(token,JWT_USER_PASSWORD);

    if(decoded){
        req.userId=decoded.indexOf;
        next();
    }else{
        res.status(403).json({
            message: "You are not signed in"
        })
    }
};