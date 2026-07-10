"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import SchoolSection from "./components/SchoolSection";
import FinancesSection from "./components/FinancesSection";
import ReadingSection from "./components/ReadingSection";
import WorkoutsSection from "./components/WorkoutsSection";
import ContentSection from "./components/ContentSection";
import ProjectsSection from "./components/ProjectsSection";
import BentoCard from "./components/BentoCard";
import AIAssistant from "./components/AIAssistant";
import CheckInView from "./components/CheckInView";
import { JobLeadsFeed } from "@/components/JobLeadsFeed";
import {
  SchoolDonutChart,
  FitnessBarChart,
  ReadingDonutChart,
  ProjectsDonutChart,
  ContentDonutChart,
} from "./components/charts/CardCharts";

const WGU_DEFAULTS = { totalCU: 119, earnedCU: 43, activeCount: 13, termsCompleted: 5, termsTotal: 11 };

type TabKey = "finances" | "school" | "fitness" | "reading" | "projects" | "content" | "leads";

const CARD_CONFIG: { key: TabKey; title: string; subtitle: string; accent: string; icon: string }[] = [
  { key: "finances", title: "Finances",  subtitle: "Net worth & cash flow",  accent: "#c4912a", icon: "🌾" },
  { key: "school",   title: "School",    subtitle: "Degree progress",         accent: "#7ab05a", icon: "🌿" },
  { key: "fitness",  title: "Fitness",   subtitle: "Workouts & streak",       accent: "#e8734a", icon: "🌱" },
  { key: "reading",  title: "Reading",   subtitle: "Books & queue",           accent: "#a085c4", icon: "🍃" },
  { key: "projects", title: "Projects",  subtitle: "Active & shipped",        accent: "#d4a83a", icon: "🌻" },
  { key: "content",  title: "Content",   subtitle: "Ideas & published",       accent: "#5a9e8a", icon: "🌺" },
  { key: "leads",    title: "Job Leads", subtitle: "Applications & status",   accent: "#4a90c4", icon: "💼" },
];

// ── Botanical SVG illustrations ───────────────────────────────────────────────

