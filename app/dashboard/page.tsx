"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import SchoolSection from "./components/SchoolSection";
import FinancesSection from "./components/FinancesSection";
import ReadingSection from "./components/ReadingSection";
import WorkoutsSection from "./components/WorkoutsSection";
import ContentSection from "./components/ContentSection";
import ProjectsSection from "./components/ProjectsSection";
import BentoCard from "./components/BentoCard";
import AIAssistant from "./components/AIAssistant";
import {
  FinancesBarChart,
  SchoolDonutChart,
  FitnessBarChart,
  ReadingDonutChart,
  ProjectsDonutChart,
  ContentDonutChart,
} from "./components/charts/CardCharts";

const DEGREE_CU = 120;
const WGU_DEFAULTS = { totalCU: 119, earnedCU: 43, activeCount: 13, termsCompleted: 5, termsTotal: 11 };

type TabKey = "finances" | "school" | "fitness" | "reading" | "projects" | "content";

const CARD_CONFIG: { key: TabKey; title: string; subtitle: string; accent: string; icon: string }[] = [
  { key: "finances", title: "Finances", subtitle: "Net worth & cash flow", accent: "#4ade80", icon: "💰" },
  { key: "school", title: "School", subtitle: "Degree progress", accent: "#60a5fa", icon: "🎓" },
  { key: "fitness", title: "Fitness", subtitle: "Workouts & streak", accent: "#fb923c", icon: "🔥" },
  { key: "reading", title: "Reading", subtitle: "Books & queue", accent: "#c084fc", icon: "📚" },
  { key: "projects", title: "Projects", subtitle: "Active & shipped", accent: "#fbbf24", icon: "⚡" },
  { key: "content", title: "Content", subtitle: "Ideas & published", accent: "#22d3ee", icon: "🎨" },
];

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<"overview" | "full">("overview");
  const [fullViewSection, setFullViewSection] = useState<TabKey | null>(null);

  const accounts = useQuery(api.dashboard.getAccounts) ?? [];
  const transactions = useQuery(api.dashboard.getTransactions) ?? [];
  const courses = useQuery(api.dashboard.getCourses) ?? [];
  const schoolProgress = useQuery(api.dashboard.getSchoolProgress);
  const books = useQuery(api.dashboard.getBooks) ?? [];
  const workouts = useQuery(api.dashboard.getWorkouts) ?? [];
  const workoutSchedule = useQuery(api.dashboard.getWorkoutSchedule) ?? [0, 2, 4, 5];
  const workoutMissedDays = useQuery(api.dashboard.getWorkoutMissedDays) ?? [];
  const contentPosts = useQuery(api.dashboard.getContentPosts) ?? [];
  const projects = useQuery(api.dashboard.getProjects) ?? [];

  const upsertAccount = useMutation(api.dashboard.upsertAccount);
  const addTransaction = useMutation(api.dashboard.addTransaction);
  const upsertCourse = useMutation(api.dashboard.upsertCourse);
  const setSchoolProgress = useMutation(api.dashboard.setSchoolProgress);
  const seedSchoolData = useMutation(api.dashboard.seedSchoolData);
  const upsertBook = useMutation(api.dashboard.upsertBook);
  const logWorkout = useMutation(api.dashboard.logWorkout);
  const addMissedDay = useMutation(api.dashboard.addMissedDay);
  const removeMissedDay = useMutation(api.dashboard.removeMissedDay);
  const addContentPost = useMutation(api.dashboard.addContentPost);
  const updateContentPost = useMutation(api.dashboard.updateContentPost);
  const upsertProject = useMutation(api.dashboard.upsertProject);

  const netWorth = accounts.reduce(
    (s, a) => (a.type === "debt" ? s - a.balance : s + a.balance),
    0
  );
  const earnedCU = courses.filter((c) => c.status === "completed").reduce((s, c) => s + c.creditUnits, 0);
  const booksRead = books.filter((b) => b.status === "completed").length;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthTx = transactions.filter((t) => t.date >= startOfMonth.getTime());
  const monthIncome = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const workedOutDays = new Set(
    workouts.map((w) => {
      const d = new Date(w.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const check = new Date(todayStart);
    check.setDate(todayStart.getDate() - i);
    if (workedOutDays.has(check.getTime())) streak++;
    else break;
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 0,
    }).format(n);

  const ideas = contentPosts.filter((p) => p.status === "idea").length;
  const inProgressContent = contentPosts.filter((p) => p.status === "in_progress").length;
  const published = contentPosts.filter((p) => p.status === "published").length;
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const shippedProjects = projects.filter((p) => p.status === "shipped").length;

  const wgu = schoolProgress && "totalCU" in schoolProgress ? schoolProgress : WGU_DEFAULTS;
  const wguPct = wgu.totalCU > 0 ? Math.round((wgu.earnedCU / wgu.totalCU) * 100) : 0;
  const wguCuLeft = wgu.totalCU - wgu.earnedCU;

  // Workouts per day for last 7 days (for fitness chart)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const workoutCountByDay = last7Days.map((d) => ({
    day: d.toLocaleDateString("en-US", { weekday: "short" }),
    count: workouts.filter((w) => {
      const wd = new Date(w.date);
      wd.setHours(0, 0, 0, 0);
      return wd.getTime() === d.getTime();
    }).length,
  }));

  const summary: Record<TabKey, { line1: string; line2?: string }> = {
    finances: { line1: fmt(netWorth), line2: `Income ${fmt(monthIncome)} · Out ${fmt(monthExpense)}` },
    school: { line1: `${wguPct}% · ${wguCuLeft} CU left`, line2: `${wgu.termsCompleted}/${wgu.termsTotal} terms · ${wgu.earnedCU} done` },
    fitness: { line1: `${streak} day streak`, line2: `${workouts.length} workouts logged` },
    reading: { line1: `${booksRead} read`, line2: `${books.filter((b) => b.status === "reading").length} reading now` },
    projects: { line1: `${activeProjects} active`, line2: `${shippedProjects} shipped` },
    content: { line1: `${published} published`, line2: `${inProgressContent} in progress · ${ideas} ideas` },
  };

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{
        fontFamily: "var(--font-geist), system-ui, sans-serif",
        background: "linear-gradient(160deg, #020b18 0%, #041223 40%, #061a2e 70%, #040e1c 100%)",
      }}
    >
      {/* Frutiger Aero background orbs */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: "-20vh",
          left: "-10vw",
          width: "70vw",
          height: "70vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(32,110,200,0.18) 0%, rgba(20,70,160,0.08) 40%, transparent 70%)",
          filter: "blur(60px)",
          zIndex: 0,
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          bottom: "-15vh",
          right: "-10vw",
          width: "60vw",
          height: "60vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16,170,130,0.12) 0%, rgba(10,100,90,0.06) 40%, transparent 70%)",
          filter: "blur(60px)",
          zIndex: 0,
        }}
      />

      {/* Header — glass bar */}
      <header
        className="shrink-0 z-20 flex items-center justify-between px-6 py-3"
        style={{
          background: "rgba(2,11,24,0.85)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
            style={{
              background: "linear-gradient(145deg, rgba(80,160,255,0.5), rgba(40,100,220,0.3))",
              border: "1px solid rgba(120,180,255,0.4)",
              boxShadow: "0 0 16px rgba(80,160,255,0.35)",
            }}
          >
            ◈
          </div>
          <span
            className="text-base font-black tracking-tight"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #93c5fd 50%, #67e8f9 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            The Process
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
          <button
            onClick={() => setViewMode("full")}
            className={`px-4 py-2 text-xs font-semibold transition-all ${
              viewMode === "full"
                ? "text-[#60c8ff]"
                : "text-white/40 hover:text-white/70 hover:bg-white/5"
            }`}
            style={
              viewMode === "full"
                ? { background: "rgba(96,200,255,0.15)", borderRight: "1px solid rgba(255,255,255,0.08)" }
                : {}
            }
          >
            Full view
          </button>
          <button
            onClick={() => setViewMode("overview")}
            className={`px-4 py-2 text-xs font-semibold transition-all ${
              viewMode === "overview"
                ? "text-[#60c8ff]"
                : "text-white/40 hover:text-white/70 hover:bg-white/5"
            }`}
            style={
              viewMode === "overview"
                ? { background: "rgba(96,200,255,0.15)" }
                : {}
            }
          >
            Overview
          </button>
        </div>
      </header>

      {/* Quote — Musashi (Baki): training is what a proper swordsman must do → applied to building wealth */}
      <p
        className="shrink-0 z-20 text-center text-xs sm:text-sm tracking-wide py-2 px-4"
        style={{
          background: "rgba(2,11,24,0.5)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          fontStyle: "italic",
          color: "rgba(226, 240, 255, 0.65)",
          textShadow: "0 0 20px rgba(96, 200, 255, 0.4), 0 0 40px rgba(96, 200, 255, 0.2), 0 0 60px rgba(96, 200, 255, 0.1)",
          boxShadow: "0 0 30px rgba(96, 200, 255, 0.08)",
        }}
      >
        &ldquo;Put simply, training is training—it&apos;s what a proper swordsman must do.&rdquo; These things I do are what a proper wealthy person does. However good I am or not, that&apos;s what I must do.
      </p>

      {/* Main — bento grid: one screen, no scroll */}
      <main className="flex-1 min-h-0 overflow-hidden relative z-10 flex flex-col">
        <div
          className="h-full w-full p-3 flex-1 min-h-0"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: 10,
          }}
        >
          {CARD_CONFIG.map((card) => {
            const chart =
              card.key === "finances" ? (
                <FinancesBarChart income={monthIncome} expense={monthExpense} accent={card.accent} />
              ) : card.key === "school" ? (
                <SchoolDonutChart percentComplete={wguPct} accent={card.accent} />
              ) : card.key === "fitness" ? (
                <FitnessBarChart data={workoutCountByDay} accent={card.accent} />
              ) : card.key === "reading" ? (
                <ReadingDonutChart
                  completed={booksRead}
                  reading={books.filter((b) => b.status === "reading").length}
                  wantToRead={books.filter((b) => b.status === "want_to_read").length}
                  accent={card.accent}
                />
              ) : card.key === "projects" ? (
                <ProjectsDonutChart active={activeProjects} shipped={shippedProjects} accent={card.accent} />
              ) : card.key === "content" ? (
                <ContentDonutChart
                  published={published}
                  inProgress={inProgressContent}
                  ideas={ideas}
                  accent={card.accent}
                />
              ) : null;
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

      {/* Full-view modal — one section, full space */}
      {fullViewSection && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{
            background: "linear-gradient(160deg, #020b18 0%, #041223 50%, #061a2e 100%)",
          }}
        >
          <div
            className="shrink-0 flex items-center justify-between px-5 h-14"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(2,11,24,0.9)", backdropFilter: "blur(12px)" }}
          >
            <button
              onClick={() => {
                setFullViewSection(null);
                setViewMode("overview");
              }}
              className="text-sm text-white/60 hover:text-[#60c8ff] transition-colors"
            >
              ← Back to Overview
            </button>
            <span className="text-sm font-semibold text-white/90">
              {CARD_CONFIG.find((c) => c.key === fullViewSection)?.title}
            </span>
            <div className="w-24" />
          </div>
          <div className="flex-1 min-h-0 flex flex-col p-4">
            <div className="flex-1 min-h-0 flex flex-col max-w-5xl w-full mx-auto">
              {fullViewSection === "finances" && (
                <FinancesSection
                  accounts={accounts}
                  transactions={transactions}
                  upsertAccount={upsertAccount}
                  addTransaction={addTransaction}
                />
              )}
              {fullViewSection === "school" && (
                <SchoolSection
                  courses={courses}
                  upsertCourse={upsertCourse}
                  schoolProgress={schoolProgress && "totalCU" in schoolProgress ? schoolProgress : WGU_DEFAULTS}
                  setSchoolProgress={setSchoolProgress}
                  seedSchoolData={seedSchoolData}
                />
              )}
              {fullViewSection === "fitness" && (
                <WorkoutsSection
                  workouts={workouts}
                  logWorkout={logWorkout}
                  workoutSchedule={workoutSchedule}
                  workoutMissedDays={workoutMissedDays}
                  addMissedDay={addMissedDay}
                  removeMissedDay={removeMissedDay}
                />
              )}
              {fullViewSection === "reading" && (
                <ReadingSection books={books} upsertBook={upsertBook} />
              )}
              {fullViewSection === "projects" && (
                <ProjectsSection projects={projects} upsertProject={upsertProject} />
              )}
              {fullViewSection === "content" && (
                <ContentSection
                  posts={contentPosts}
                  addContentPost={addContentPost}
                  updateContentPost={updateContentPost}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full view mode — section picker */}
      {viewMode === "full" && !fullViewSection && (
        <div
          className="fixed inset-0 z-40 flex flex-col p-6 overflow-y-auto"
          style={{ background: "rgba(2,11,24,0.92)", backdropFilter: "blur(8px)" }}
        >
          <div className="max-w-2xl mx-auto w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white/90">Choose an area</h2>
              <button
                onClick={() => setViewMode("overview")}
                className="text-sm text-white/50 hover:text-[#60c8ff] transition-colors"
              >
                ← Overview
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {CARD_CONFIG.map((card) => (
                <button
                  key={card.key}
                  onClick={() => setFullViewSection(card.key)}
                  className="rounded-xl p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 0 20px rgba(0,0,0,0.15)",
                  }}
                >
                  <span className="text-2xl mb-3 block">{card.icon}</span>
                  <p className="text-sm font-semibold text-white/95">{card.title}</p>
                  <p className="text-xs text-white/45 mt-1">Know more →</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <AIAssistant />
    </div>
  );
}
