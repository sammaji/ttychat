import path from "path"
import express from 'express';
import { Server } from "socket.io";
import { createServer } from "http"
import cors from "cors"
import { Redis } from "ioredis";
import dotenv from "dotenv";
import logger from "logger";
import { nanoid } from "nanoid";

dotenv.config()

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true,
  }
});

app.use(cors())

// globals
/**
 * ---- ROOMS ----
 * rooms are identified by their unique id.
 * roomId is unique globally.
 * 
 * ---- MEMBERS ----
 * members are identified by their unique username.
 * username is not unique globally, but only within a room.
 * username is stored in this set like "roomId::username".
 */
if (!process.env.REDIS_URL) throw new Error("REDIS_URL env variable is not set");
const redis = new Redis(process.env.REDIS_URL);

redis.on("connect", () => console.log("Redis connected"))
redis.on("error", console.log)

io.engine.on("connection_error", (error) => logger.error({ event: "connection_error", error }))

io.on("connection", (socket) => {
  logger.info({event: "new_connection", socketId: socket.id})

  socket.on("create:room", async (message) => {
    logger.info({event: "create:room", message: message})

    const doesRoomExist = await redis.sismember("rooms", message.roomId)
    if (doesRoomExist === 1) return socket.emit("error", { message: "Room already exist.", uid: nanoid(32) })
    
    const roomStatus = await redis.sadd("rooms", message.roomId)
    const memStatus = await redis.sadd("members", message.roomId + "::" + message.username)
    
    if (roomStatus === 0 || memStatus === 0) return socket.emit("error", { message: "Room creation failed.", uid: nanoid(32) })

    socket.join(message.roomId)
    io.sockets.in(message.roomId).emit("create:room:success", message)
    io.sockets.in(message.roomId).emit("add:member:success", message)
  })

  socket.on("add:member", async (message) => {
    logger.info({event: "add:member", message: message})

    const doesRoomExist = await redis.sismember("rooms", message.roomId)
    if (doesRoomExist === 0) return socket.emit("error", { message: "Room does not exist.", uid: nanoid(32) })

    const doesMemExist = await redis.sismember("members", message.roomId + "::" + message.username)
    if (doesMemExist === 1) return socket.emit("error", { message: "Username already exists, please choose another username.", uid: nanoid(32) })

    // members.add(message.roomId + "::" + message.username)
    const memStatus = await redis.sadd("members", message.roomId + "::" + message.username)
    if (memStatus === 0) return socket.emit("error", { message: "User creation failed.", uid: nanoid(32) })

    socket.join(message.roomId)
    io.sockets.in(message.roomId).emit("add:member:success", {...message, uid: nanoid(32)})
  })

  socket.on("remove:member", async (message) => {
    logger.info({event: "remove:member", message: message})

    const doesRoomExist = await redis.sismember("rooms", message.roomId)
    if (doesRoomExist === 0) return socket.emit("error", { message: "Room does not exist.", uid: nanoid(32) })

    await redis.srem("members", message.roomId + "::" + message.username)

    socket.leave(message.roomId)
    io.sockets.in(message.roomId).emit("remove:member:success", {...message, uid: nanoid(32)})
  })

  socket.on("create:chat", (message) => {
    logger.info({event: "create:chat", message: message, uid: nanoid(32)})

    redis.lpush("chat::" + message.roomId, message.username + "::" + message.message)
    io.sockets.in(message.roomId).emit("create:chat:success", {...message, uid: nanoid(32)})
  })
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' }).send()
})

// const PORT = process.env.PORT || 3000;
const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