function MonsteraLeaf({ suffix = "1" }: { suffix?: string }) {
  const gId = `mon-grad-${suffix}`;
  const lId = `mon-light-${suffix}`;
  const mId = `mon-mask-${suffix}`;
  return (
    <svg viewBox="0 0 260 380" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id={gId} x1="25%" y1="5%" x2="75%" y2="95%">
          <stop offset="0%"   stopColor="#5a9a6a"/>
          <stop offset="45%"  stopColor="#3a7a4e"/>
          <stop offset="100%" stopColor="#1a3a28"/>
        </linearGradient>
        <radialGradient id={lId} cx="35%" cy="28%" r="52%">
          <stop offset="0%"   stopColor="#8acea0" stopOpacity="0.22"/>
          <stop offset="100%" stopColor="#1a3a28" stopOpacity="0"/>
        </radialGradient>
        <mask id={mId}>
          <rect fill="white" width="260" height="380"/>
          {/* Left sinuses — cuts from edge toward center */}
          <ellipse cx="-5"  cy="275" rx="80" ry="42" fill="black" transform="rotate(-14 -5 275)"/>
          <ellipse cx="0"   cy="188" rx="75" ry="38" fill="black" transform="rotate(-8 0 188)"/>
          <ellipse cx="14"  cy="116" rx="64" ry="31" fill="black" transform="rotate(-4 14 116)"/>
          {/* Right sinuses */}
          <ellipse cx="265" cy="275" rx="80" ry="42" fill="black" transform="rotate(14 265 275)"/>
          <ellipse cx="260" cy="188" rx="75" ry="38" fill="black" transform="rotate(8 260 188)"/>
          <ellipse cx="246" cy="116" rx="64" ry="31" fill="black" transform="rotate(4 246 116)"/>
          {/* Fenestrations — internal holes */}
          <ellipse cx="98"  cy="175" rx="22" ry="30" fill="black" transform="rotate(-14 98 175)"/>
          <ellipse cx="162" cy="175" rx="22" ry="30" fill="black" transform="rotate(14 162 175)"/>
          <ellipse cx="106" cy="113" rx="16" ry="22" fill="black" transform="rotate(-9 106 113)"/>
          <ellipse cx="154" cy="113" rx="16" ry="22" fill="black" transform="rotate(9 154 113)"/>
        </mask>
      </defs>

      {/* Petiole */}
      <path d="M130 376 C129 354 127 325 123 294" stroke="#1e4530" strokeWidth="6" strokeLinecap="round"/>

      {/* Leaf body + veins masked together */}
      <g mask={`url(#${mId})`}>
        <ellipse cx="130" cy="175" rx="112" ry="162" fill={`url(#${gId})`}/>
        <ellipse cx="130" cy="175" rx="112" ry="162" fill={`url(#${lId})`}/>
        {/* Central vein */}
        <line x1="130" y1="294" x2="130" y2="18" stroke="#6ab87e" strokeWidth="1.6" opacity="0.32"/>
        {/* Left secondary veins */}
        <path d="M129 258 C114 244 90 230 62 216"  stroke="#6ab87e" strokeWidth="1.2" opacity="0.26"/>
        <path d="M129 222 C113 210 88 200 58 190"  stroke="#6ab87e" strokeWidth="1.1" opacity="0.23"/>
        <path d="M129 188 C113 176 88 166 56 156"  stroke="#6ab87e" strokeWidth="1"   opacity="0.2"/>
        <path d="M129 154 C114 142 92 134 65 126"  stroke="#6ab87e" strokeWidth="0.9" opacity="0.18"/>
        <path d="M129 122 C116 110 96 102 72 94"   stroke="#6ab87e" strokeWidth="0.8" opacity="0.16"/>
        <path d="M129 92  C118 80  102 72 82 64"   stroke="#6ab87e" strokeWidth="0.7" opacity="0.14"/>
        <path d="M130 64  C121 52  110 45 96 38"   stroke="#6ab87e" strokeWidth="0.6" opacity="0.12"/>
        {/* Right secondary veins */}
        <path d="M131 258 C146 244 170 230 198 216" stroke="#6ab87e" strokeWidth="1.2" opacity="0.26"/>
        <path d="M131 222 C147 210 172 200 202 190" stroke="#6ab87e" strokeWidth="1.1" opacity="0.23"/>
        <path d="M131 188 C147 176 172 166 204 156" stroke="#6ab87e" strokeWidth="1"   opacity="0.2"/>
        <path d="M131 154 C146 142 168 134 195 126" stroke="#6ab87e" strokeWidth="0.9" opacity="0.18"/>
        <path d="M131 122 C144 110 164 102 188 94"  stroke="#6ab87e" strokeWidth="0.8" opacity="0.16"/>
        <path d="M131 92  C142 80  158 72 178 64"   stroke="#6ab87e" strokeWidth="0.7" opacity="0.14"/>
        <path d="M130 64  C139 52  150 45 164 38"   stroke="#6ab87e" strokeWidth="0.6" opacity="0.12"/>
      </g>
    </svg>
  );
}

