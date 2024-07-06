import { io  } from "socket.io-client";

const socketSingleton = () => {
    return io("http://localhost:3000");
}

type SocketSingleton = ReturnType<typeof socketSingleton>;

const globalForSocket = globalThis as unknown as { socket: SocketSingleton | undefined };

export const socket = globalForSocket.socket ?? socketSingleton()

export default socket

// if (process.env.NODE_ENV !== "development") globalForSocket.socket = socket
globalForSocket.socket = socket