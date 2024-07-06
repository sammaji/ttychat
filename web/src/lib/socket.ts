import { io  } from "socket.io-client";

const socketSingleton = () => {
    if (typeof process.env.NEXT_PUBLIC_SOCKET_URL === "undefined") throw new Error("NEXT_PUBLIC_SOCKET_URL env variable is not set")
    return io(process.env.NEXT_PUBLIC_SOCKET_URL)
}

type SocketSingleton = ReturnType<typeof socketSingleton>;

const globalForSocket = globalThis as unknown as { socket: SocketSingleton | undefined };

export const socket = globalForSocket.socket ?? socketSingleton()

export default socket

globalForSocket.socket = socket