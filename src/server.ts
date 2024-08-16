import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const jwtSecret = String(process.env.JWT_SECRET);

const app = express();
const httpServer = createServer(app);

let initMessage: any = null;

const io = new Server(httpServer, {
  path: "/member-alert/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
io.use((socket: Socket, next) => {
  const token = socket.handshake.headers.authentication as string;

  if (!token) {
    return next(new Error("Authentication error"));
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    socket.data.user = decoded;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  io.emit("message", "Connecting server broadcast alert.");
  if (initMessage && initMessage.isActive) {
    io.emit("message", initMessage);
  }
  if (!socket.data.user) {
    console.error("User not authenticated");
    return;
  }

  socket.on("message", (msg) => {
    const allowedRoles = ["ADMIN", "SENIOR", "ROOT"];
    if (!allowedRoles.includes(socket.data.user.role)) {
      socket.emit("message", "your not permission this action.");
      return;
    }
    console.log(`[${socket.data.user.role}] Set Alert`);

    initMessage = msg;
    console.log("Message received:", msg);
    io.emit("message", msg);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
