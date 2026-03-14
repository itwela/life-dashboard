"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

// Shared Frutiger Aero theme for charts
const theme = {
  grid: "rgba(255,255,255,0.06)",
  tick: "rgba(226,240,255,0.5)",
  tooltipBg: "rgba(2,11,24,0.95)",
  tooltipBorder: "rgba(96,200,255,0.25)",
  // Hover cursor/highlight behind bar (no white flash)
  cursorFill: "rgba(6,26,46,0.85)",
};

export function FinancesBarChart({
  income,
  expense,
  accent,
}: {
  income: number;
  expense: number;
  accent: string;
}) {
  const data = [
    { name: "In", value: income, fill: accent },
    { name: "Out", value: expense, fill: "rgba(248,113,113,0.85)" },
  ];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} layout="vertical">
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={28} tick={{ fill: theme.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: theme.cursorFill, stroke: "rgba(96,200,255,0.2)" }}
          wrapperStyle={{ outline: "none" }}
          contentStyle={{
            background: theme.tooltipBg,
            border: `1px solid ${theme.tooltipBorder}`,
            borderRadius: 8,
            fontSize: 11,
          }}
          formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
          labelStyle={{ color: "rgba(226,240,255,0.8)" }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SchoolDonutChart({ percentComplete, accent }: { percentComplete: number; accent: string }) {
  const data = [
    { name: "Done", value: percentComplete, color: accent },
    { name: "Left", value: Math.max(0, 100 - percentComplete), color: "rgba(255,255,255,0.1)" },
  ];
  return (
    <div className="relative w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: theme.tooltipBg,
              border: `1px solid ${theme.tooltipBorder}`,
              borderRadius: 8,
              fontSize: 11,
            }}
            formatter={(value: number) => [`${value}%`, ""]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ color: accent, fontSize: 14, fontWeight: 700 }}
      >
        {percentComplete}%
      </div>
    </div>
  );
}

export function FitnessBarChart({
  data,
  accent,
}: {
  data: { day: string; count: number }[];
  accent: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="day" tick={{ fill: theme.tick, fontSize: 9 }} axisLine={false} tickLine={false} />
        <YAxis hide domain={[0, "auto"]} />
        <Tooltip
          cursor={{ fill: theme.cursorFill, stroke: "rgba(96,200,255,0.2)" }}
          wrapperStyle={{ outline: "none" }}
          contentStyle={{
            background: theme.tooltipBg,
            border: `1px solid ${theme.tooltipBorder}`,
            borderRadius: 8,
            fontSize: 11,
          }}
          formatter={(value: number) => [value, "workouts"]}
        />
        <Bar dataKey="count" fill={accent} radius={[4, 4, 0, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ReadingDonutChart({
  completed,
  reading,
  wantToRead,
  accent,
}: {
  completed: number;
  reading: number;
  wantToRead: number;
  accent: string;
}) {
  const data = [
    { name: "Read", value: completed, color: accent },
    { name: "Reading", value: reading, color: "rgba(192,132,252,0.7)" },
    { name: "Queue", value: wantToRead, color: "rgba(255,255,255,0.15)" },
  ].filter((d) => d.value > 0);
  if (data.length === 0) data.push({ name: "None", value: 1, color: "rgba(255,255,255,0.1)" });
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="50%"
          outerRadius="85%"
          paddingAngle={2}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: theme.tooltipBg,
            border: `1px solid ${theme.tooltipBorder}`,
            borderRadius: 8,
            fontSize: 11,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ProjectsDonutChart({
  active,
  shipped,
  accent,
}: {
  active: number;
  shipped: number;
  accent: string;
}) {
  const data = [
    { name: "Active", value: active, color: accent },
    { name: "Shipped", value: shipped, color: "rgba(74,222,128,0.8)" },
  ].filter((d) => d.value > 0);
  if (data.length === 0) data.push({ name: "None", value: 1, color: "rgba(255,255,255,0.1)" });
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="50%"
          outerRadius="85%"
          paddingAngle={2}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: theme.tooltipBg,
            border: `1px solid ${theme.tooltipBorder}`,
            borderRadius: 8,
            fontSize: 11,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ContentDonutChart({
  published,
  inProgress,
  ideas,
  accent,
}: {
  published: number;
  inProgress: number;
  ideas: number;
  accent: string;
}) {
  const data = [
    { name: "Published", value: published, color: accent },
    { name: "In progress", value: inProgress, color: "rgba(34,211,238,0.6)" },
    { name: "Ideas", value: ideas, color: "rgba(255,255,255,0.15)" },
  ].filter((d) => d.value > 0);
  if (data.length === 0) data.push({ name: "None", value: 1, color: "rgba(255,255,255,0.1)" });
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="50%"
          outerRadius="85%"
          paddingAngle={2}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: theme.tooltipBg,
            border: `1px solid ${theme.tooltipBorder}`,
            borderRadius: 8,
            fontSize: 11,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
