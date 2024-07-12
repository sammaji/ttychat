import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <main className="w-full h-screen overflow-auto">
      <div className="fixed flex w-full h-[72px] border-b items-center justify-between px-8">
        <p>ttychat.</p>
        <div className="flex gap-4 items-center justify-center">
          <div><Link href="/chat">Chat</Link></div>
          <div><Link href="/download">Download</Link></div>
          <Button>Login</Button>
        </div>
      </div>
      <div className="w-full h-screen flex flex-col items-center justify-center gap-6">
        <h1 className="scroll-m-20 text-4xl tracking-tight lg:text-5xl">Realtime chat inside your terminal.</h1>
        <p className="leading-8 text-xl text-muted-foreground w-1/2 text-center">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
        <div className="flex items-center justify-center gap-4">
          <Button className="text-lg py-6" size="lg">Install now</Button>
          <Button className="text-lg py-6" size="lg" variant="outline">Web client</Button>
        </div>
      </div>
    </main>
  );
}
