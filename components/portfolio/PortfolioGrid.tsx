"use client";

import { useState } from "react";
import { ArrowUpRight, MapPin, Calendar, ExternalLink } from "lucide-react";

interface Company {
  name: string;
  tagline: string;
  sector: string;
  stage: string;
  country: string;
  backedAt: string;
  description: string;
  tags: string[];
  website: string;
  highlight?: string; // one-line notable fact / traction
}

const COMPANIES: Company[] = [
  {
    name: "Panakeia",
    tagline: "AI-powered computational pathology",
    sector: "Healthcare",
    stage: "Seed",
    country: "United Kingdom",
    backedAt: "2023",
    description:
      "Computational pathology platform using AI to extract molecular insights from standard tissue slides, enabling faster and cheaper cancer diagnostics without additional staining or sequencing.",
    tags: ["AI", "Diagnostics", "Oncology", "Pathology"],
    website: "https://panakeia.ai",
    highlight: "Reduces cancer diagnostic time from weeks to hours",
  },
  {
    name: "Rigor AI",
    tagline: "Quality assurance for mission-critical software",
    sector: "Technology",
    stage: "Pre-Seed",
    country: "Switzerland",
    backedAt: "2024",
    description:
      "AI-powered quality assurance and testing infrastructure for mission-critical software systems, reducing manual testing overhead while improving coverage.",
    tags: ["AI", "Software Testing", "DevOps", "Enterprise"],
    website: "https://rigor.ai",
    highlight: "Targets aerospace, automotive, and medical device software",
  },
  {
    name: "Signatur Bio",
    tagline: "Early disease detection through liquid biopsy",
    sector: "Healthcare",
    stage: "Pre-Seed",
    country: "Switzerland",
    backedAt: "2023",
    description:
      "Liquid biopsy technology enabling early detection of disease through high-sensitivity biomarker analysis from a simple blood draw.",
    tags: ["Diagnostics", "Genomics", "MedTech", "Cancer"],
    website: "https://signatur.bio",
    highlight: "Non-invasive cancer screening at early stage",
  },
  {
    name: "Surf Therapeutics",
    tagline: "Next-gen surfactant therapies for lung disease",
    sector: "Healthcare",
    stage: "Seed",
    country: "Switzerland",
    backedAt: "2022",
    description:
      "Developing next-generation surfactant therapies for respiratory conditions including neonatal and adult lung disease, addressing high unmet clinical needs.",
    tags: ["Therapeutics", "Respiratory", "Drug Discovery", "Neonatal"],
    website: "https://surftherapeutics.com",
    highlight: "Addressing $3B+ surfactant therapy market",
  },
  {
    name: "Sleepiz",
    tagline: "Contact-free clinical sleep monitoring at home",
    sector: "Healthcare",
    stage: "Seed",
    country: "Switzerland",
    backedAt: "2023",
    description:
      "Contact-free sleep monitoring device using radar technology to diagnose sleep apnea and other disorders from home, democratising clinical-grade sleep diagnostics.",
    tags: ["Sleep", "Diagnostics", "Radar", "Digital Health"],
    website: "https://sleepiz.com",
    highlight: "FDA Breakthrough Device designation",
  },
  {
    name: "Swisspod",
    tagline: "Hyperloop transportation technology",
    sector: "Deep Tech",
    stage: "Seed",
    country: "Switzerland",
    backedAt: "2022",
    description:
      "Hyperloop technology company developing ultra-fast low-pressure tube transportation pods for sustainable long-distance travel at speeds exceeding 1,000 km/h.",
    tags: ["Hyperloop", "Transportation", "Sustainability", "Infrastructure"],
    website: "https://swisspod.com",
    highlight: "World record 463 km/h in hyperloop test",
  },
  {
    name: "Ethereal X",
    tagline: "Next-generation space infrastructure",
    sector: "Deep Tech",
    stage: "Pre-Seed",
    country: "Global",
    backedAt: "2024",
    description:
      "Building next-generation space infrastructure and satellite systems for global connectivity and earth observation, targeting underserved orbital regimes.",
    tags: ["Satellites", "Space", "Connectivity", "Earth Observation"],
    website: "https://etherealx.space",
    highlight: "Targeting LEO satellite constellation",
  },
  {
    name: "Manas TU Space",
    tagline: "Affordable small satellites for Central Asia",
    sector: "Deep Tech",
    stage: "Pre-Seed",
    country: "Kyrgyzstan",
    backedAt: "2023",
    description:
      "Central Asian space technology company developing affordable small satellite solutions for regional remote sensing, pioneering the space industry in Central Asia.",
    tags: ["Small Satellites", "Remote Sensing", "Central Asia", "Earth Observation"],
    website: "https://manastuspace.com",
    highlight: "First space startup from Kyrgyzstan",
  },
  {
    name: "Kicksky",
    tagline: "The global space startup accelerator",
    sector: "Deep Tech",
    stage: "Pre-Seed",
    country: "Global",
    backedAt: "2023",
    description:
      "Space startup accelerator and venture studio co-founded by Riceberg Ventures to identify and back the next generation of breakthrough space founders worldwide.",
    tags: ["Space", "Accelerator", "Deep Tech", "Venture Studio"],
    website: "https://kicksky.space",
    highlight: "Portfolio of 12+ space startups across 8 countries",
  },
  {
    name: "Keyron",
    tagline: "Tamper-proof hardware authentication",
    sector: "Technology",
    stage: "Pre-Seed",
    country: "Switzerland",
    backedAt: "2024",
    description:
      "Hardware security company building tamper-proof authentication solutions for critical infrastructure and IoT devices, protecting against physical and cyber attacks.",
    tags: ["Security", "Hardware", "IoT", "Critical Infrastructure"],
    website: "https://keyron.com",
    highlight: "Physical unclonable function (PUF) technology",
  },
  {
    name: "Arch0",
    tagline: "Foundational computing architecture",
    sector: "Technology",
    stage: "Pre-Seed",
    country: "Global",
    backedAt: "2024",
    description:
      "Deep tech venture developing foundational computing architecture for next-generation secure and efficient systems, targeting performance bottlenecks at the hardware level.",
    tags: ["Computing", "Architecture", "Security", "Hardware"],
    website: "https://arch0.io",
    highlight: "Novel ISA design for post-quantum era",
  },
  {
    name: "Bchar",
    tagline: "Carbon capture through biochar production",
    sector: "Climate",
    stage: "Pre-Seed",
    country: "Switzerland",
    backedAt: "2023",
    description:
      "Carbon capture and soil enrichment company producing high-quality biochar from agricultural and forestry waste streams, generating verified carbon removal credits.",
    tags: ["Carbon Capture", "Biochar", "Agriculture", "Carbon Credits"],
    website: "https://bchar.com",
    highlight: "Verified Puro.earth carbon removal certificates",
  },
];

