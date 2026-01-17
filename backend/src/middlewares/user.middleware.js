import jwt from "jsonwebtoken";

export function userMiddleware(req, res, next) {
    const token = req.headers.token; 

    if (!token) {// to verify the exsistence of the token
        return res.status(404).json({ message: "Token not found" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_USER_PASSWORD);
        req.userId = decoded.id; // Attaching userId to request object
        next();
    } catch (e) {
        return res.status(403).json({ message: "Invalid Token" });
    }
};