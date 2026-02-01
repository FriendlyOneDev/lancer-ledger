"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Pilot } from "@/types/database";

interface EditPilotPageProps {
  params: Promise<{ id: string }>;
}

export default function EditPilotPage({ params }: EditPilotPageProps) {
  const [pilotId, setPilotId] = useState<string>("");
  const [name, setName] = useState("");
  const [callsign, setCallsign] = useState("");
  const [background, setBackground] = useState("");
  const [notes, setNotes] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    params.then((p) => setPilotId(p.id));
  }, [params]);

  useEffect(() => {
    if (!pilotId) return;

    const fetchPilot = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setError("Not authenticated");
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiUrl}/pilots/${pilotId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch pilot");
        }

        const pilot: Pilot = await response.json();
        setName(pilot.name);
        setCallsign(pilot.callsign || "");
        setBackground(pilot.background || "");
        setNotes(pilot.notes || "");
        setAvatarUrl(pilot.avatar_url || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load pilot");
      } finally {
        setLoading(false);
      }
    };

    fetchPilot();
  }, [pilotId, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Pilot name is required");
      return;
    }

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
      const response = await fetch(`${apiUrl}/pilots/${pilotId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          callsign: callsign.trim() || null,
          background: background.trim() || null,
          notes: notes.trim() || null,
          avatar_url: avatarUrl.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to update pilot");
      }

      router.push(`/pilots/${pilotId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update pilot");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this pilot? This action cannot be undone.")) {
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
      const response = await fetch(`${apiUrl}/pilots/${pilotId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to delete pilot");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete pilot");
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
        <h2 className="text-2xl font-bold mb-6">Edit Pilot</h2>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 space-y-6">
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Pilot Name *
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
            <label htmlFor="callsign" className="block text-sm font-medium text-gray-300 mb-2">
              Callsign
            </label>
            <input
              id="callsign"
              type="text"
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="background" className="block text-sm font-medium text-gray-300 mb-2">
              Background
            </label>
            <textarea
              id="background"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="avatar" className="block text-sm font-medium text-gray-300 mb-2">
              Avatar URL
            </label>
            <input
              id="avatar"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/avatar.png"
            />
            {avatarUrl && (
              <div className="mt-2">
                <img
                  src={avatarUrl}
                  alt="Avatar preview"
                  className="w-16 h-16 rounded-lg object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
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
              href={`/pilots/${pilotId}`}
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
            Deleting a pilot will permanently remove all their data including logs, clocks, gear, and reputation.
          </p>
          <button
            onClick={handleDelete}
            disabled={saving || deleting}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium"
          >
            {deleting ? "Deleting..." : "Delete Pilot"}
          </button>
        </div>
      </main>
    </div>
  );
}
