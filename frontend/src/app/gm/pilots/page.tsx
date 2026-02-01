"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface PilotWithOwner {
  id: string;
  name: string;
  callsign: string | null;
  license_level: number;
  ll_clock_progress: number;
  ll_clock_segments: number;
  manna: number;
  downtime: number;
  avatar_url: string | null;
  owner_name: string;
}

export default function GMPilotsPage() {
  const [pilots, setPilots] = useState<PilotWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchPilots = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setError("Not authenticated");
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiUrl}/gm/pilots`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 403) {
            setError("You don't have GM permissions");
          } else {
            throw new Error("Failed to fetch pilots");
          }
          return;
        }

        const data = await response.json();
        setPilots(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load pilots");
      } finally {
        setLoading(false);
      }
    };

    fetchPilots();
  }, [supabase]);

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
          <h2 className="text-2xl font-bold">All Pilots</h2>
          <div className="flex gap-2">
            <Link
              href="/gm/logs"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
            >
              View All Logs
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

        {loading ? (
          <p className="text-gray-400">Loading pilots...</p>
        ) : pilots.length === 0 ? (
          <p className="text-gray-400">No pilots found.</p>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Pilot</th>
                  <th className="px-4 py-3 text-left">Owner</th>
                  <th className="px-4 py-3 text-center">LL</th>
                  <th className="px-4 py-3 text-center">Progress</th>
                  <th className="px-4 py-3 text-center">Manna</th>
                  <th className="px-4 py-3 text-center">Downtime</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {pilots.map((pilot) => (
                  <tr key={pilot.id} className="hover:bg-gray-750">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {pilot.avatar_url && (
                          <img
                            src={pilot.avatar_url}
                            alt={pilot.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <div className="font-medium">{pilot.name}</div>
                          {pilot.callsign && (
                            <div className="text-sm text-gray-400">
                              &quot;{pilot.callsign}&quot;
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{pilot.owner_name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 bg-blue-600 text-sm rounded">
                        LL{pilot.license_level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      {pilot.ll_clock_progress}/{pilot.ll_clock_segments}
                    </td>
                    <td className="px-4 py-3 text-center">{pilot.manna}</td>
                    <td className="px-4 py-3 text-center">{pilot.downtime}</td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/pilots/${pilot.id}`}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
