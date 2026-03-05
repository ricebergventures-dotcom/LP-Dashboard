import { TopBar } from "@/components/layout/TopBar";
import { PortfolioGrid } from "@/components/portfolio/PortfolioGrid";

export const metadata = { title: "Portfolio" };

export default function PortfolioPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar title="Portfolio" subtitle="Riceberg Ventures — owned companies" />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <PortfolioGrid />
        </div>
      </div>
    </div>
  );
}
