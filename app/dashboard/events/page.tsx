import { TopBar } from "@/components/layout/TopBar";
import { EventPostCreator } from "@/components/events/EventPostCreator";

export const metadata = { title: "Event Post Creator" };

export default function EventsPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title="Event Post Creator"
        subtitle="Turn any event into a polished LinkedIn post"
      />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <EventPostCreator />
        </div>
      </div>
    </div>
  );
}