function FernFrond() {
  return (
    <svg viewBox="0 0 220 460" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      {/* Main rachis — arching curve */}
      <path d="M110 456 C108 420 100 380 88 338 C76 296 60 258 44 222 C32 194 22 168 16 142 C12 124 10 108 12 94"
            stroke="#2d6040" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
      {/* 14 pinna pairs — getting smaller toward apex */}
      <path d="M109 440 C126 430 148 414 162 396" stroke="#3a7a4a" strokeWidth="1.4"  strokeLinecap="round"/>
      <path d="M109 440 C92 430 70 414 56 396"    stroke="#3a7a4a" strokeWidth="1.4"  strokeLinecap="round"/>
      <path d="M106 416 C122 406 144 390 157 373" stroke="#3a7a4a" strokeWidth="1.3"  strokeLinecap="round"/>
      <path d="M106 416 C90 406 68 390 55 373"    stroke="#3a7a4a" strokeWidth="1.3"  strokeLinecap="round"/>
      <path d="M101 390 C116 380 137 365 149 348" stroke="#3a7a4a" strokeWidth="1.25" strokeLinecap="round"/>
      <path d="M101 390 C86 380 65 365 53 348"    stroke="#3a7a4a" strokeWidth="1.25" strokeLinecap="round"/>
      <path d="M95 364 C110 354 129 339 140 323"  stroke="#3a7a4a" strokeWidth="1.2"  strokeLinecap="round"/>
      <path d="M95 364 C80 354 61 339 50 323"     stroke="#3a7a4a" strokeWidth="1.2"  strokeLinecap="round"/>
      <path d="M88 338 C102 328 120 313 130 298"  stroke="#3a7a4a" strokeWidth="1.1"  strokeLinecap="round"/>
      <path d="M88 338 C74 328 56 313 46 298"     stroke="#3a7a4a" strokeWidth="1.1"  strokeLinecap="round"/>
      <path d="M80 312 C93 302 110 287 119 272"   stroke="#3a7a4a" strokeWidth="1"    strokeLinecap="round"/>
      <path d="M80 312 C67 302 50 287 41 272"     stroke="#3a7a4a" strokeWidth="1"    strokeLinecap="round"/>
      <path d="M72 286 C84 276 100 262 108 248"   stroke="#3a7a4a" strokeWidth="0.95" strokeLinecap="round"/>
      <path d="M72 286 C60 276 44 262 36 248"     stroke="#3a7a4a" strokeWidth="0.95" strokeLinecap="round"/>
      <path d="M64 260 C75 250 90 237 97 223"     stroke="#3a7a4a" strokeWidth="0.9"  strokeLinecap="round"/>
      <path d="M64 260 C53 250 38 237 31 223"     stroke="#3a7a4a" strokeWidth="0.9"  strokeLinecap="round"/>
      <path d="M56 236 C66 226 80 213 86 200"     stroke="#3a7a4a" strokeWidth="0.8"  strokeLinecap="round"/>
      <path d="M56 236 C46 226 32 213 26 200"     stroke="#3a7a4a" strokeWidth="0.8"  strokeLinecap="round"/>
      <path d="M48 213 C57 203 70 191 75 179"     stroke="#3a7a4a" strokeWidth="0.75" strokeLinecap="round"/>
      <path d="M48 213 C39 203 27 191 22 179"     stroke="#3a7a4a" strokeWidth="0.75" strokeLinecap="round"/>
      <path d="M41 192 C49 182 61 171 65 160"     stroke="#3a7a4a" strokeWidth="0.7"  strokeLinecap="round"/>
      <path d="M41 192 C33 182 22 171 18 160"     stroke="#3a7a4a" strokeWidth="0.7"  strokeLinecap="round"/>
      <path d="M34 172 C41 163 52 153 56 143"     stroke="#3a7a4a" strokeWidth="0.6"  strokeLinecap="round"/>
      <path d="M34 172 C27 163 17 153 14 143"     stroke="#3a7a4a" strokeWidth="0.6"  strokeLinecap="round"/>
      <path d="M28 154 C35 145 44 136 48 127"     stroke="#3a7a4a" strokeWidth="0.5"  strokeLinecap="round"/>
      <path d="M28 154 C21 145 13 136 10 127"     stroke="#3a7a4a" strokeWidth="0.5"  strokeLinecap="round"/>
      <path d="M22 138 C28 130 36 122 39 114"     stroke="#3a7a4a" strokeWidth="0.45" strokeLinecap="round"/>
      <path d="M22 138 C16 130 9 122 7 114"       stroke="#3a7a4a" strokeWidth="0.45" strokeLinecap="round"/>
    </svg>
  );
}