const ALL_SECTORS = ["All", ...Array.from(new Set(COMPANIES.map((c) => c.sector))).sort()];

const SECTOR_STYLE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Technology:  { bg: "bg-[#5CD3D3]/10", text: "text-[#5CD3D3]",  border: "border-[#5CD3D3]/25", dot: "#5CD3D3" },
  Healthcare:  { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/25", dot: "#A78BFA" },
  "Deep Tech": { bg: "bg-amber-500/10",  text: "text-amber-400",  border: "border-amber-500/25",  dot: "#FBBF24" },
  Climate:     { bg: "bg-emerald-500/10",text: "text-emerald-400",border: "border-emerald-500/25",dot: "#34D399" },
  Finance:     { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/25",   dot: "#60A5FA" },
  Consumer:    { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/25", dot: "#FB923C" },
};

const STAGE_LABEL: Record<string, string> = {
  "Pre-Seed": "Pre-Seed",
  "Seed":     "Seed",
  "Series A": "Series A",
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
  const preSeed = COMPANIES.filter((c) => c.stage === "Pre-Seed").length;
  const seed = COMPANIES.filter((c) => c.stage === "Seed").length;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 border-b border-border pb-6">
        <StatCard label="Portfolio Companies" value={COMPANIES.length} />
        <StatCard label="Sectors" value={ALL_SECTORS.length - 1} />
        <StatCard label="Countries" value={countries} />
        <StatCard label="Pre-Seed" value={preSeed} />
        <StatCard label="Seed" value={seed} />
      </div>

      {/* Sector filter chips */}
      <div className="flex flex-wrap gap-2">
        {ALL_SECTORS.map((sector) => {
          const style = SECTOR_STYLE[sector];
          const isActive = activeSector === sector;
          return (
            <button
              key={sector}
              onClick={() => setActiveSector(sector)}
              className={[
                "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium border transition-all rounded-[3px]",
                isActive && style
                  ? `${style.bg} ${style.text} ${style.border}`
                  : isActive
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground",
              ].join(" ")}
            >
              {style && isActive && (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: style.dot }}
                />
              )}
              {sector}
              {sector !== "All" && (
                <span className="tabular-nums opacity-50 text-[10px]">{sectorCounts[sector]}</span>
              )}
            </button>
          );
        })}
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5 p-4 border border-border">
      <p className="text-2xl font-light tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.08em]">{label}</p>
    </div>
  );
}

function CompanyCard({ company }: { company: Company }) {
  const style = SECTOR_STYLE[company.sector] ?? {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-transparent",
    dot: "#94A3B8",
  };

  return (
    <div className="group flex flex-col border border-border bg-card transition-all hover:border-foreground/20 hover:shadow-sm">
      {/* Card header */}
      <div className="p-5 pb-3 space-y-3">
        {/* Avatar + stage */}
        <div className="flex items-start justify-between gap-2">
          <div
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center text-xs font-bold border rounded-[2px]",
              style.bg,
              style.text,
              style.border,
            ].join(" ")}
          >
            {initials(company.name)}
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium border border-border text-muted-foreground bg-muted/30 rounded-[2px]">
            {STAGE_LABEL[company.stage] ?? company.stage}
          </span>
        </div>

        {/* Name + tagline */}
        <div>
          <h3 className="text-sm font-semibold leading-snug">{company.name}</h3>
          <p className={["text-xs font-medium mt-0.5", style.text].join(" ")}>
            {company.tagline}
          </p>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {company.description}
        </p>

        {/* Highlight pill */}
        {company.highlight && (
          <div className={["inline-flex items-center px-2 py-1 text-[10px] border rounded-[2px]", style.bg, style.border, style.text].join(" ")}>
            <span className="mr-1 opacity-60">→</span>
            {company.highlight}
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="px-5 pb-3 flex flex-wrap gap-1.5">
        {company.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center px-2 py-0.5 text-[10px] border border-border text-muted-foreground bg-muted/20 rounded-[2px]"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-border px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {company.country}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {company.backedAt}
          </span>
        </div>
        <a
          href={company.website}
          target="_blank"
          rel="noopener noreferrer"
          className={[
            "inline-flex items-center gap-1 text-[11px] font-medium transition-colors",
            style.text,
            "opacity-60 group-hover:opacity-100",
          ].join(" ")}
          onClick={(e) => e.stopPropagation()}
        >
          Visit <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
