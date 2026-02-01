"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface LogWithContext {
  id: string;
  pilot_id: string;
  log_type: "game" | "trade";
  description: string | null;
  manna_change: number;
  downtime_change: number;
  created_at: string;
  pilot_name: string;
  pilot_callsign: string | null;
  owner_name: string;
  owner_discord_id: string | null;
}

interface LogsResponse {
  logs: LogWithContext[];
  total: number;
  limit: number;
  offset: number;
}

export default function GMLogsPage() {
  const [logs, setLogs] = useState<LogWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logTypeFilter, setLogTypeFilter] = useState<string>("");
  const [resourceFilter, setResourceFilter] = useState<string>("");
  const supabase = createClient();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Not authenticated");
        return;
      }

      const params = new URLSearchParams();
      if (logTypeFilter) params.append("log_type", logTypeFilter);
      if (resourceFilter) params.append("resource_direction", resourceFilter);
      params.append("limit", "100");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/gm/logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError("You don't have GM permissions");
        } else {
          throw new Error("Failed to fetch logs");
        }
        return;
      }

      const data: LogsResponse = await response.json();
      setLogs(data.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [logTypeFilter, resourceFilter]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">TTRPG Ledger - GM Dashboard</h1>
          <Link href="/dashboard" className="text-gray-400 hover:text-white">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">All Logs</h2>
          <div className="flex gap-2">
            <Link
              href="/gm/pilots"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
            >
              View All Pilots
            </Link>
            <Link
              href="/gm/corporations"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
            >
              Manage Corporations
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 flex gap-4 flex-wrap">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Log Type</label>
            <select
              value={logTypeFilter}
              onChange={(e) => setLogTypeFilter(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
            >
              <option value="">All Types</option>
              <option value="game">Game Sessions</option>
              <option value="trade">Trade / Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Resource Change</label>
            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
            >
              <option value="">All</option>
              <option value="increase">Increases Only</option>
              <option value="decrease">Decreases Only</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-gray-400">No logs found matching filters.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
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
                    <div className="text-sm">
                      <Link
                        href={`/pilots/${log.pilot_id}`}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        {log.pilot_name}
                        {log.pilot_callsign && ` "${log.pilot_callsign}"`}
                      </Link>
                      <span className="text-gray-500"> (Owner: {log.owner_name})</span>
                    </div>
                    {log.description && (
                      <p className="text-gray-300 mt-2 text-sm">{log.description}</p>
                    )}
                  </div>
                  <div className="flex gap-4 text-sm">
                    {log.manna_change !== 0 && (
                      <span
                        className={log.manna_change > 0 ? "text-green-400" : "text-red-400"}
                      >
                        {log.manna_change > 0 ? "+" : ""}
                        {log.manna_change} Manna
                      </span>
                    )}
                    {log.downtime_change !== 0 && (
                      <span
                        className={
                          log.downtime_change > 0 ? "text-green-400" : "text-red-400"
                        }
                      >
                        {log.downtime_change > 0 ? "+" : ""}
                        {log.downtime_change} DT
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
