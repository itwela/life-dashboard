"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Plus, Zap, BarChart2, MoreHorizontal, Wallet, X, Eye, EyeOff, ListChecks, Briefcase, CalendarDays, Award,
} from "lucide-react";
import SchoolSection from "./components/SchoolSection";
import FinancesSection from "./components/FinancesSection";
import ReadingSection from "./components/ReadingSection";
import WorkoutsSection from "./components/WorkoutsSection";
import ContentSection from "./components/ContentSection";
import ProjectsSection from "./components/ProjectsSection";
import TodosSection from "./components/TodosSection";
import RecordsSection from "./components/RecordsSection";
import AIAssistant from "./components/AIAssistant";
import CheckInView from "./components/CheckInView";
import CalendarView from "@/components/CalendarView";
import { JobLeadsFeed } from "@/components/JobLeadsFeed";

// ── Constants ─────────────────────────────────────────────────────────────────

const WGU_DEFAULTS = { totalCU: 119, earnedCU: 43, activeCount: 13, termsCompleted: 5, termsTotal: 11 };
type TabKey = "finances" | "school" | "fitness" | "reading" | "projects" | "content" | "todos" | "leads" | "records";

const LIGHT_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260514_103318_2aa26b55-df1a-43a6-903d-941e718c9366.mp4";
const DARK_VIDEO  = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260514_102933_4e8f73b5-775a-4179-b2fb-472f59063dcd.mp4";

// Deterministic placeholder color from seed string
const PLACEHOLDER_COLORS = ["#3b82f6","#e8734a","#a085c4","#5a9e8a","#e05e36","#c4912a","#34d399","#f87171","#60a5fa","#fbbf24"];
function placeholderColor(seed: string) {
  const idx = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % PLACEHOLDER_COLORS.length;
  return PLACEHOLDER_COLORS[idx];
}

