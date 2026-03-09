import { Sidebar } from "./Sidebar";
import { PageFade } from "./PageFade";
import { ChatWidget } from "@/components/chat/ChatWidget";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <PageFade>{children}</PageFade>
      <ChatWidget />
    </div>
  );
}
