import generateUniqueId from "generate-unique-id";
import pico from "picocolors";
import { io } from "socket.io-client";
import { input } from "@inquirer/prompts";
import select, { Separator } from '@inquirer/select';
import dotenv from "dotenv";

dotenv.config()
const socket = io("http://localhost:3000");

type Log = { message: string };
type User = { username: string, userId: string, roomId: string };

let currUser: User | null = null;

process.on("SIGINT", () => {
	console.log("Closing server...");
	if (currUser) {
		socket.emit("remove:member", { username: currUser.username, roomId: currUser.roomId });
	}
	socket.disconnect();
})

async function main() {
	const logs: Log[] = []
	const answer = await select({
		message: pico.magenta('Create new or join an existing room?'),
		choices: [
			{
				name: 'Create room',
				value: 0,
				description: pico.gray('Create a new room and invite other users.'),
			},
			{
				name: 'Join room',
				value: 1,
				description: pico.gray('Join an existing room and chat with other users.'),
			},
			new Separator(),
		],
		theme: {
			icon: {
				cursor: "✔"
			},
		}
	}).catch()

	socket.on("error", (error) => {
		console.log(pico.bgRed(pico.white(" ERROR ") + pico.red(error.message)))
		socket.disconnect()
		process.exitCode = 1
		return
	})

	let currRoomId: string;
	if (answer === 0) currRoomId = generateUniqueId({ length: 6 })
	else currRoomId = await input({ message: pico.magenta("Enter room code to join: ") })
	let currUsername = await input({ message: pico.magenta("Enter username: ") })

	if (answer === 0) {
		socket.emit("create:room", { roomId: currRoomId, username: currUsername })
	}
	else {
		socket.emit("add:member", {
			username: currUsername,
			roomId: currRoomId,
		});
	}

	globalThis.curr = { username: currUsername, roomId: currRoomId };

	/**
	 * CHAT / ROOM EVENTS
	 * events that take place if chat room creation
	 * and adding members are successful
	 */
	socket.on("add:member:success", (message) => {
		const { username, roomId } = message;
		logs.push({ message: `${pico.green("[+]")} ${pico.blue(username)} joined this room.` });
		render(logs, { username, roomId, currUsername, currRoomId });
	});

	socket.on("remove:member:success", (message) => {
		const { username, roomId } = message;
		logs.push({ message: `${pico.red("[-]")} ${pico.blue(username)} left this room.` });
		render(logs, { username, roomId, currUsername, currRoomId });
	})

	socket.on("create:chat:success", (res) => {
		const { username, roomId, message } = res;

		const isCurrUser = username === currUsername ? pico.green("(you)") : "";
		logs.push({ message: `${pico.green(username)}${isCurrUser}: ${message}` });

		render(logs, { username, roomId, currUsername, currRoomId });
	});
}


type CancelablePrompt = ReturnType<typeof input>
let inputState: { prev: CancelablePrompt | null, curr: CancelablePrompt | null } = { prev: null, curr: null }

async function chatPrompt(username: string, roomId: string) {
	if (inputState.prev !== null) inputState.prev.cancel()

	inputState.prev = inputState.curr
	inputState.curr = input({ message: `${pico.green(username)}@${pico.magenta(roomId)}>`, theme: { prefix: "👉" } });

	inputState.curr.then((message) => {
		if (typeof message !== "string") return

		message = message.trim()
		if (message === ":quit" || message === ":q") {
			quitRoom(username, roomId)
		}
		socket.emit("create:chat", { username, roomId, message });
	}).catch(() => console.log("error"))

	return inputState.curr
}

async function quitRoom(username: string, roomId: string) {
	socket.emit("remove:member", { username, roomId });
	console.log(pico.bgGreen(pico.white(" SUCCESS ") + pico.green(" Connection closed.")))
	socket.disconnect()
	process.exit(0)
}

type RenderProps = {
	username: string;
	roomId: string;
	currUsername: string;
	currRoomId: string;
};

async function render(logs: Log[], props: RenderProps) {
	const { username, roomId, currUsername, currRoomId } = props;

	console.clear();

	logs.forEach((log) => {
		console.log(log.message);
	});

	if (username === currUsername) {
		chatPrompt(currUsername, currRoomId);
		return
	}

	process.stdout.write(pico.bold(`👉 ${pico.green(currUsername)}@${pico.magenta(currRoomId)}> `))
}

main();