"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Clock } from "@/types/database";

interface NewLogPageProps {
  params: Promise<{ id: string }>;
}

export default function NewLogPage({ params }: NewLogPageProps) {
  const [pilotId, setPilotId] = useState<string>("");
  const [logType, setLogType] = useState<"game" | "trade">("game");
  const [description, setDescription] = useState("");
  const [mannaChange, setMannaChange] = useState(0);
  const [downtimeChange, setDowntimeChange] = useState(0);
  const [tickLlClock, setTickLlClock] = useState(true);
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
      setTickLlClock(false);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!pilotId) return;

    const fetchClocks = async () => {
      const { data } = await supabase
        .from("clocks")
        .select("*")
        .eq("pilot_id", pilotId)
        .eq("is_completed", false)
        .order("created_at", { ascending: false });

      if (data) {
        setClocks(data as Clock[]);
      }
    };

    fetchClocks();
  }, [pilotId, supabase]);

  const handleClockToggle = (clockId: string, ticks: number) => {
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
          tick_ll_clock: logType === "game" && tickLlClock,
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

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">
          Create {logType === "game" ? "Game" : "Trade"} Log
        </h2>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 space-y-6">
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Log Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Log Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setLogType("game");
                  setTickLlClock(true);
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
                  setTickLlClock(false);
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

          {/* LL Clock (Game logs only) */}
          {logType === "game" && (
            <div className="flex items-center gap-3">
              <input
                id="tickLl"
                type="checkbox"
                checked={tickLlClock}
                onChange={(e) => setTickLlClock(e.target.checked)}
                className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="tickLl" className="text-sm text-gray-300">
                Tick License Level clock (+1 segment)
              </label>
            </div>
          )}

          {/* Personal Clocks */}
          {clocks.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tick Personal Clocks
              </label>
              <div className="space-y-2">
                {clocks.map((clock) => (
                  <div
                    key={clock.id}
                    className="flex items-center justify-between bg-gray-700 rounded-lg p-3"
                  >
                    <div>
                      <span className="font-medium">{clock.name}</span>
                      <span className="text-sm text-gray-400 ml-2">
                        ({clock.filled}/{clock.segments})
                      </span>
                    </div>
                    <select
                      value={selectedClocks[clock.id] || 0}
                      onChange={(e) =>
                        handleClockToggle(clock.id, parseInt(e.target.value))
                      }
                      className="px-3 py-1 bg-gray-600 border border-gray-500 rounded text-sm"
                    >
                      <option value={0}>No tick</option>
                      <option value={1}>+1 tick</option>
                      <option value={2}>+2 ticks</option>
                      <option value={3}>+3 ticks</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

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
      </main>
    </div>
  );
}
