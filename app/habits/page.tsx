"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
import { CheckCircle2, Circle } from "lucide-react";

type Habit = {
  id: string;
  name: string;
  color: string;
};

type HabitLog = {
  id: string;
  habit_id: string;
  completed_date: string;
};

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);

  const today = new Date().toISOString().split("T")[0];

  async function loadData() {
    const { data: habitsData } = await supabase
      .from("habits")
      .select("*")
      .order("name");

    const { data: logsData } = await supabase
      .from("habit_logs")
      .select("*")
      .eq("completed_date", today);

    setHabits(habitsData || []);
    setLogs(logsData || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function toggleHabit(habitId: string) {
    const existing = logs.find(
      (log) =>
        log.habit_id === habitId &&
        log.completed_date === today
    );

    if (existing) {
      await supabase
        .from("habit_logs")
        .delete()
        .eq("id", existing.id);
    } else {
      await supabase
        .from("habit_logs")
        .insert({
          habit_id: habitId,
          completed_date: today,
        });
    }

    loadData();
  }

  const completedCount = useMemo(() => {
    return logs.length;
  }, [logs]);

  const percentage = useMemo(() => {
    if (habits.length === 0) return 0;

    return Math.round(
      (completedCount / habits.length) * 100
    );
  }, [completedCount, habits]);

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">

        <p className="uppercase tracking-[0.3em] text-slate-500 text-xs mb-3">
          Habitudes
        </p>

        <h1 className="text-5xl font-bold mb-2">
          Habitudes du jour
        </h1>

        <p className="text-slate-400 mb-8">
          Suivi quotidien de tes routines.
        </p>

        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 mb-8">
          <div className="flex justify-between items-center">

            <div>
              <p className="text-slate-400">
                Progression du jour
              </p>

              <h2 className="text-4xl font-bold mt-2">
                {completedCount}/{habits.length}
              </h2>
            </div>

            <div className="text-right">
              <p className="text-slate-400">
                Réussite
              </p>

              <h2 className="text-4xl font-bold">
                {percentage}%
              </h2>
            </div>

          </div>
        </div>

        <div className="space-y-4">
          {habits.map((habit) => {
            const completed = logs.some(
              (log) =>
                log.habit_id === habit.id &&
                log.completed_date === today
            );

            return (
              <div
                key={habit.id}
                className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 flex items-center justify-between hover:bg-white/10 transition"
              >
                <div>
                  <h3 className="font-semibold text-lg">
                    {habit.name}
                  </h3>
                </div>

                <button
                  onClick={() =>
                    toggleHabit(habit.id)
                  }
                >
                  {completed ? (
                    <CheckCircle2
                      size={28}
                      className="text-green-400"
                    />
                  ) : (
                    <Circle
                      size={28}
                      className="text-slate-500"
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}