// ── Dashboard page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [fullViewSection, setFullViewSection] = useState<TabKey | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);

  const accounts          = useQuery(api.dashboard.getAccounts)          ?? [];
  const financeFiles      = useQuery(api.dashboard.getFinanceFiles)       ?? [];
  const courses           = useQuery(api.dashboard.getCourses)            ?? [];
  const schoolProgress    = useQuery(api.dashboard.getSchoolProgress);
  const books             = useQuery(api.dashboard.getBooks)              ?? [];
  const workouts          = useQuery(api.dashboard.getWorkouts)           ?? [];
  const workoutSchedule   = useQuery(api.dashboard.getWorkoutSchedule)    ?? [0, 2, 4, 5];
  const workoutMissedDays = useQuery(api.dashboard.getWorkoutMissedDays)  ?? [];
  const contentPosts      = useQuery(api.dashboard.getContentPosts)       ?? [];
  const projects          = useQuery(api.dashboard.getProjects)           ?? [];
  const jobLeads          = useQuery(api.jobLeads.list, {})               ?? [];

  const upsertAccount     = useMutation(api.dashboard.upsertAccount);
  const generateUploadUrl = useMutation(api.dashboard.generateUploadUrl);
  const saveFinanceFile   = useMutation(api.dashboard.saveFinanceFile);
  const deleteFinanceFile = useMutation(api.dashboard.deleteFinanceFile);
  const upsertCourse      = useMutation(api.dashboard.upsertCourse);
  const setSchoolProgress = useMutation(api.dashboard.setSchoolProgress);
  const seedSchoolData    = useMutation(api.dashboard.seedSchoolData);
  const upsertBook        = useMutation(api.dashboard.upsertBook);
  const logWorkout        = useMutation(api.dashboard.logWorkout);
  const addMissedDay      = useMutation(api.dashboard.addMissedDay);
  const removeMissedDay   = useMutation(api.dashboard.removeMissedDay);
  const addContentPost    = useMutation(api.dashboard.addContentPost);
  const updateContentPost = useMutation(api.dashboard.updateContentPost);
  const expandContentIdea = useAction(api.aiAssistant.expandContentIdea);
  const upsertProject     = useMutation(api.dashboard.upsertProject);

  const financesCash        = accounts.filter((a) => a.type === "checking" || a.type === "savings").reduce((s, a) => s + a.balance, 0);
  const financesInvestments = accounts.filter((a) => a.type === "investment").reduce((s, a) => s + a.balance, 0);
  const financesDebt        = accounts.filter((a) => a.type === "debt").reduce((s, a) => s + a.balance, 0);
  const netWorth            = financesCash + financesInvestments - financesDebt + accounts.filter((a) => a.type === "other").reduce((s, a) => s + a.balance, 0);
  const earnedCU            = courses.filter((c) => c.status === "completed").reduce((s, c) => s + c.creditUnits, 0);
  const activeCourseCount   = courses.filter((c) => c.status === "in_progress").length;
  const notStartedCourseCount = courses.filter((c) => c.status === "not_started").length;
  const completedCourseCount  = courses.filter((c) => c.status === "completed").length;
  const booksRead           = books.filter((b) => b.status === "completed").length;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const workedOutDays = new Set(
    workouts.map((w) => { const d = new Date(w.date); d.setHours(0,0,0,0); return d.getTime(); })
  );
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const check = new Date(todayStart);
    check.setDate(todayStart.getDate() - i);
    if (workedOutDays.has(check.getTime())) streak++;
    else break;
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 0 }).format(n);

  const ideas             = contentPosts.filter((p) => p.status === "idea").length;
  const inProgressContent = contentPosts.filter((p) => p.status === "in_progress").length;
  const published         = contentPosts.filter((p) => p.status === "published").length;
  const activeProjects    = projects.filter((p) => p.status === "active").length;
  const shippedProjects   = projects.filter((p) => p.status === "shipped").length;
  const sortedJobLeads    = [...jobLeads].sort((a, b) => b.updatedAt - a.updatedAt);
  const mostRecentLead    = sortedJobLeads[0];

  const wgu    = schoolProgress && "totalCU" in schoolProgress ? schoolProgress : WGU_DEFAULTS;
  const wguPct = wgu.totalCU > 0 ? Math.round((earnedCU / wgu.totalCU) * 100) : 0;
  const wguCuLeft = wgu.totalCU - earnedCU;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0,0,0,0); return d;
  });
  const workoutCountByDay = last7Days.map((d) => ({
    day: d.toLocaleDateString("en-US", { weekday: "short" }),
    count: workouts.filter((w) => { const wd = new Date(w.date); wd.setHours(0,0,0,0); return wd.getTime() === d.getTime(); }).length,
  }));

  const summary: Record<TabKey, { line1: string; line2?: string }> = {
    finances: { line1: fmt(netWorth),                  line2: `Cash ${fmt(financesCash)} · Inv ${fmt(financesInvestments)} · Debt -${fmt(financesDebt)}` },
    school:   { line1: `${wguPct}% · ${wguCuLeft} CU left`, line2: `${activeCourseCount} active · ${completedCourseCount} done · ${notStartedCourseCount} not started` },
    fitness:  { line1: `${streak} day streak`,         line2: `${workouts.length} workouts logged` },
    reading:  { line1: `${booksRead} read`,            line2: `${books.filter((b) => b.status === "reading").length} reading now` },
    projects: { line1: `${activeProjects} active`,     line2: `${shippedProjects} shipped` },
    content:  { line1: `${published} published`,       line2: `${inProgressContent} in progress · ${ideas} ideas` },
    leads:    { line1: `${jobLeads.length} leads`,      line2: mostRecentLead ? `${mostRecentLead.company} · ${mostRecentLead.status}` : "No leads yet" },
  };

  const today     = new Date();
  const dateNum   = today.getDate();
  const dateLabel = today.toLocaleDateString("en-US", { weekday: "long", month: "long", year: "numeric" });

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", background: "linear-gradient(160deg, #060c05 0%, #08110a 45%, #0c1a0a 75%, #060e06 100%)" }}
    >
      {/* Ambient light pools */}
      <div className="fixed pointer-events-none z-0" style={{ top: "-25vh", left: "-15vw", width: "75vw", height: "75vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(196,145,42,0.09) 0%, rgba(140,100,20,0.04) 40%, transparent 70%)", filter: "blur(80px)" }}/>
      <div className="fixed pointer-events-none z-0" style={{ bottom: "-20vh", right: "-15vw", width: "65vw", height: "65vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(60,100,40,0.14) 0%, rgba(40,70,25,0.07) 40%, transparent 70%)", filter: "blur(80px)" }}/>
      <div className="fixed pointer-events-none z-0" style={{ top: "40vh", left: "35vw", width: "40vw", height: "40vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(122,176,90,0.05) 0%, transparent 70%)", filter: "blur(60px)" }}/>

      {/* Header */}
      <header
        className="shrink-0 z-20 flex items-center px-6 py-3"
        style={{ background: "rgba(5,10,4,0.92)", borderBottom: "1px solid rgba(122,176,90,0.08)", backdropFilter: "blur(24px)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(145deg, rgba(196,145,42,0.3), rgba(122,176,90,0.18))", border: "1px solid rgba(196,145,42,0.28)", boxShadow: "0 0 14px rgba(196,145,42,0.18)", fontFamily: "var(--font-cormorant)", fontSize: "16px", fontStyle: "italic", color: "rgba(196,145,42,0.9)" }}
          >
            ❧
          </div>
          <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "20px", fontWeight: 600, fontStyle: "italic", letterSpacing: "0.01em", background: "linear-gradient(135deg, #e8e0cc 0%, #c4912a 60%, #a07820 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            The Process
          </span>
        </div>
      </header>

      {/* Body — two-panel split */}
      <div className="flex-1 min-h-0 flex overflow-hidden z-10">

        {/* ── LEFT: Botanical panel ── */}
        <div
          className="shrink-0 flex flex-col relative overflow-hidden"
          style={{ width: "288px", borderRight: "1px solid rgba(122,176,90,0.08)", background: "linear-gradient(180deg, #050c04 0%, #061008 55%, #081308 100%)" }}
        >
          {/* Soft green ambiance */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 55% 35%, rgba(74,122,90,0.07) 0%, transparent 62%)" }}/>

          {/* Monstera — takes up top portion */}
          <div className="flex-1 min-h-0 relative" style={{ padding: "18px 14px 4px" }}>
            <MonsteraLeaf suffix="main" />
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 62% 42%, rgba(196,145,42,0.055) 0%, transparent 52%)" }}/>
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: "rgba(122,176,90,0.06)", margin: "0 22px" }}/>

          {/* Date */}
          <div className="shrink-0 px-6 pt-5 pb-2">
            <p style={{ fontFamily: "var(--font-cormorant)", fontSize: "62px", lineHeight: 1, fontStyle: "italic", fontWeight: 400, color: "rgba(232,224,204,0.82)", letterSpacing: "-0.02em" }}>
              {dateNum}
            </p>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "9px", letterSpacing: "0.12em", color: "rgba(232,224,204,0.72)", textTransform: "uppercase", marginTop: "3px" }}>
              {dateLabel}
            </p>
          </div>

          {/* Quote */}
          <div className="shrink-0 px-6 pb-4">
            <p style={{ fontFamily: "var(--font-cormorant)", fontSize: "13px", fontStyle: "italic", color: "rgba(232,224,204,0.78)", lineHeight: 1.7, borderLeft: "2px solid rgba(196,145,42,0.25)", paddingLeft: "12px" }}>
              &ldquo;Put simply, training is training—it&apos;s what a proper swordsman must do. These things I do are what a proper wealthy person does.&rdquo;
            </p>
          </div>

          {/* Check-In */}
          <div className="shrink-0 px-6 pb-6">
            <button
              onClick={() => setShowCheckIn(true)}
              className="w-full py-2.5 rounded-xl transition-all"
              style={{ fontFamily: "var(--font-cormorant)", fontSize: "15px", fontStyle: "italic", fontWeight: 500, background: "linear-gradient(135deg, rgba(196,145,42,0.16), rgba(122,176,90,0.09))", border: "1px solid rgba(196,145,42,0.28)", color: "rgba(196,145,42,0.86)", letterSpacing: "0.02em" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(196,145,42,0.26), rgba(122,176,90,0.16))"; e.currentTarget.style.borderColor = "rgba(196,145,42,0.48)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(196,145,42,0.16), rgba(122,176,90,0.09))"; e.currentTarget.style.borderColor = "rgba(196,145,42,0.28)"; }}
            >
              ✦ Check-In
            </button>
          </div>

          {/* Fern decoration — absolute bottom-right corner */}
          <div className="absolute bottom-0 right-0 pointer-events-none" style={{ width: "132px", height: "232px", opacity: 0.13 }}>
            <FernFrond />
          </div>
        </div>

        {/* ── RIGHT: Bento grid ── */}
        <main className="flex-1 min-h-0 relative overflow-hidden">
          {/* Ghost monstera — atmospheric, behind the cards */}
          <div className="absolute pointer-events-none" style={{ right: "-6%", top: "3%", width: "50%", height: "94%", opacity: 0.038, zIndex: 0 }}>
            <MonsteraLeaf suffix="ghost" />
          </div>

          <div
            className="h-full w-full p-3 relative z-10"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "10px" }}
          >
            {CARD_CONFIG.map((card) => {
              const chart =
                card.key === "finances" ? null
                : card.key === "school"   ? <SchoolDonutChart percentComplete={wguPct} accent={card.accent} />
                : card.key === "fitness"  ? <FitnessBarChart data={workoutCountByDay} accent={card.accent} />
                : card.key === "reading"  ? <ReadingDonutChart completed={booksRead} reading={books.filter((b) => b.status === "reading").length} wantToRead={books.filter((b) => b.status === "want_to_read").length} accent={card.accent} />
                : card.key === "projects" ? <ProjectsDonutChart active={activeProjects} shipped={shippedProjects} accent={card.accent} />
                : card.key === "content"  ? <ContentDonutChart published={published} inProgress={inProgressContent} ideas={ideas} accent={card.accent} />
                : null;
              return (
                <BentoCard
                  key={card.key}
                  cardKey={card.key}
                  title={card.title}
                  subtitle={card.subtitle}
                  icon={card.icon}
                  line1={summary[card.key].line1}
                  line2={summary[card.key].line2}
                  accent={card.accent}
                  onClick={() => setFullViewSection(card.key)}
                  chart={chart}
                />
              );
            })}
          </div>
        </main>
      </div>

      {/* Full-view modal */}
      {fullViewSection && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "linear-gradient(160deg, #060d05 0%, #090f07 50%, #0c1509 100%)" }}>
          <div className="shrink-0 flex items-center justify-between px-5 h-14" style={{ borderBottom: "1px solid rgba(122,176,90,0.1)", background: "rgba(6,10,5,0.92)", backdropFilter: "blur(16px)" }}>
            <button onClick={() => setFullViewSection(null)} style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: "rgba(232,224,204,0.72)" }} className="hover:text-[#c4912a] transition-colors">
              ← Back
            </button>
            <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "18px", fontStyle: "italic", fontWeight: 500, color: "rgba(232,224,204,0.85)" }}>
              {CARD_CONFIG.find((c) => c.key === fullViewSection)?.title}
            </span>
            <div className="w-20" />
          </div>
          <div className="flex-1 min-h-0 flex flex-col p-4">
            <div className="flex-1 min-h-0 flex flex-col max-w-5xl w-full mx-auto">
              {fullViewSection === "finances" && <FinancesSection accounts={accounts} financeFiles={financeFiles} upsertAccount={upsertAccount} generateUploadUrl={generateUploadUrl} saveFinanceFile={saveFinanceFile} deleteFinanceFile={deleteFinanceFile} />}
              {fullViewSection === "school"   && <SchoolSection courses={courses} upsertCourse={upsertCourse} schoolProgress={schoolProgress && "totalCU" in schoolProgress ? schoolProgress : WGU_DEFAULTS} setSchoolProgress={setSchoolProgress} seedSchoolData={seedSchoolData} />}
              {fullViewSection === "fitness"  && <WorkoutsSection workouts={workouts} logWorkout={logWorkout} workoutSchedule={workoutSchedule} workoutMissedDays={workoutMissedDays} addMissedDay={addMissedDay} removeMissedDay={removeMissedDay} />}
              {fullViewSection === "reading"  && <ReadingSection books={books} upsertBook={upsertBook} />}
              {fullViewSection === "projects" && <ProjectsSection projects={projects} upsertProject={upsertProject} />}
              {fullViewSection === "content"  && <ContentSection posts={contentPosts} addContentPost={addContentPost} updateContentPost={updateContentPost} expandContentIdea={expandContentIdea} />}
              {fullViewSection === "leads"    && <JobLeadsFeed />}
            </div>
          </div>
        </div>
      )}

      {showCheckIn && <CheckInView onClose={() => setShowCheckIn(false)} />}

      <AIAssistant />
    </div>
  );
}
