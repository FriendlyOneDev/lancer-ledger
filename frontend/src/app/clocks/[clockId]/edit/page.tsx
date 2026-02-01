"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Clock } from "@/types/database";

interface EditClockPageProps {
  params: Promise<{ clockId: string }>;
}

export default function EditClockPage({ params }: EditClockPageProps) {
  const [clockId, setClockId] = useState<string>("");
  const [clock, setClock] = useState<Clock | null>(null);
  const [name, setName] = useState("");
  const [filled, setFilled] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    params.then((p) => setClockId(p.clockId));
  }, [params]);

  useEffect(() => {
    if (!clockId) return;

    const fetchClock = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("clocks")
          .select("*")
          .eq("id", clockId)
          .single();

        if (fetchError) throw new Error(fetchError.message);

        const clockData = data as Clock;
        setClock(clockData);
        setName(clockData.name);
        setFilled(clockData.filled);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load clock");
      } finally {
        setLoading(false);
      }
    };

    fetchClock();
  }, [clockId, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clock) return;

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
      const response = await fetch(`${apiUrl}/clocks/${clockId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          filled: Math.min(filled, clock.segments),
          is_completed: filled >= clock.segments,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to update clock");
      }

      router.push(`/pilots/${clock.pilot_id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update clock");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!clock) return;
    if (!confirm("Are you sure you want to delete this clock?")) return;

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
      const response = await fetch(`${apiUrl}/clocks/${clockId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to delete clock");
      }

      router.push(`/pilots/${clock.pilot_id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete clock");
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

  if (!clock) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>Clock not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">TTRPG Ledger</h1>
          <Link href={`/pilots/${clock.pilot_id}`} className="text-gray-400 hover:text-white">
            Back to Pilot
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Edit Clock</h2>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 space-y-6">
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Clock Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="filled" className="block text-sm font-medium text-gray-300 mb-2">
              Segments Filled (max: {clock.segments})
            </label>
            <input
              id="filled"
              type="number"
              value={filled}
              onChange={(e) => setFilled(Math.max(0, Math.min(clock.segments, parseInt(e.target.value) || 0)))}
              min="0"
              max={clock.segments}
              className="w-32 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="text-sm text-gray-500">
            <p>Total segments: {clock.segments} | Tick amount: {clock.tick_amount}</p>
            {clock.is_completed && <p className="text-green-400">This clock is completed.</p>}
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
              href={`/pilots/${clock.pilot_id}`}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
            >
              Cancel
            </Link>
          </div>
        </form>

        {/* Danger Zone */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-red-900">
          <h3 className="text-lg font-bold text-red-400 mb-4">Danger Zone</h3>
          <button
            onClick={handleDelete}
            disabled={saving || deleting}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium"
          >
            {deleting ? "Deleting..." : "Delete Clock"}
          </button>
        </div>
      </main>
    </div>
  );
}
