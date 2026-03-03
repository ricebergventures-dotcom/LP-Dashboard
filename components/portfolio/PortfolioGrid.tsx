"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

interface Company {
  name: string;
  sector: string;
  stage: string;
  country: string;
  description: string;
  website: string;
}

const COMPANIES: Company[] = [
  {
    name: "Rigor AI",
    sector: "AI/ML",
    stage: "Pre-Seed",
    country: "Switzerland",
    description: "AI-powered quality assurance and testing infrastructure for mission-critical software systems.",
    website: "https://rigor.ai",
  },
  {
    name: "Panakeia",
    sector: "Biotech",
    stage: "Seed",
    country: "United Kingdom",
    description: "Computational pathology platform using AI to extract molecular insights from standard tissue slides, enabling faster and cheaper cancer diagnostics.",
    website: "https://panakeia.ai",
  },
  {
    name: "Signatur Bio",
    sector: "Biotech",
    stage: "Pre-Seed",
    country: "Switzerland",
    description: "Liquid biopsy technology enabling early detection of disease through high-sensitivity biomarker analysis.",
    website: "https://signatur.bio",
  },
  {
    name: "Surf Therapeutics",
    sector: "Biotech",
    stage: "Seed",
    country: "Switzerland",
    description: "Developing next-generation surfactant therapies for respiratory conditions including neonatal and adult lung disease.",
    website: "https://surftherapeutics.com",
  },
  {
    name: "Sleepiz",
    sector: "HealthTech",
    stage: "Seed",
    country: "Switzerland",
    description: "Contact-free sleep monitoring device using radar technology to diagnose sleep apnea and other disorders from home.",
    website: "https://sleepiz.com",
  },
  {
    name: "Ethereal X",
    sector: "SpaceTech",
    stage: "Pre-Seed",
    country: "Global",
    description: "Building next-generation space infrastructure and satellite systems for global connectivity and earth observation.",
    website: "https://etherealx.space",
  },
  {
    name: "Manas TU Space",
    sector: "SpaceTech",
    stage: "Pre-Seed",
    country: "Kyrgyzstan",
    description: "Central Asian space technology company developing affordable small satellite solutions for regional remote sensing.",
    website: "https://manastuspace.com",
  },
  {
    name: "Kicksky",
    sector: "SpaceTech",
    stage: "Pre-Seed",
    country: "Global",
    description: "Space startup accelerator and venture studio co-founded by Riceberg Ventures to scout and back the next generation of space founders.",
    website: "https://kicksky.space",
  },
  {
    name: "Swisspod",
    sector: "DeepTech",
    stage: "Seed",
    country: "Switzerland",
    description: "Hyperloop technology company developing ultra-fast low-pressure tube transportation pods for sustainable long-distance travel.",
    website: "https://swisspod.com",
  },
  {
    name: "Keyron",
    sector: "DeepTech",
    stage: "Pre-Seed",
    country: "Switzerland",
    description: "Hardware security company building tamper-proof authentication solutions for critical infrastructure and IoT devices.",
    website: "https://keyron.com",
  },
  {
    name: "Arch0",
    sector: "DeepTech",
    stage: "Pre-Seed",
    country: "Global",
    description: "Deep tech venture developing foundational computing architecture for next-generation secure and efficient systems.",
    website: "https://arch0.io",
  },
  {
    name: "Bchar",
    sector: "CleanTech",
    stage: "Pre-Seed",
    country: "Switzerland",
    description: "Carbon capture and soil enrichment company producing high-quality biochar from agricultural and forestry waste streams.",
    website: "https://bchar.com",
  },
];

const ALL_SECTORS = ["All", ...Array.from(new Set(COMPANIES.map((c) => c.sector))).sort()];

