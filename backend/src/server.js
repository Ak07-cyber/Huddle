import express from "express";
import mongoose from "mongoose";
import { createServer } from "node:http";
import { connectToSocket } from "./controllers/socketManager.js"; // Fixed: added .js extension
import cors from "cors";
import userRoutes from "./routes/users.routes.js";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables {global across the app}

const app = express();
const server = createServer(app); // server variable is the main server and any routes will be handled by express app instance
const io = connectToSocket(server); // connecting the socket io to the main server{mounting}

app.set("port", process.env.PORT || 8000);
app.use(cors());
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ limit: "50kb", extended: true }));

// Routes
app.use("/api/v1/users", userRoutes);

const start = async () => {
    try {
        const connectionDb = await mongoose.connect(process.env.MONGO_URL);
        
        console.log(`MONGO Connected DB Host: ${connectionDb.connection.host}`);

        server.listen(app.get("port"), () => {
            console.log(`LISTENING ON PORT ${app.get("port")}`);
        });
    } catch (error) {
        console.log("Database Connection failed", error);
    }
}

start();