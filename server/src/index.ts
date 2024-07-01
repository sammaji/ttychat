import path from "path"
import express from 'express';
import { Server } from "socket.io";
import { createServer } from "http"
import cors from "cors"

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
 * rooms are identified by their unique id.
 * roomId is unique globally.
 */
const rooms = new Set()

/**
 * members are identified by their unique username.
 * username is not unique globally, but only within a room.
 * username is stored in this set like "roomId::username".
 */
const members = new Set()

io.engine.on("connection_error", console.log)

io.on("connection", (socket) => {
  console.log("SOCKET: new connection with id", socket.id);

  socket.on("create:room", (message) => {
    if (rooms.has(message.roomId)) {
      socket.emit("error", { message: "Room already exists." })
      return
    }
    
    rooms.add(message.roomId)
    members.add(message.roomId + "::" + message.username)
    socket.join(message.roomId)
    io.sockets.in(message.roomId).emit("create:room:success", message)
    io.sockets.in(message.roomId).emit("add:member:success", message)
  })

  socket.on("add:member", (message) => {
    if (!rooms.has(message.roomId)) {
      socket.emit("error", { message: "Room does not exist." })
      return
    }

    if (members.has(message.roomId + "::" + message.username)) {
      socket.emit("error", { message: "Username already exists, please choose another username." })
    }

    members.add(message.roomId + "::" + message.username)
    socket.join(message.roomId)
    io.sockets.in(message.roomId).emit("add:member:success", message)
  })

  socket.on("remove:member", (message) => {
    if (!rooms.has(message.roomId)) {
      socket.emit("error", { message: "Room does not exist." })
      return
    }

    if (!members.has(message.roomId + "::" + message.username)) {
      socket.emit("error", { message: "User does not exist on this room." })
      return
    }

    socket.leave(message.roomId)
    io.sockets.in(message.roomId).emit("remove:member:success", message)
  })

  socket.on("create:chat", (message) => {
    console.log(message)
    io.sockets.in(message.roomId).emit("create:chat:success", message)
  })
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' }).send()
})

// const PORT = process.env.PORT || 3000;
const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
