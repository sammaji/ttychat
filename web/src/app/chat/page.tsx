"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React, { useEffect, useRef } from "react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { nanoid } from "nanoid";
import socket from "@/lib/socket";
import { io } from "socket.io-client";

type ChatBubble = {
  username?: string;
  message: React.ReactNode | string;
};

function ChatBubbleRecieved({ message, username }: ChatBubble) {
  return (
    <li className="max-w-lg flex gap-x-2 sm:gap-x-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2">
        {username && (
          <p className="text-sm font-medium leading-none">{`@${username}`}</p>
        )}
        {typeof message === "string" ? (
          <p className="leading-7 [&:not(:first-child)]:mt-6">{message}</p>
        ) : (
          message
        )}
      </div>
    </li>
  );
}

function ChatBubbleSent({ message }: ChatBubble) {
  return (
    <li className="max-w-lg ms-auto flex justify-end gap-x-2 sm:gap-x-4">
      <div className="grow text-end space-y-3">
        <div className="inline-block bg-blue-600 rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-white">{message}</p>
        </div>
      </div>
    </li>
  );
}

type ConnectionStatus = "disconnected" | "connecting" | "connected";
type EventLog = { uid: string } & (
  | {
      type: "message";
      username: string;
      userId: string;
      message: string;
      roomId: string;
    }
  | { type: "user_join"; username: string; userId: string; roomId: string }
  | { type: "user_leave"; username: string; userId: string; roomId: string }
  | { type: "error"; error: any }
);

function ChatBubble({
  logs,
  username,
}: {
  logs: EventLog[];
  username: string | null;
}) {
  const uids = new Set<string>();

  return logs.map((log, index) => {
    if (uids.has(log.uid)) return null;
    uids.add(log.uid);

    if (log.type === "error") return <p key={index}>{log.error}</p>;
    else if (log.type === "user_join")
      return <p key={index}>{`@${log.username} joined the room`}</p>;
    else if (log.type === "user_leave")
      return <p key={index}>{`@${log.username} left the room`}</p>;

    if (log.type === "message") {
      if (log.username === username)
        return <ChatBubbleSent key={index} message={log.message} />;
      return (
        <ChatBubbleRecieved
          key={index}
          username={log.username}
          message={log.message}
        />
      );
    }
  });
}

// let socket: ReturnType<typeof io> | null = null;
// let socket: ReturnType<typeof io> | { on: () => void; emit: () => void; off: () => void };

const ioInit = async () => {
  socket.on("connect", () => {
    console.log("connected");
  });
  socket.on("disconnect", () => {
    console.log("disconnected");
  });
  socket.on("connect_error", (error) => {
    console.log("connect_error", error);
  });
};

export default function Home() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [username, setUsername] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [logs, setLogs] = useState<EventLog[]>([]);

  useEffect(() => {
    ioInit();
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    console.log(logs);

    // socket events
    socket?.on("create:room:success", (message) => {
      setStatus("connected");
      setLogs((x) => [
        ...x,
        {
          uid: message.uid,
          type: "user_join",
          username: message.username,
          userId: message.userId,
          roomId: message.roomId,
        },
      ]);
    });

    socket?.on("add:member:success", (message) => {
      setStatus("connected");
      setLogs((x) => [
        ...x,
        {
          uid: message.uid,
          type: "user_join",
          username: message.username,
          userId: message.userId,
          roomId: message.roomId,
        },
      ]);
    });

    socket?.on("remove:member:success", (message) => {
      setStatus("connected");
      setLogs((x) => [
        ...x,
        {
          uid: message.uid,
          type: "user_join",
          username: message.username,
          userId: message.userId,
          roomId: message.roomId,
        },
      ]);
    });

    socket?.on("create:chat:success", (message) => {
      setLogs((x) => [
        ...x,
        {
          uid: message.uid,
          type: "message",
          username: message.username,
          userId: message.userId,
          message: message.message,
          roomId: message.roomId,
        },
      ]);
    });

    socket?.on("error", (error) => {
      alert(error);
      setStatus("disconnected");
    });
  }, [logs]);

  const {
    reset,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const {
    reset: resetAlt,
    register: registerAlt,
    handleSubmit: handleSubmitAlt,
    formState: { errors: errorsAlt },
  } = useForm();

  const {
    reset: resetChat,
    register: registerChat,
    handleSubmit: handleSubmitChat,
    formState: { errors: errorsChat },
  } = useForm();
  
  const onCreateSubmit = handleSubmit((data) => {
    setUsername(data.username);
    setRoomId(nanoid(6));
    socket?.emit("create:room", {
      username: data.username,
      roomId: data.roomId,
      userId: data.username,
    });
    setStatus("connecting");
    reset()
  });

  const onJoinSubmit = handleSubmitAlt((data) => {
    setUsername(data.username);
    setRoomId(data.roomId);
    socket?.emit("add:member", {
      username: data.username,
      roomId: data.roomId,
      userId: data.username,
    });
    setStatus("connecting");
    resetAlt()
  });

  const onChatSubmit = handleSubmitChat((data) => {
    console.log(data)
    socket?.emit("create:chat", {username, roomId, userId: username, message: data.message})
    resetChat()
  })

  return (
    <main className="bg-slate-100 w-full h-screen">
      <div className="bg-background max-w-[800px] h-full mx-auto grid grid-rows-[1fr_auto] grid-cols-1">
        {status === "disconnected" && (
          <React.Fragment>
            <div className="p-8 m m-auto">
              <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight"></h3>
              <Tabs defaultValue="create" className="w-[400px]">
                <TabsList className="grid w-full h-[48px] grid-cols-2">
                  <TabsTrigger className="h-full" value="create">
                    Create
                  </TabsTrigger>
                  <TabsTrigger className="h-full" value="join">
                    Join
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="create" asChild>
                  <Card>
                    <form onSubmit={onCreateSubmit}>
                      <CardHeader>
                        <CardTitle>Create</CardTitle>
                        <CardDescription>
                          Create a new room and invite your friends.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="space-y-1">
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            placeholder="Pick a unique username"
                            {...register("username", { required: true })}
                          />
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button type="submit">Create</Button>
                      </CardFooter>
                    </form>
                  </Card>
                </TabsContent>
                <TabsContent value="join" asChild>
                  <form onSubmit={onJoinSubmit}>
                    <Card>
                      <CardHeader>
                        <CardTitle>Join</CardTitle>
                        <CardDescription>
                          Join an existing room and start chatting.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="space-y-1">
                          <Label htmlFor="roomid-join-form">Room ID</Label>
                          <Input
                            id="roomid-join-form"
                            placeholder="Provide room id"
                            {...registerAlt("roomId", { required: true })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="username-join-form">Username</Label>
                          <Input
                            id="username-join-form"
                            placeholder="Pick a username"
                            {...registerAlt("username", { required: true })}
                          />
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button type="submit">Join</Button>
                      </CardFooter>
                    </Card>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </React.Fragment>
        )}

        {status === "connecting" && (
          <React.Fragment>
            <p>Connecting...</p>
          </React.Fragment>
        )}

        {status === "connected" && (
          <React.Fragment>
            <ScrollArea>
              <ul className="space-y-5 p-8">
                <ChatBubble logs={logs} username={username} />
              </ul>
            </ScrollArea>
            <form onSubmit={onChatSubmit} className="flex gap-4 px-8 pb-8">
              <Input
                placeholder="Type your message here..."
                className="h-[48px]"
                {...registerChat("message")}
              />
              <Button type="submit" size="lg" className="h-[48px]">
                Send
              </Button>
            </form>
          </React.Fragment>
        )}
      </div>
    </main>
  );
}
