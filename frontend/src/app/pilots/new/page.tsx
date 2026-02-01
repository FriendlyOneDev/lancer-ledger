"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function NewPilotPage() {
  const [name, setName] = useState("");
  const [callsign, setCallsign] = useState("");
  const [background, setBackground] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Pilot name is required");
      return;
    }

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

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/pilots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          callsign: callsign.trim() || null,
          background: background.trim() || null,
          avatar_url: avatarUrl.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to create pilot");
      }

      const pilot = await response.json();
      router.push(`/pilots/${pilot.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create pilot");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">TTRPG Ledger</h1>
          <Link href="/dashboard" className="text-gray-400 hover:text-white">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Create New Pilot</h2>

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
              placeholder="Enter pilot name"
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
              placeholder="Enter callsign (optional)"
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
              placeholder="Enter pilot background (optional)"
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

          <div className="text-sm text-gray-500">
            <p>New pilots start at License Level 2 with 0 Manna and 0 Downtime.</p>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium"
            >
              {loading ? "Creating..." : "Create Pilot"}
            </button>
            <Link
              href="/dashboard"
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
