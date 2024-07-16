import generateUniqueId from "generate-unique-id";
import { io } from "socket.io-client";
import { Command } from "commander";
import dotenv from "dotenv";
import packageJson from "../package.json";
import { registerChatRoomEvents, registerErrors } from "./lib/socket-events";
import { Log, State } from "./types";
import { promptInfo } from "./lib/render";

dotenv.config();
const socket = io("http://localhost:3000");

process.on("SIGINT", () => {
    console.log("\nClosing server...");
    const globalThisWithState = globalThis as unknown as { state: State | undefined };
    if (typeof globalThisWithState.state !== "undefined") socket.emit("remove:member", globalThisWithState.state);
    socket.disconnect();
    process.exitCode = 1;
});

function main() {
    let state: State = {};
    let logs: Log[] = [];

    globalThis.state = state;

    // detects a top level command, no flags
    if (process.argv.length === 2) {
        promptInfo().then(([choice, state]) => {
            registerChatRoomEvents(socket, logs, state).then(() => {
                if (choice === 0) socket.emit("create:room", state);
                else socket.emit("add:member", state);
            });
        });
        return;
    }

    const program = new Command();

    program
        .name("ttychat")
        .description("A command line tools for chatting with your friends.")
        .version(packageJson.version)

    program
        .command("create")
        .description("Create a new room")
        .arguments("<username>")
        .option(
            "--id <roomId>",
            "Provide a room id (minimum 4 characters long. No special characters.)"
        )
        .action((username, options) => {
            state.username = username;
            state.roomId = options.id ?? generateUniqueId({ length: 6 });
            registerChatRoomEvents(socket, logs, state).then(() =>
                socket.emit("create:room", state)
            );
        })

    program
        .command("join")
        .description("Join an existing room")
        .arguments("<username>")
        .arguments("<roomId>")
        .action((username, options) => {
            state.username = username;
            state.roomId = options.id ?? generateUniqueId({ length: 6 });
            registerChatRoomEvents(socket, logs, state);
            socket.emit("create:room", state);
        })

    program.parse(process.argv);
}

main();
registerErrors(socket);
