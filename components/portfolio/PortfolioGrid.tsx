"use client";

import { useState } from "react";
import { MapPin, Calendar, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  highlight?: string;
  syndicate?: boolean;
}

const COMPANIES: Company[] = [
  {
    name: "EtherealX",
    tagline: "Next-generation space infrastructure",
    sector: "Spacetech",
    stage: "Pre-Seed",
    country: "India",
    backedAt: "2024",
    description:
      "Building next-generation satellite and space infrastructure systems for global connectivity and earth observation, targeting underserved orbital regimes from a Bangalore-based engineering hub.",
    tags: ["Satellites", "Space", "Connectivity", "Earth Observation"],
    website: "https://etherealx.space",
    highlight: "Targeting LEO satellite constellation",
  },
  {
    name: "Manastu Space",
    tagline: "Green propulsion for small satellites",
    sector: "Spacetech",
    stage: "Pre-Seed",
    country: "India",
    backedAt: "2023",
    description:
      "Mumbai-based space tech company developing high-performance green propulsion systems for small satellites and CubeSats, replacing toxic hydrazine with safer, more efficient alternatives.",
    tags: ["Propulsion", "Small Satellites", "Green Tech", "NewSpace"],
    website: "https://manastuspace.com",
    highlight: "Non-toxic propellant with 30% higher performance",
  },
  {
    name: "Signatur Biosciences",
    tagline: "Early disease detection through liquid biopsy",
    sector: "Life Science",
    stage: "Pre-Seed",
    country: "United Kingdom",
    backedAt: "2023",
    description:
      "London-based liquid biopsy company enabling early detection of disease through high-sensitivity biomarker analysis from a simple blood draw, targeting oncology and chronic disease screening.",
    tags: ["Diagnostics", "Genomics", "MedTech", "Cancer"],
    website: "https://signatur.bio",
    highlight: "Non-invasive cancer screening at early stage",
  },
  {
    name: "Keyron Medical",
    tagline: "Secure hardware solutions for medical devices",
    sector: "Life Science",
    stage: "Pre-Seed",
    country: "United Kingdom",
    backedAt: "2024",
    description:
      "London-based medtech company developing tamper-proof hardware authentication and security infrastructure for connected medical devices and clinical IoT, protecting patient data and device integrity.",
    tags: ["MedTech", "IoT", "Medical Devices", "Security"],
    website: "https://keyron.com",
    highlight: "Physical unclonable function (PUF) for medical-grade security",
  },
  {
    name: "Surf Therapeutic",
    tagline: "Next-gen surfactant therapies for lung disease",
    sector: "Life Science",
    stage: "Seed",
    country: "United States",
    backedAt: "2022",
    description:
      "Austin-based biotech developing next-generation surfactant therapies for respiratory conditions including neonatal and adult lung disease, addressing significant unmet clinical needs.",
    tags: ["Therapeutics", "Respiratory", "Drug Discovery", "Neonatal"],
    website: "https://surftherapeutics.com",
    highlight: "Addressing $3B+ surfactant therapy market",
  },
  {
    name: "Sleepiz",
    tagline: "Contact-free clinical sleep monitoring at home",
    sector: "Life Science",
    stage: "Seed",
    country: "Switzerland",
    backedAt: "2023",
    description:
      "Zurich-based medtech company using radar technology to diagnose sleep apnea and other disorders from home, democratising clinical-grade sleep diagnostics without contact or wearables.",
    tags: ["Sleep", "Diagnostics", "Radar", "Digital Health"],
    website: "https://sleepiz.com",
    highlight: "FDA Breakthrough Device designation",
    syndicate: true,
  },
  {
    name: "Swisspod",
    tagline: "Hyperloop transportation technology",
    sector: "Climate Tech",
    stage: "Seed",
    country: "Switzerland",
    backedAt: "2022",
    description:
      "Lausanne and Colorado-based company developing ultra-fast low-pressure tube transportation pods for sustainable long-distance travel, targeting zero-emission high-speed intercity mobility.",
    tags: ["Hyperloop", "Transportation", "Sustainability", "Clean Mobility"],
    website: "https://swisspod.com",
    highlight: "World record 463 km/h in hyperloop test",
  },
  {
    name: "BChar",
    tagline: "Carbon capture through biochar production",
    sector: "Climate Tech",
    stage: "Pre-Seed",
    country: "Switzerland",
    backedAt: "2023",
    description:
      "Zurich-based carbon removal company producing high-quality biochar from agricultural and forestry waste streams, generating verified durable carbon removal credits for the voluntary carbon market.",
    tags: ["Carbon Capture", "Biochar", "Agriculture", "Carbon Credits"],
    website: "https://bchar.com",
    highlight: "Verified Puro.earth carbon removal certificates",
    syndicate: true,
  },
  {
    name: "Rigor AI",
    tagline: "AI-powered security testing for critical software",
    sector: "Cybersecurity",
    stage: "Pre-Seed",
    country: "United States",
    backedAt: "2024",
    description:
      "San Francisco-based company building AI-driven security and quality assurance infrastructure for mission-critical software systems in aerospace, automotive, and medical device industries.",
    tags: ["AI", "Security Testing", "Critical Infrastructure", "Enterprise"],
    website: "https://rigor.ai",
    highlight: "Targets aerospace, automotive, and medical device software",
    syndicate: true,
  },
  {
    name: "Arch0",
    tagline: "Foundational computing architecture",
    sector: "Cybersecurity",
    stage: "Pre-Seed",
    country: "India",
    backedAt: "2024",
    description:
      "Deep tech venture with presence in Bangalore and San Francisco developing foundational secure computing architecture for next-generation systems, targeting security vulnerabilities at the hardware level.",
    tags: ["Computing", "Architecture", "Security", "Hardware"],
    website: "https://arch0.io",
    highlight: "Novel ISA design for post-quantum era",
  },
];

