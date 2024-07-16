import { io } from "socket.io-client";
import pico from "picocolors";
import render from "./render";
import { Log, State } from "../types";

export const registerErrors = (socket) => {
    socket.on("error", (error) => {
        console.log(
            pico.bgRed(pico.white(" ERROR ") + pico.red(error.message))
        );
        socket.disconnect();
        process.exitCode = 1;
        return;
    });
};

/**
 * CHAT / ROOM EVENTS
 * events that take place if chat room creation
 * and adding members are successful
 */
export const registerChatRoomEvents = async (
    socket: ReturnType<typeof io>,
    logs: Log[],
    state: State
) => {
    socket.on("add:member:success", (message) => {
        const { username, roomId } = message;
        logs.push({
            message: `${pico.green("[+]")} ${pico.blue(
                username
            )} joined this room.`,
        });
        render(socket, logs, state, { username, roomId });
    });

    socket.on("remove:member:success", (message) => {
        const { username, roomId } = message;
        logs.push({
            message: `${pico.red("[-]")} ${pico.blue(
                username
            )} left this room.`,
        });
        render(socket, logs, { username, roomId }, state);
    });

    socket.on("create:chat:success", (res) => {
        const { username, roomId, message } = res;
        const isCurrUser =
            username === state.username ? pico.green("(you)") : "";
        logs.push({
            message: `${pico.green(username)}${isCurrUser}: ${message}`,
        });
        render(socket, logs, { username, roomId }, state);
    });
};
