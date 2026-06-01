"use client";

import Sidebar from "@/components/Sidebar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const holidays: Record<string, string> = {
  "2026-01-01": "Jour de l’An",
  "2026-04-06": "Lundi de Pâques",
  "2026-05-01": "Fête du Travail",
  "2026-05-08": "Victoire 1945",
  "2026-05-14": "Ascension",
  "2026-05-25": "Lundi de Pentecôte",
  "2026-07-14": "Fête nationale",
  "2026-08-15": "Assomption",
  "2026-11-01": "Toussaint",
  "2026-11-11": "Armistice",
  "2026-12-25": "Noël",
};

function formatKey(date: Date) {
  return date.toISOString().split("T")[0];
}

function getTaskDate(task: any) {
  if (task.date) return task.date;
  if (task.due_date) return task.due_date;
  if (task.deadline) return task.deadline;
  return null;
}

export default function CalendarPage() {
  const today = new Date();

  const [tasks, setTasks] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    const { data } = await supabase.from("tasks").select("*");
    setTasks(data || []);
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startDay = (firstDay.getDay() + 6) % 7;
    const startDate = new Date(year, month, 1 - startDay);

    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      return date;
    });
  }, [year, month]);

  const monthName = currentDate.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-[#020617] text-white flex">
      <Sidebar />

      <section className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-blue-400 text-sm font-semibold">Calendrier</p>
            <h1 className="text-4xl font-black capitalize">{monthName}</h1>
            <p className="text-slate-400 mt-2">
              Planning mensuel connecté à tes vraies tâches.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              className="p-3 rounded-xl bg-slate-900 border border-white/10"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={() =>
                setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))
              }
              className="px-4 py-3 rounded-xl bg-blue-600 text-sm font-bold"
            >
              Aujourd’hui
            </button>

            <button
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              className="p-3 rounded-xl bg-slate-900 border border-white/10"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-slate-900/80 border border-white/10 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-white/10">
            {days.map((day) => (
              <div
                key={day}
                className="p-4 text-center text-sm font-bold text-slate-400"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((date) => {
              const key = formatKey(date);
              const isCurrentMonth = date.getMonth() === month;
              const isToday = key === formatKey(today);
              const holiday = holidays[key];

              const dayTasks = tasks.filter((task) => {
                const taskDate = getTaskDate(task);
                return taskDate === key;
              });

              return (
                <div
                  key={key}
                  className={`h-36 border border-white/5 p-3 transition hover:bg-slate-800 ${
                    !isCurrentMonth ? "bg-slate-950/60 text-slate-600" : ""
                  } ${isToday ? "ring-2 ring-blue-500 ring-inset" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{date.getDate()}</p>

                    {holiday && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] text-amber-300">
                        Férié
                      </span>
                    )}
                  </div>

                  {holiday && (
                    <div className="mt-2 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-300">
                      {holiday}
                    </div>
                  )}

                  <div className="mt-2 space-y-2">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className={`rounded-lg p-2 text-xs text-white ${
                          task.done ? "bg-green-600" : "bg-blue-600"
                        }`}
                      >
                        <p className="truncate font-semibold">
                          {task.name || task.title || "Sans titre"}
                        </p>
                        <p className="text-[10px] opacity-80">
                          {task.start_time || task.hour || ""}
                        </p>
                      </div>
                    ))}

                    {dayTasks.length > 3 && (
                      <p className="text-xs text-slate-400">
                        +{dayTasks.length - 3} autres
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}