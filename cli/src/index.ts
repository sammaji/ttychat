import generateUniqueId from "generate-unique-id";
import pico from "picocolors";
import { io } from "socket.io-client";
import { terminal } from "terminal-kit";
import dotenv from "dotenv";

dotenv.config()

const socket = io(process.env.SOCKET_URL);

type Log = { message: string };

async function main() {
	const logs: Log[] = [];

	terminal.grabInput(true);
	terminal.on("key", (key) => {
		if (key === "CTRL_C") {
			console.log("Closing server...");
			if (globalThis.curr !== undefined || globalThis.curr.username !== undefined || globalThis.curr.roomId !== undefined) {
				socket.emit("remove:member", { username: globalThis.curr.username, roomId: globalThis.curr.roomId });
			}
			socket.disconnect();
			process.exit(0);
		}
	});

	promptRoomCreate(logs);
}

async function promptRoomCreate(logs: Log[] = []) {

	terminal.magenta("Do you want to create a new room or join an existing one?");
	terminal.singleColumnMenu(["> Create room  ", "> Join room  "], { cancelable: true }, async (error, res) => {
		if (error) {
			throw error;
		}

		/**
		 * ERROR EVENTS
		 */
		socket.on("error", (error) => {
			terminal("\n")
			terminal.bgRed.white(" ERROR ")
			terminal(" ")
			terminal(pico.red(error.message))
			terminal("\n")

			socket.disconnect()
			process.exit(1)
		})

		terminal("\n");

		let currRoomId: string;
		let currUsername: string;

		if (res.selectedIndex === 0) {
			currRoomId = generateUniqueId({ length: 6 })
		}
		else {
			terminal(`${pico.green("?")} Enter room code to join: `);
			currRoomId = await (terminal.inputField({ cancelable: true, default: "" }).promise)
		}


		terminal("\n");
		terminal(`${pico.green("?")} Enter username: `);
		currUsername = await (terminal.inputField({ cancelable: true, default: "" }).promise)

		if (res.selectedIndex === 0) {
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
	})
}

async function chatPrompt(username: string, roomId: string) {
	let message = await (terminal.inputField({ cancelable: true, default: "" }).promise)

	message = message.trim()
	if (message === ":quit" || message === ":q") {
		quitRoom(username, roomId)
	}
	socket.emit("create:chat", { username, roomId, message });
}

async function quitRoom(username: string, roomId: string) {
	socket.emit("remove:member", { username, roomId });

	terminal("\n")
	terminal.bgGreen.white(" SUCCESS ");
	terminal(" Connection closed.")
	terminal("\n")

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

	terminal.clear();

	logs.forEach((log) => {
		console.log(log.message);
	});

	terminal(`${pico.green(currUsername)}@${pico.magenta(roomId)}> `);
	if (username === currUsername) {
		chatPrompt(currUsername, currRoomId);
	}
}

main();