"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
  created_at: string;
}

export default function EditLogPage({ params }: EditLogPageProps) {
  const [logId, setLogId] = useState<string>("");
  const [log, setLog] = useState<LogEntry | null>(null);
  const [description, setDescription] = useState("");
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

    const fetchLog = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setError("Not authenticated");
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiUrl}/logs/${logId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch log entry");
        }

        const data: LogEntry = await response.json();
        setLog(data);
        setDescription(data.description || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load log entry");
      } finally {
        setLoading(false);
      }
    };

    fetchLog();
  }, [logId, supabase]);

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

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/logs/${logId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          description: description.trim() || null,
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
    if (!confirm("Are you sure you want to delete this log entry? This will NOT reverse the resource changes.")) {
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

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Edit Log Entry</h2>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 space-y-6">
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Log Info (read-only) */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
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
            <div className="flex gap-4 text-sm">
              {log.manna_change !== 0 && (
                <span className={log.manna_change > 0 ? "text-green-400" : "text-red-400"}>
                  {log.manna_change > 0 ? "+" : ""}
                  {log.manna_change} Manna
                </span>
              )}
              {log.downtime_change !== 0 && (
                <span className={log.downtime_change > 0 ? "text-green-400" : "text-red-400"}>
                  {log.downtime_change > 0 ? "+" : ""}
                  {log.downtime_change} DT
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Resource changes cannot be edited after creation.
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
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
        <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-red-900">
          <h3 className="text-lg font-bold text-red-400 mb-4">Danger Zone</h3>
          <p className="text-gray-400 mb-4">
            Deleting this log entry will NOT reverse the resource changes (manna, downtime, clock progress).
          </p>
          <button
            onClick={handleDelete}
            disabled={saving || deleting}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium"
          >
            {deleting ? "Deleting..." : "Delete Log Entry"}
          </button>
        </div>
      </main>
    </div>
  );
}
