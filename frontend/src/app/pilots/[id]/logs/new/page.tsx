"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ClockWidget from "@/components/ClockWidget";
import LLClockDisplay from "@/components/LLClockDisplay";
import type { Clock, Pilot } from "@/types/database";

interface NewLogPageProps {
  params: Promise<{ id: string }>;
}

export default function NewLogPage({ params }: NewLogPageProps) {
  const [pilotId, setPilotId] = useState<string>("");
  const [pilot, setPilot] = useState<Pilot | null>(null);
  const [logType, setLogType] = useState<"game" | "trade">("game");
  const [description, setDescription] = useState("");
  const [mannaChange, setMannaChange] = useState(0);
  const [downtimeChange, setDowntimeChange] = useState(0);
  const [llClockChange, setLlClockChange] = useState(1);
  const [clocks, setClocks] = useState<Clock[]>([]);
  const [selectedClocks, setSelectedClocks] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    params.then((p) => setPilotId(p.id));
  }, [params]);

  useEffect(() => {
    const type = searchParams.get("type");
    if (type === "trade") {
      setLogType("trade");
      setLlClockChange(0);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!pilotId) return;

    const fetchData = async () => {
      const { data: pilotData } = await supabase
        .from("pilots")
        .select("*")
        .eq("id", pilotId)
        .single();

      if (pilotData) {
        setPilot(pilotData as Pilot);
      }

      const { data: clocksData } = await supabase
        .from("clocks")
        .select("*")
        .eq("pilot_id", pilotId)
        .eq("is_completed", false)
        .order("created_at", { ascending: false });

      if (clocksData) {
        setClocks(clocksData as Clock[]);
      }
    };

    fetchData();
  }, [pilotId, supabase]);

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
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      const clockProgress = Object.entries(selectedClocks).map(([clockId, ticks]) => ({
        clock_id: clockId,
        ticks_applied: ticks,
      }));

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/pilots/${pilotId}/logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          log_type: logType,
          description: description.trim() || null,
          manna_change: mannaChange,
          downtime_change: downtimeChange,
          ll_clock_change: llClockChange,
          clock_progress: clockProgress,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to create log entry");
      }

      router.push(`/pilots/${pilotId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create log entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">TTRPG Ledger</h1>
          <Link href={`/pilots/${pilotId}`} className="text-gray-400 hover:text-white">
            Back to Pilot
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">
          Create {logType === "game" ? "Game" : "Trade"} Log
        </h2>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column — Form */}
          <form onSubmit={handleSubmit} className="flex-1 bg-gray-800 rounded-lg p-6 space-y-6">
            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Log Type Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Log Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLogType("game");
                    setLlClockChange(1);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    logType === "game"
                      ? "bg-green-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  Game Session
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLogType("trade");
                    setLlClockChange(0);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    logType === "trade"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  Trade / Other
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What happened this session?"
              />
            </div>

            {/* Resource Changes */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="manna" className="block text-sm font-medium text-gray-300 mb-2">
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
                <label htmlFor="downtime" className="block text-sm font-medium text-gray-300 mb-2">
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
              <label className="block text-sm font-medium text-gray-300 mb-2">Clock Ticks</label>
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
                disabled={loading}
                className={`px-6 py-2 rounded-lg font-medium disabled:bg-gray-600 disabled:cursor-not-allowed ${
                  logType === "game"
                    ? "bg-green-600 hover:bg-green-500"
                    : "bg-purple-600 hover:bg-purple-500"
                }`}
              >
                {loading ? "Creating..." : "Create Log Entry"}
              </button>
              <Link
                href={`/pilots/${pilotId}`}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
              >
                Cancel
              </Link>
            </div>
          </form>

          {/* Right Column — Clock Visuals */}
          <div className="lg:w-72 bg-gray-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-300 mb-4">Clock Preview</h3>
            <div className="space-y-6">
              {/* LL Clock visual */}
              {pilot && (
                <LLClockDisplay
                  licenseLevel={pilot.license_level}
                  progress={pilot.ll_clock_progress}
                  pendingTicks={llClockChange}
                  size={100}
                />
              )}

              {/* Personal clock visuals */}
              {clocks.map((clock) => (
                <ClockWidget
                  key={clock.id}
                  filled={clock.filled}
                  pending={(selectedClocks[clock.id] || 0) * clock.tick_amount}
                  total={clock.segments}
                  label={clock.name}
                  size={100}
                />
              ))}

              {clocks.length === 0 && !pilot && (
                <p className="text-sm text-gray-500">Loading...</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