function Placeholder({ seed, size = 40, border, letter: letterOverride, textColor }: { seed: string; size?: number; border?: string; letter?: string; textColor?: string }) {
  const color = placeholderColor(seed);
  const letter = letterOverride ?? (seed.replace(/[^a-zA-Z]/g, "").charAt(0).toUpperCase() || "·");
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${color}22, ${color}10)`,
      border: border ?? `1.5px solid ${color}35`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: textColor ?? color,
      letterSpacing: "-0.01em",
    }}>
      {letter}
    </div>
  );
}

// deterministic bar heights based on index
function barH(i: number, active: boolean) {
  const activePat = [35,45,30,55,40,65,50,75,60,85,70,80,65,55,45,70,60,75,55,65,50,75,60,55];
  const greyPat   = [45,70,60,75,55,65,50,75,60,85,70,55,45,70,60,75,55,65,50,75,60,55,45,70,60,75,55,65,50,75,60,55,45,70,60,75];
  if (active) return activePat[i % activePat.length];
  return greyPat[i % greyPat.length];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CountBadge({ count, size = 38, isDark }: { count: string | number; size?: number; isDark: boolean }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)", display: "flex",
      alignItems: "center", justifyContent: "center",
      fontSize: "0.75rem", fontWeight: 600, color: isDark ? "#fff" : "#1a1a1a",
    }}>
      {count}
    </div>
  );
}

function CardHeader({
  title, subtitle, icon, isDark,
}: {
  title: string; subtitle: string;
  icon: React.ReactNode; isDark: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h3 style={{
          margin: 0, fontSize: "1.2rem", fontWeight: 600,
          letterSpacing: "-0.03em", color: isDark ? "#fff" : "#1a1a1a", lineHeight: 1.2,
        }}>{title}</h3>
        <p style={{ margin: "5px 0 0", fontSize: "0.8rem", color: isDark ? "#b0b0b0" : "#6b7280", fontWeight: 400 }}>{subtitle}</p>
      </div>
      <div style={{
        width: 36, height: 36, borderRadius: 12, flexShrink: 0,
        background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: isDark ? "#b0b0b0" : "#6b7280",
      }}>{icon}</div>
    </div>
  );
}

function CardFooter({ count, label, isDark }: { count: string | number; label?: string; isDark: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: "auto", paddingTop: 12 }}>
      <CountBadge count={count} isDark={isDark} />
      {label && <span style={{ fontSize: "0.75rem", color: isDark ? "#b0b0b0" : "#6b7280" }}>{label}</span>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [isDark, setIsDark] = useState(true);
  const [fullViewSection, setFullViewSection] = useState<TabKey | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  // The full-view panels zoom 1.25x on desktop for readability, but that overflows a
  // phone screen — disable it on narrow viewports.
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const [closeTimer, setCloseTimer] = useState(true);
  const [netWorthHidden, setNetWorthHidden] = useState(true);

  // ── Convex data ──
  const accounts          = useQuery(api.dashboard.getAccounts)          ?? [];
  const financeFiles      = useQuery(api.dashboard.getFinanceFiles)       ?? [];
  const courses           = useQuery(api.dashboard.getCourses)            ?? [];
  const schoolProgress    = useQuery(api.dashboard.getSchoolProgress);
  const books             = useQuery(api.dashboard.getBooks)              ?? [];
  const workouts          = useQuery(api.dashboard.getWorkouts)           ?? [];
  const workoutSchedule   = useQuery(api.dashboard.getWorkoutSchedule)    ?? [1, 3, 5];
  const workoutMissedDays = useQuery(api.dashboard.getWorkoutMissedDays)  ?? [];
  const contentPosts      = useQuery(api.dashboard.getContentPosts)       ?? [];
  const projects          = useQuery(api.dashboard.getProjects)           ?? [];
  const todos             = useQuery(api.dashboard.getTodos)              ?? [];
  const jobLeads          = useQuery(api.jobLeads.list, {})               ?? [];
  const documents         = useQuery(api.dashboard.getDocuments)          ?? [];

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
  const toggleTodo        = useMutation(api.dashboard.toggleTodo);
  const reorderTodos      = useMutation(api.dashboard.reorderTodos);
  const saveDocument      = useMutation(api.dashboard.saveDocument);
  const deleteDocument    = useMutation(api.dashboard.deleteDocument);

  // ── Derived data ──
  const financesCash        = accounts.filter(a => a.type==="checking"||a.type==="savings").reduce((s,a)=>s+a.balance,0);
  const financesInvestments = accounts.filter(a=>a.type==="investment").reduce((s,a)=>s+a.balance,0);
  const financesDebt        = accounts.filter(a=>a.type==="debt").reduce((s,a)=>s+a.balance,0);
  const netWorth            = financesCash + financesInvestments - financesDebt + accounts.filter(a=>a.type==="other").reduce((s,a)=>s+a.balance,0);
  const earnedCU            = courses.filter(c=>c.status==="completed").reduce((s,c)=>s+c.creditUnits,0);
  const activeCourseCount   = courses.filter(c=>c.status==="in_progress").length;
  const completedCourseCount = courses.filter(c=>c.status==="completed").length;
  const booksRead           = books.filter(b=>b.status==="completed").length;
  const booksReading        = books.filter(b=>b.status==="reading").length;
  const booksQueued         = books.filter(b=>b.status==="want_to_read").length;
  const ideas               = contentPosts.filter(p=>p.status==="idea").length;
  const inProgressContent   = contentPosts.filter(p=>p.status==="in_progress").length;
  const published           = contentPosts.filter(p=>p.status==="published").length;
  const activeProjects      = projects.filter(p=>p.status==="active").length;
  const shippedProjects     = projects.filter(p=>p.status==="shipped").length;
  const todosOpen           = todos.filter(t=>!t.done);
  const todosDone           = todos.length - todosOpen.length;
  const TODO_CAT_PRIORITY   = ["Today","Work","Creative","Care","Morning","Mechanics","Content"];
  const todosSorted         = [...todosOpen].sort((a,b)=>{
    const pa = TODO_CAT_PRIORITY.indexOf(a.category); const pb = TODO_CAT_PRIORITY.indexOf(b.category);
    return (pa<0?99:pa)-(pb<0?99:pb) || a.order-b.order;
  });
  const wgu                 = schoolProgress && "totalCU" in schoolProgress ? schoolProgress : WGU_DEFAULTS;
  const wguPct              = wgu.totalCU > 0 ? Math.round((earnedCU/wgu.totalCU)*100) : 0;
  const wguCuLeft           = wgu.totalCU - earnedCU;

  const todayStart = useMemo(() => { const d=new Date(); d.setHours(0,0,0,0); return d; }, []);

  // Workout days come from FuelLog (where Itwela actually logs sessions) merged with any
  // locally-logged dashboard workouts. FuelLog is fetched once on mount via a server-side
  // action so the API key stays off the client.
  const getFuelWorkoutDays = useAction(api.fuel.getWorkoutDays);
  const [fuelWorkoutDays, setFuelWorkoutDays] = useState<string[]>([]);
  useEffect(() => {
    getFuelWorkoutDays({})
      .then((r) => setFuelWorkoutDays(r.days))
      .catch(() => setFuelWorkoutDays([]));
  }, [getFuelWorkoutDays]);

  const workedOutDays = useMemo(() => {
    const set = new Set<number>();
    for (const w of workouts) { const d=new Date(w.date); d.setHours(0,0,0,0); set.add(d.getTime()); }
    for (const iso of fuelWorkoutDays) { const d=new Date(iso+"T12:00:00"); d.setHours(0,0,0,0); set.add(d.getTime()); }
    return set;
  }, [workouts, fuelWorkoutDays]);

  let streak = 0;
  for (let i=0; i<365; i++) {
    const check = new Date(todayStart); check.setDate(todayStart.getDate()-i);
    if (workedOutDays.has(check.getTime())) streak++;
    else break;
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",notation:"compact",maximumFractionDigits:0}).format(n);

  // 60-day bar data for fitness card
  const bars60 = useMemo(() => Array.from({length:60},(_,i)=>{
    const d = new Date(); d.setDate(d.getDate()-(59-i)); d.setHours(0,0,0,0);
    const active = workedOutDays.has(d.getTime());
    return { active, height: barH(i, active) };
  }), [workedOutDays]);

  const sortedJobLeads    = [...jobLeads].sort((a, b) => b.updatedAt - a.updatedAt);
  const mostRecentLead    = sortedJobLeads[0];
  const RECENT_MS         = 14 * 24 * 60 * 60 * 1000;
  const recentSentLeads   = jobLeads.filter(
    (l) => (l.status === "sent" || l.status === "followed_up") && Date.now() - l.updatedAt < RECENT_MS
  ).length;
  const recentRepliedLeads = jobLeads.filter(
    (l) => l.status === "replied" && Date.now() - l.updatedAt < RECENT_MS
  ).length;

  const activeBarCount = bars60.filter(b=>b.active).length;

  // Dark mode body class
  useEffect(() => {
    document.body.classList.toggle("dark-mode", isDark);
  }, [isDark]);

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  // Card accent colors for dark text contrast
  const sectionColors: Record<TabKey, string> = {
    finances: "#c4912a",
    school:   "#3b82f6",
    fitness:  "#e8734a",
    reading:  "#a085c4",
    projects: "#3b82f6",
    content:  "#5a9e8a",
    todos:    "#818cf8",
    leads:    "#4a90c4",
    records:  "#a085c4",
  };

  // ── Card styles ──
  const solidStyle: React.CSSProperties = {
    background: isDark ? "rgba(26,26,26,0.98)" : "#fff",
    borderRadius: 40,
    boxShadow: "0 4px 20px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.01)",
    padding: "28px 28px",
    display: "flex", flexDirection: "column",
    overflow: "hidden", position: "relative",
    cursor: "pointer",
    transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
  };

  const glassDarkStyle: React.CSSProperties = {
    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.18)",
    backdropFilter: "blur(8px) saturate(1.8)",
    WebkitBackdropFilter: "blur(8px) saturate(1.8)",
    borderRadius: 40,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.3)"}`,
    boxShadow: "0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.2)",
    padding: "28px 28px",
    display: "flex", flexDirection: "column",
    overflow: "hidden", position: "relative",
    cursor: "pointer",
    transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
  };

  const glassMidStyle: React.CSSProperties = {
    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.6)",
    backdropFilter: "blur(8px) saturate(1.8)",
    WebkitBackdropFilter: "blur(8px) saturate(1.8)",
    borderRadius: 40,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.7)"}`,
    boxShadow: "0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)",
    padding: "28px 28px",
    display: "flex", flexDirection: "column",
    overflow: "hidden", position: "relative",
    cursor: "pointer",
    transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
  };

  const hoverProps = {
    onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px) scale(1.01)";
      (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 40px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06)";
    },
    onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
      (e.currentTarget as HTMLDivElement).style.transform = "";
      (e.currentTarget as HTMLDivElement).style.boxShadow = "";
    },
  };

  const textMain = isDark ? "#fff" : "#1a1a1a";
  const textMuted = isDark ? "#b0b0b0" : "#6b7280";

  return (
    <div style={{ zoom: 0.75, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* ── Noise SVG filter ── */}
      <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden>
        <defs>
          <filter id="noise-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise" />
            <feComposite operator="in" in="noise" in2="SourceGraphic" result="masked" />
          </filter>
        </defs>
      </svg>

      {/* ── Background video ── */}
      <video
        key={isDark ? "dark" : "light"}
        autoPlay muted loop playsInline
        style={{
          position: "fixed", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", zIndex: -1,
        }}
        src={isDark ? DARK_VIDEO : LIGHT_VIDEO}
      />

      {/* ── Top Navigation ── */}
      <nav style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        gap: 16,
        alignItems: "center",
        marginBottom: 40,
        flexShrink: 0,
      }}>
        {/* 1. Profile + Toggle (left group) */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, justifySelf: "start" }}>
          <div style={{ flexShrink: 0 }}>
            <Placeholder seed="you" size={48} border="2px solid rgba(255,255,255,0.6)" letter="I" textColor="#fff" />
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.55)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.7)"}`,
            borderRadius: 100, padding: "6px 6px 6px 6px",
          }}>
            {/* Mode switch */}
            <button
              onClick={() => setIsDark(d => !d)}
              style={{
                width: 88, height: 48, borderRadius: 100, border: "none",
                background: "#fff", cursor: "pointer", position: "relative",
                flexShrink: 0, padding: 4,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
              aria-label="Toggle dark mode"
            >
              {/* Track */}
              <div style={{
                position: "absolute", inset: 4,
                background: "#3b82f6", borderRadius: 100,
                transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
              }} />
              {/* Handle */}
              <div style={{
                position: "absolute", top: "50%", left: 4,
                width: 32, height: 32, borderRadius: "50%", background: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                transform: `translate(${isDark ? "0px" : "48px"}, -50%)`,
                transition: "transform 0.4s cubic-bezier(0.4,0,0.2,1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, zIndex: 1,
              }}>
                {isDark ? "☾" : "☀"}
              </div>
            </button>
          </div>
        </div>

        {/* 2. Meeting alert / date pill (true-centered against the whole nav) */}
        <div className="meeting-alert" style={{
          display: "flex", alignItems: "center", gap: 12,
          background: isDark ? "rgba(30,30,30,0.9)" : "#fff",
          borderRadius: 100, padding: "6px 6px 6px 16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          backdropFilter: "blur(8px)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)"}`,
        }}>
          <span style={{ fontSize: "0.875rem", fontWeight: 500, color: textMain, whiteSpace: "nowrap" }}>
            {dateLabel} · The Process
          </span>
          <div style={{
            background: isDark ? "rgba(255,255,255,0.08)" : "#f0f0f0",
            borderRadius: 100, padding: "4px 10px",
            fontSize: "0.75rem", color: textMuted, fontWeight: 500,
          }}>
            {streak}d streak
          </div>
          {closeTimer && (
            <button
              onClick={() => setCloseTimer(false)}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.3s ease",
              }}
            >
              {/* Progress ring */}
              <svg width="32" height="32" style={{ position: "absolute" }}>
                <circle cx="16" cy="16" r="14" fill="none" stroke={isDark?"rgba(255,255,255,0.1)":"#e0e0e0"} strokeWidth="2"/>
                <circle cx="16" cy="16" r="14" fill="none" stroke={textMain} strokeWidth="2"
                  strokeDasharray="88" strokeDashoffset="25"
                  style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}/>
              </svg>
              <X size={12} color={textMain} style={{ position: "relative", zIndex: 1 }} />
            </button>
          )}
        </div>

      </nav>

      {/* ── Dashboard Grid ── */}
      <div
        className="dash-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gridAutoRows: "minmax(240px, 1fr)",
          alignContent: "start",
          gap: 24,
          maxWidth: 1400,
          width: "100%",
          margin: "0 auto",
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          // Breathing room so the hover lift/scale isn't clipped by the scroll edge.
          padding: "8px 8px 20px",
        }}
      >

        {/* ─── Card 1: Check-In / New Entry (glass dark) ─── */}
        <div
          style={glassDarkStyle}
          {...hoverProps}
          onClick={() => setShowCheckIn(true)}
        >
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid rgba(255,255,255,0.3)",
            }}>
              <Plus size={32} color="#fff" />
            </div>
            <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "#fff", letterSpacing: "-0.01em" }}>
              Check-In
            </span>
          </div>
        </div>

        {/* ─── Card 2: Projects (solid white) ─── */}
        <div style={solidStyle} {...hoverProps} onClick={() => setFullViewSection("projects")}>
          <CardHeader
            title="Active Projects"
            subtitle="Sprint Planning"
            icon={<Zap size={20} />}
            isDark={isDark}
          />
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: "2.8rem", fontWeight: 700, color: textMain, letterSpacing: "-0.05em", lineHeight: 1 }}>
              {activeProjects}
            </span>
            <div>
              <div style={{ fontSize: "0.8rem", color: textMuted, fontWeight: 500 }}>active</div>
              <div style={{ fontSize: "0.8rem", color: textMuted }}>{shippedProjects} shipped</div>
            </div>
          </div>
          <CardFooter count={projects.length || "—"} label="total projects" isDark={isDark} />
        </div>

        {/* ─── Card 3: Fitness / Weekly Insights (solid white + bar chart) ─── */}
        <div style={solidStyle} {...hoverProps} onClick={() => setFullViewSection("fitness")}>
          <CardHeader
            title="Weekly Insights"
            subtitle="Workout Activity"
            icon={<BarChart2 size={20} />}
            isDark={isDark}
          />
          {/* Bar chart */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 60, marginBottom: 8, flex: "0 0 60px" }}>
            {bars60.map((b, i) => (
              <div key={i} style={{
                flex: 1, minWidth: 2, borderRadius: 2,
                background: b.active ? "#3b82f6" : (isDark ? "rgba(255,255,255,0.12)" : "#e5e7eb"),
                height: `${b.height}%`,
                transition: "height 0.3s ease",
              }} />
            ))}
          </div>
          {/* Footer */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", marginTop: "auto" }}>
            <div style={{ fontSize: "0.75rem", color: textMuted, justifySelf: "start", lineHeight: 1.35 }}>
              <div>{activeBarCount} act. days</div>
              <div>last 60</div>
            </div>
            {(() => {
              const todayDone = workedOutDays.has(todayStart.getTime());
              const todayScheduled = workoutSchedule.includes(new Date().getDay());
              const label = todayDone ? "Done today" : todayScheduled ? "Workout day" : "Rest day";
              const color = todayDone ? "#16a34a" : todayScheduled ? "#d97706" : (isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)");
              return (
                <div style={{
                  justifySelf: "center",
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 100,
                  background: todayDone ? "rgba(22,163,74,0.12)" : todayScheduled ? "rgba(217,119,6,0.12)" : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
                  border: `1px solid ${color}33`,
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color }}>{label}</span>
                </div>
              );
            })()}
            <div style={{ textAlign: "right", justifySelf: "end" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 600, color: textMain }}>{streak}d</div>
              <div style={{ fontSize: "0.7rem", color: textMuted }}>streak</div>
            </div>
          </div>
        </div>

        {/* ─── Card 4: School (glass dark) ─── */}
        <div style={glassDarkStyle} {...hoverProps} onClick={() => setFullViewSection("school")}>
          <CardHeader
            title="Degree Progress"
            subtitle="WGU · CS Program"
            icon={<MoreHorizontal size={20} color="#fff" />}
            isDark={isDark}
          />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
            {/* Progress bar */}
            <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 100, height: 6, overflow: "hidden" }}>
              <div style={{
                width: `${wguPct}%`, height: "100%",
                background: "#3b82f6", borderRadius: 100,
                transition: "width 0.6s ease",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "2.8rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.05em", lineHeight: 1 }}>
                {wguPct}%
              </span>
              <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
                {wguCuLeft} CU left
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.55)" }}>
              {activeCourseCount} active · {completedCourseCount} done
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.8)",
            }}>
              {earnedCU}
            </div>
            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.55)" }}>CU earned</span>
          </div>
        </div>

        {/* ─── Card 5: Reading (solid white) ─── */}
        <div style={solidStyle} {...hoverProps} onClick={() => setFullViewSection("reading")}>
          <CardHeader
            title="Reading List"
            subtitle="Books & Queue"
            icon={<BarChart2 size={20} />}
            isDark={isDark}
          />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 28 }}>
              <div>
                <div style={{ fontSize: "2.8rem", fontWeight: 700, color: sectionColors.reading, letterSpacing: "-0.04em", lineHeight: 1 }}>
                  {booksReading}
                </div>
                <div style={{ fontSize: "0.75rem", color: textMuted, marginTop: 4 }}>reading now</div>
              </div>
              <div>
                <div style={{ fontSize: "2.8rem", fontWeight: 700, color: "#4ade80", letterSpacing: "-0.04em", lineHeight: 1 }}>
                  {booksRead}
                </div>
                <div style={{ fontSize: "0.75rem", color: textMuted, marginTop: 4 }}>completed</div>
              </div>
            </div>
            <div style={{ fontSize: "0.75rem", color: textMuted }}>
              {booksQueued} in queue
            </div>
          </div>
          <CardFooter count={books.length || "—"} label="total books" isDark={isDark} />
        </div>

        {/* ─── Card 6: Content (glass mid) ─── */}
        <div style={glassMidStyle} {...hoverProps} onClick={() => setFullViewSection("content")}>
          <CardHeader
            title="Content Pipeline"
            subtitle="Ideas & Published"
            icon={<MoreHorizontal size={20} color={isDark?"#fff":"#1a1a1a"} />}
            isDark={isDark}
          />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
            {[
              { label: "Published", count: published, color: "#3b82f6" },
              { label: "In Progress", count: inProgressContent, color: "#e8734a" },
              { label: "Ideas", count: ideas, color: "#a085c4" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                  <span style={{ fontSize: "0.8rem", color: textMain }}>{item.label}</span>
                </div>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: textMain }}>{item.count}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 12 }}>
            <CountBadge count={contentPosts.length || "—"} isDark={isDark} />
            <span style={{ fontSize: "0.75rem", color: textMuted }}>total posts</span>
          </div>
        </div>

        {/* ─── Card 7: Finances (solid white) ─── */}
        <div style={solidStyle} {...hoverProps} onClick={() => setFullViewSection("finances")}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <CardHeader
                title="Net Worth"
                subtitle="Cash · Investments · Debt"
                icon={<Wallet size={20} />}
                isDark={isDark}
              />
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setNetWorthHidden(h => !h); }}
              style={{
                width: 36, height: 36, borderRadius: 12, flexShrink: 0, marginLeft: 8,
                background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: isDark ? "#b0b0b0" : "#6b7280",
              }}
              title={netWorthHidden ? "Show net worth" : "Hide net worth"}
            >
              {netWorthHidden ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
            <div style={{ fontSize: "2.4rem", fontWeight: 700, color: textMain, letterSpacing: "-0.05em", lineHeight: 1 }}>
              {netWorthHidden ? "••••••" : fmt(netWorth)}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { label: netWorthHidden ? "Cash ••••" : `Cash ${fmt(financesCash)}`, c: "#3b82f6" },
                { label: netWorthHidden ? "Inv ••••" : `Inv ${fmt(financesInvestments)}`, c: "#5a9e8a" },
                { label: netWorthHidden ? "-••••" : `-${fmt(financesDebt)}`, c: "#e05e36" },
              ].map(item => (
                <span key={item.label} style={{
                  fontSize: "0.7rem", padding: "2px 8px", borderRadius: 100,
                  background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                  color: item.c, fontWeight: 500,
                }}>
                  {item.label}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 12 }}>
            <CountBadge count={accounts.length || "—"} isDark={isDark} />
            <span style={{ fontSize: "0.75rem", color: textMuted }}>accounts tracked</span>
          </div>
        </div>

        {/* ─── Card 8: To-Do (synced from vault Hub) ─── */}
        <div style={solidStyle} {...hoverProps} onClick={() => setFullViewSection("todos")}>
          <CardHeader
            title="To-Do"
            subtitle="From your vault"
            icon={<ListChecks size={20} />}
            isDark={isDark}
          />
          <div
            className="hide-scrollbar"
            onWheel={(e) => e.stopPropagation()}
            style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 9, overflowY: "auto", paddingRight: 4 }}
          >
            {todosSorted.length === 0 ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: textMuted }}>
                All clear — nothing open.
              </div>
            ) : todosSorted.map((t) => (
              <div
                key={t._id}
                onClick={(e) => { e.stopPropagation(); toggleTodo({ id: t._id, done: !t.done }); }}
                style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", flexShrink: 0 }}
                title="Click to complete"
              >
                <span style={{
                  marginTop: 1, width: 16, height: 16, borderRadius: 6, flexShrink: 0,
                  border: `1.5px solid ${sectionColors.todos}`,
                  transition: "all 0.2s ease",
                }} />
                <span style={{
                  fontSize: "0.8rem", color: textMain, lineHeight: 1.35,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {t.text}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 12 }}>
            <CountBadge count={todosOpen.length} isDark={isDark} />
            <span style={{ fontSize: "0.75rem", color: textMuted }}>{todosOpen.length} open · {todosDone} done</span>
          </div>
        </div>

        {/* ─── Card 9: Job Leads (glass mid, read-only) ─── */}
        <div style={glassMidStyle} {...hoverProps} onClick={() => setFullViewSection("leads")}>
          <CardHeader
            title="Job Leads"
            subtitle="Applications & status"
            icon={<Briefcase size={20} color={isDark ? "#fff" : "#1a1a1a"} />}
            isDark={isDark}
          />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
            <div style={{ fontSize: "2.4rem", fontWeight: 700, color: textMain, letterSpacing: "-0.05em", lineHeight: 1 }}>
              {jobLeads.length}
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <div>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#34d399", lineHeight: 1 }}>{recentSentLeads}</div>
                <div style={{ fontSize: "0.68rem", color: textMuted }}>sent · 14d</div>
              </div>
              <div>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#a78bfa", lineHeight: 1 }}>{recentRepliedLeads}</div>
                <div style={{ fontSize: "0.68rem", color: textMuted }}>replied · 14d</div>
              </div>
            </div>
            <div style={{ fontSize: "0.75rem", color: textMuted }}>
              {mostRecentLead ? `Latest: ${mostRecentLead.company}` : "No leads yet"}
            </div>
          </div>
          <CardFooter count={jobLeads.length || "—"} label="total leads" isDark={isDark} />
        </div>

        {/* ─── Card 10: Records (glass dark) ─── */}
        <div style={glassDarkStyle} {...hoverProps} onClick={() => setFullViewSection("records")}>
          <CardHeader
            title="Records"
            subtitle="Diploma · Certs · IDs"
            icon={<Award size={20} color="#fff" />}
            isDark={isDark}
          />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
            <span style={{ fontSize: "2.8rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.05em", lineHeight: 1 }}>
              {documents.length}
            </span>
            <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
              {documents.length === 1 ? "document on file" : "documents on file"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
              {documents.length || "—"}
            </div>
            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.55)" }}>tap to view & upload</span>
          </div>
        </div>
      </div>

      {/* ── Indicators ── */}
      <div style={{
        display: "flex", gap: 16, justifyContent: "center",
        margin: "24px 0 0", flexShrink: 0,
      }}>
        {[1,0.3,0.3].map((opacity, i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: "50%",
            background: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.5)",
            opacity,
            transition: "opacity 0.3s ease",
          }} />
        ))}
      </div>

      {/* ── Calendar button (fixed top-right) — single entry point; mood Check-In
             lives inside the calendar's day panel now ── */}
      <button
        onClick={() => setShowCalendar(true)}
        style={{
          position: "fixed", top: 32, right: 32,
          width: 44, height: 44, borderRadius: 14,
          border: `1px solid ${isDark?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.6)"}`,
          background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.7)",
          backdropFilter: "blur(8px)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          zIndex: 40,
          transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
          color: isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.7)",
        }}
        title="Calendar & check-in"
      >
        <CalendarDays size={19} />
      </button>

      {/* ── Full-view modal ── */}
      {fullViewSection && (
        <div
          className="fullview-backdrop"
          onClick={() => setFullViewSection(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", flexDirection: "column",
          }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 28px", height: 76, flexShrink: 0,
          }}>
            <button
              onClick={() => setFullViewSection(null)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                fontSize: "0.85rem", fontWeight: 500, cursor: "pointer",
                color: textMain,
                padding: "9px 16px 9px 13px", borderRadius: 100,
                background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.7)",
                backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.8)"}`,
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                transition: "transform 0.3s ease, background 0.3s ease",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateX(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}
            >
              ← Back
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: sectionColors[fullViewSection], boxShadow: `0 0 12px ${sectionColors[fullViewSection]}` }} />
              <span style={{ fontSize: "1.25rem", fontWeight: 600, color: textMain, letterSpacing: "-0.03em" }}>
                {{
                  finances: "Finances",
                  school: "School",
                  fitness: "Fitness",
                  reading: "Reading",
                  projects: "Projects",
                  content: "Content",
                  todos: "To-Do",
                  leads: "Job Leads",
                  records: "Records",
                }[fullViewSection]}
              </span>
            </div>
            <div style={{ width: 92 }} />
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: isNarrow ? "4px 12px 20px" : "4px 28px 28px", overflowY: "auto", overflowX: "hidden" }}>
            {/* zoom scales the whole panel (rem-based text included) 25% up per Itwela's request.
                stopPropagation so clicks on the panel don't hit the backdrop's close handler;
                the blank margins around it (and the header space) still dismiss. */}
            <div className="modal-panel-in" onClick={e => e.stopPropagation()} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", maxWidth: 1040, width: "100%", margin: "0 auto", zoom: isNarrow ? 1 : 1.25 }}>
              {fullViewSection==="finances" && <FinancesSection isDark={isDark} accounts={accounts} financeFiles={financeFiles} upsertAccount={upsertAccount} generateUploadUrl={generateUploadUrl} saveFinanceFile={saveFinanceFile} deleteFinanceFile={deleteFinanceFile} />}
              {fullViewSection==="school"   && <SchoolSection isDark={isDark} courses={courses} upsertCourse={upsertCourse} schoolProgress={wgu} setSchoolProgress={setSchoolProgress} seedSchoolData={seedSchoolData} />}
              {fullViewSection==="fitness"  && <WorkoutsSection isDark={isDark} workouts={workouts} logWorkout={logWorkout} workoutSchedule={workoutSchedule} workoutMissedDays={workoutMissedDays} addMissedDay={addMissedDay} removeMissedDay={removeMissedDay} />}
              {fullViewSection==="reading"  && <ReadingSection isDark={isDark} books={books} upsertBook={upsertBook} />}
              {fullViewSection==="projects" && <ProjectsSection isDark={isDark} projects={projects} upsertProject={upsertProject} />}
              {fullViewSection==="content"  && <ContentSection isDark={isDark} posts={contentPosts} addContentPost={addContentPost} updateContentPost={updateContentPost} expandContentIdea={expandContentIdea} />}
              {fullViewSection==="todos"    && <TodosSection isDark={isDark} todos={todos} toggleTodo={toggleTodo} reorderTodos={reorderTodos} />}
              {fullViewSection==="leads"    && <JobLeadsFeed isDark={isDark} />}
              {fullViewSection==="records"  && <RecordsSection isDark={isDark} documents={documents} generateUploadUrl={generateUploadUrl} saveDocument={saveDocument} deleteDocument={deleteDocument} />}
            </div>
          </div>
        </div>
      )}

      {showCheckIn && <CheckInView onClose={() => setShowCheckIn(false)} />}
      {showCalendar && (
        <CalendarView
          onClose={() => setShowCalendar(false)}
          isDark={isDark}
          onCheckIn={() => { setShowCalendar(false); setShowCheckIn(true); }}
        />
      )}

      <AIAssistant />
    </div>
  );
}