const SECTOR_COLORS: Record<string, string> = {
  "AI/ML":     "bg-[#5CD3D3]/15 text-[#5CD3D3] border-[#5CD3D3]/30",
  "Biotech":   "bg-violet-500/10 text-violet-400 border-violet-500/30",
  "HealthTech":"bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  "SpaceTech": "bg-blue-500/10 text-blue-400 border-blue-500/30",
  "DeepTech":  "bg-orange-500/10 text-orange-400 border-orange-500/30",
  "CleanTech": "bg-green-500/10 text-green-400 border-green-500/30",
};

const AVATAR_COLORS: Record<string, string> = {
  "AI/ML":     "bg-[#5CD3D3]/20 text-[#5CD3D3]",
  "Biotech":   "bg-violet-500/20 text-violet-400",
  "HealthTech":"bg-emerald-500/20 text-emerald-400",
  "SpaceTech": "bg-blue-500/20 text-blue-400",
  "DeepTech":  "bg-orange-500/20 text-orange-400",
  "CleanTech": "bg-green-500/20 text-green-400",
};

const STAGE_DOT: Record<string, string> = {
  "Pre-Seed": "bg-muted-foreground/50",
  "Seed":     "bg-[#5CD3D3]",
  "Series A": "bg-violet-400",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function PortfolioGrid() {
  const [activeSector, setActiveSector] = useState("All");

  const filtered =
    activeSector === "All"
      ? COMPANIES
      : COMPANIES.filter((c) => c.sector === activeSector);

  const sectorCounts = Object.fromEntries(
    ALL_SECTORS.filter((s) => s !== "All").map((s) => [
      s,
      COMPANIES.filter((c) => c.sector === s).length,
    ])
  );

  const countries = new Set(COMPANIES.map((c) => c.country)).size;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="flex gap-8 border-b border-border pb-5">
        <Stat label="Companies" value={COMPANIES.length} />
        <Stat label="Sectors" value={ALL_SECTORS.length - 1} />
        <Stat label="Countries" value={countries} />
        <Stat
          label="Pre-Seed"
          value={COMPANIES.filter((c) => c.stage === "Pre-Seed").length}
        />
        <Stat
          label="Seed"
          value={COMPANIES.filter((c) => c.stage === "Seed").length}
        />
      </div>

      {/* Sector filter chips */}
      <div className="flex flex-wrap gap-2">
        {ALL_SECTORS.map((sector) => (
          <button
            key={sector}
            onClick={() => setActiveSector(sector)}
            className={[
              "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium border transition-colors",
              activeSector === sector
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground",
            ].join(" ")}
          >
            {sector}
            {sector !== "All" && (
              <span className="tabular-nums opacity-50">{sectorCounts[sector]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Company grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((company) => (
          <CompanyCard key={company.name} company={company} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">
          No companies in this sector.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-0.5">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function CompanyCard({ company }: { company: Company }) {
  const avatarColor = AVATAR_COLORS[company.sector] ?? "bg-muted text-muted-foreground";
  const sectorColor = SECTOR_COLORS[company.sector] ?? "bg-muted text-muted-foreground border-transparent";
  const stageDot = STAGE_DOT[company.stage] ?? "bg-muted-foreground/50";

  return (
    <div className="group flex flex-col gap-3 rounded-none border border-border bg-background p-5 transition-all hover:border-foreground/30 hover:shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className={[
              "flex h-9 w-9 shrink-0 items-center justify-center text-xs font-bold",
              avatarColor,
            ].join(" ")}
          >
            {initials(company.name)}
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{company.name}</p>
            <p className="text-[11px] text-muted-foreground">{company.country}</p>
          </div>
        </div>
        <a
          href={company.website}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
          aria-label={`Visit ${company.name}`}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
        {company.description}
      </p>

      {/* Footer tags */}
      <div className="mt-auto flex items-center gap-2 flex-wrap">
        <span
          className={[
            "inline-flex items-center px-2 py-0.5 text-[10px] font-medium border",
            sectorColor,
          ].join(" ")}
        >
          {company.sector}
        </span>

        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className={["h-1.5 w-1.5 rounded-full", stageDot].join(" ")} />
          {company.stage}
        </span>
      </div>
    </div>
  );
}