const ALL_SECTORS = ["All", ...Array.from(new Set(COMPANIES.map((c) => c.sector))).sort()];

const SECTOR_STYLE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "Life Science":      { bg: "bg-violet-500/10",  text: "text-violet-400",  border: "border-violet-500/25",  dot: "#A78BFA" },
  "Spacetech":         { bg: "bg-indigo-500/10",  text: "text-indigo-400",  border: "border-indigo-500/25",  dot: "#818CF8" },
  "Future of Compute": { bg: "bg-[#5CD3D3]/10",   text: "text-[#5CD3D3]",   border: "border-[#5CD3D3]/25",   dot: "#5CD3D3" },
  "Quantum":           { bg: "bg-fuchsia-500/10", text: "text-fuchsia-400", border: "border-fuchsia-500/25", dot: "#E879F9" },
  "Climate Tech":      { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/25", dot: "#34D399" },
  "Cybersecurity":     { bg: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/25",     dot: "#F87171" },
  "Fintech":           { bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/25",    dot: "#60A5FA" },
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
        <AnimatePresence mode="popLayout">
          {filtered.map((company, i) => (
            <motion.div
              key={company.name}
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.22, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] } }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
            >
              <CompanyCard company={company} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-muted-foreground text-center py-12"
        >
          No companies in this sector.
        </motion.p>
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
    <div className="group flex flex-col border border-border bg-card transition-all duration-200 hover:border-foreground/20 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]">
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
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium border border-border text-muted-foreground bg-muted/30 rounded-[2px]">
              {STAGE_LABEL[company.stage] ?? company.stage}
            </span>
            {company.syndicate && (
              <span className="inline-flex items-center px-2 py-1 text-[10px] font-medium border border-amber-500/25 text-amber-400 bg-amber-500/10 rounded-[2px]">
                Syndicate
              </span>
            )}
          </div>
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
