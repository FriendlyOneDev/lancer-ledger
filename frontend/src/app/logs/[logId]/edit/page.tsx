"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ClockWidget from "@/components/ClockWidget";
import LLClockDisplay from "@/components/LLClockDisplay";
import { computeTotalLLTicks, ticksToLevelProgress } from "@/lib/ll-clock";
import type { Clock, Pilot } from "@/types/database";

interface EditLogPageProps {
  params: Promise<{ logId: string }>;
}

interface LogEntry {
  id: string;
  pilot_id: string;
  log_type: "game" | "trade";
  description: string | null;
  manna_change: number;
  downtime_change: number;
  ll_clock_change: number;
  created_at: string;
}

interface ClockProgressItem {
  clock_id: string;
  ticks_applied: number;
}

export default function EditLogPage({ params }: EditLogPageProps) {
  const [logId, setLogId] = useState<string>("");
  const [log, setLog] = useState<LogEntry | null>(null);
  const [pilot, setPilot] = useState<Pilot | null>(null);
  const [description, setDescription] = useState("");
  const [mannaChange, setMannaChange] = useState(0);
  const [downtimeChange, setDowntimeChange] = useState(0);
  const [llClockChange, setLlClockChange] = useState(0);
  const [clocks, setClocks] = useState<Clock[]>([]);
  const [selectedClocks, setSelectedClocks] = useState<Record<string, number>>({});
  const origClockTicks = useRef<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    params.then((p) => setLogId(p.logId));
  }, [params]);

  useEffect(() => {
    if (!logId) return;

    const fetchData = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setError("Not authenticated");
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

        // Fetch log details (includes clock_progress)
        const response = await fetch(`${apiUrl}/logs/${logId}/details`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch log entry");
        }

        const data = await response.json();
        setLog(data as LogEntry);
        setDescription(data.description || "");
        setMannaChange(data.manna_change);
        setDowntimeChange(data.downtime_change);
        setLlClockChange(data.ll_clock_change);

        // Pre-populate clock ticks from existing progress
        const clockTicks: Record<string, number> = {};
        if (data.clock_progress) {
          for (const cp of data.clock_progress as ClockProgressItem[]) {
            clockTicks[cp.clock_id] = cp.ticks_applied;
          }
        }
        setSelectedClocks(clockTicks);
        origClockTicks.current = { ...clockTicks };

        // Fetch pilot data
        const { data: pilotData } = await supabase
          .from("pilots")
          .select("*")
          .eq("id", data.pilot_id)
          .single();

        if (pilotData) {
          setPilot(pilotData as Pilot);
        }

        // Fetch incomplete clocks for this pilot
        const { data: clocksData } = await supabase
          .from("clocks")
          .select("*")
          .eq("pilot_id", data.pilot_id)
          .eq("is_completed", false)
          .order("created_at", { ascending: false });

        if (clocksData) {
          setClocks(clocksData as Clock[]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load log entry");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [logId, supabase]);

  const handleClockChange = (clockId: string, ticks: number) => {
    setSelectedClocks((prev) => {
      if (ticks === 0) {
        const { [clockId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [clockId]: ticks };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Not authenticated");
        setSaving(false);
        return;
      }

      const clockProgress = Object.entries(selectedClocks).map(([clockId, ticks]) => ({
        clock_id: clockId,
        ticks_applied: ticks,
      }));

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/logs/${logId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          description: description.trim() || null,
          manna_change: mannaChange,
          downtime_change: downtimeChange,
          ll_clock_change: llClockChange,
          clock_progress: clockProgress,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to update log entry");
      }

      router.push(`/pilots/${log?.pilot_id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update log entry");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this log entry? Pilot resources will be recalculated."
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Not authenticated");
        setDeleting(false);
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/logs/${logId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to delete log entry");
      }

      router.push(`/pilots/${log?.pilot_id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete log entry");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!log) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>Log entry not found</p>
      </div>
    );
  }

  // Compute base LL state by subtracting this log's original contribution
  const llTotalTicks = pilot
    ? computeTotalLLTicks(pilot.license_level, pilot.ll_clock_progress)
    : 0;
  const llBaseTicks = Math.max(0, llTotalTicks - (log?.ll_clock_change ?? 0));
  const { level: baseLL, progress: baseLLProgress } = ticksToLevelProgress(llBaseTicks);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">TTRPG Ledger</h1>
          <Link href={`/pilots/${log.pilot_id}`} className="text-gray-400 hover:text-white">
            Back to Pilot
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Edit Log Entry</h2>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column — Form */}
          <div className="flex-1 space-y-6">
            <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 space-y-6">
              {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {/* Log Info */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 text-xs rounded ${
                    log.log_type === "game" ? "bg-green-600" : "bg-purple-600"
                  }`}
                >
                  {log.log_type === "game" ? "Game" : "Trade"}
                </span>
                <span className="text-sm text-gray-400">
                  {new Date(log.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What happened?"
                />
              </div>

              {/* Resource Changes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="manna"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Manna Change
                  </label>
                  <input
                    id="manna"
                    type="number"
                    value={mannaChange}
                    onChange={(e) => setMannaChange(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label
                    htmlFor="downtime"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Downtime Change
                  </label>
                  <input
                    id="downtime"
                    type="number"
                    value={downtimeChange}
                    onChange={(e) => setDowntimeChange(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Clock Tick Controls */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Clock Ticks
                </label>
                <div className="space-y-2">
                  {/* LL Clock control */}
                  <div className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                    <span className="font-medium text-yellow-400">License Level</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLlClockChange(Math.max(0, llClockChange - 1))}
                        className="w-8 h-8 flex items-center justify-center bg-gray-600 hover:bg-gray-500 rounded text-lg font-bold"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-mono">{llClockChange}</span>
                      <button
                        type="button"
                        onClick={() => setLlClockChange(Math.min(25, llClockChange + 1))}
                        className="w-8 h-8 flex items-center justify-center bg-gray-600 hover:bg-gray-500 rounded text-lg font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Personal clock controls */}
                  {clocks.map((clock) => (
                    <div
                      key={clock.id}
                      className="flex items-center justify-between bg-gray-700 rounded-lg p-3"
                    >
                      <span className="font-medium">{clock.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleClockChange(
                              clock.id,
                              Math.max(0, (selectedClocks[clock.id] || 0) - 1)
                            )
                          }
                          className="w-8 h-8 flex items-center justify-center bg-gray-600 hover:bg-gray-500 rounded text-lg font-bold"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-mono">
                          {selectedClocks[clock.id] || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleClockChange(
                              clock.id,
                              Math.min(25, (selectedClocks[clock.id] || 0) + 1)
                            )
                          }
                          className="w-8 h-8 flex items-center justify-center bg-gray-600 hover:bg-gray-500 rounded text-lg font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving || deleting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <Link
                  href={`/pilots/${log.pilot_id}`}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
                >
                  Cancel
                </Link>
              </div>
            </form>

            {/* Danger Zone */}
            <div className="bg-gray-800 rounded-lg p-6 border border-red-900">
              <h3 className="text-lg font-bold text-red-400 mb-4">Danger Zone</h3>
              <p className="text-gray-400 mb-4">
                Deleting this log entry will recalculate pilot resources and clock states.
              </p>
              <button
                onClick={handleDelete}
                disabled={saving || deleting}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium"
              >
                {deleting ? "Deleting..." : "Delete Log Entry"}
              </button>
            </div>
          </div>

          {/* Right Column — Clock Visuals */}
          <div className="lg:w-72 bg-gray-800 rounded-lg p-6 h-fit">
            <h3 className="text-sm font-medium text-gray-300 mb-4">Clock Preview</h3>
            <div className="space-y-6">
              {/* LL Clock visual */}
              {pilot && (
                <LLClockDisplay
                  licenseLevel={baseLL}
                  progress={baseLLProgress}
                  pendingTicks={llClockChange}
                  size={100}
                />
              )}

              {/* Personal clock visuals */}
              {clocks.map((clock) => {
                // Subtract this log's original ticks to show the base state
                const origTicks = origClockTicks.current[clock.id] || 0;
                const baseFilled = Math.max(
                  0,
                  clock.filled - origTicks * clock.tick_amount
                );
                return (
                  <ClockWidget
                    key={clock.id}
                    filled={baseFilled}
                    pending={(selectedClocks[clock.id] || 0) * clock.tick_amount}
                    total={clock.segments}
                    label={clock.name}
                    size={100}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
