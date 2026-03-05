import { Sidebar } from "./Sidebar";
import { PageFade } from "./PageFade";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      {/* PageFade handles per-route fade + subtle slide on navigation */}
      <PageFade>{children}</PageFade>
    </div>
  );
}
