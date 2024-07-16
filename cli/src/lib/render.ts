import pico from "picocolors";
import { input, select, Separator } from "@inquirer/prompts";
import { io } from "socket.io-client";
import generateUniqueId from "generate-unique-id";
import { Log, State } from "../types";

const promptInfo = async (): Promise<[number, State]> => {
    const choice = await select({
        message: pico.magenta("Create new or join an existing room?"),
        choices: [
            {
                name: "Create room",
                value: 0,
                description: pico.gray(
                    "Create a new room and invite other users."
                ),
            },
            {
                name: "Join room",
                value: 1,
                description: pico.gray(
                    "Join an existing room and chat with other users."
                ),
            },
            new Separator(),
        ],
        theme: {
            icon: {
                cursor: "✔",
            },
        },
    }).catch();

    let roomId =
        choice === 0
            ? generateUniqueId({ length: 6 })
            : await input({
                  message: pico.magenta("Enter room code to join: "),
              });
    let username = await input({ message: pico.magenta("Enter username: ") });
    return [choice, { roomId, username }];
};

async function render(
    socket: ReturnType<typeof io>,
    logs: Log[],
    state: State,
    serverState: State
) {
    console.log("render", logs);

    const { username } = serverState;
    const { username: currUsername, roomId: currRoomId } = state;

    console.clear();

    logs.forEach((log) => {
        console.log(log.message);
    });

    if (username === currUsername) {
        chatPrompt(socket, state);
        return;
    }

    process.stdout.write(
        pico.bold(
            `👉 ${pico.green(currUsername)}@${pico.magenta(currRoomId)}> `
        )
    );
}

type CancelablePrompt = ReturnType<typeof input>;
let inputState: {
    prev: CancelablePrompt | null;
    curr: CancelablePrompt | null;
} = { prev: null, curr: null };

async function chatPrompt(socket: ReturnType<typeof io>, state: State) {
    if (inputState.prev !== null) inputState.prev.cancel();

    const { username, roomId } = state;

    inputState.prev = inputState.curr;
    inputState.curr = input({
        message: `${pico.green(username)}@${pico.magenta(roomId)}>`,
        theme: { prefix: "👉" },
    });

    inputState.curr
        .then((message) => {
            if (typeof message !== "string") return;

            message = message.trim();
            if (message === ":quit" || message === ":q") {
                quitRoom(socket, state);
            }

            socket.emit("create:chat", {
                username,
                roomId,
                message,
            });
        })
        .catch(() => console.log("error"));

    return inputState.curr;
}

async function quitRoom(socket: ReturnType<typeof io>, state: State) {
    socket.emit("remove:member", state);
    console.log(
        pico.bgGreen(
            pico.white(" SUCCESS ") + pico.green(" Connection closed.")
        )
    );
    socket.disconnect();
    process.exitCode = 0;
}

export default render;
export { promptInfo };
