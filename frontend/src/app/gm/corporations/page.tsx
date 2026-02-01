"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Corporation } from "@/types/database";

export default function GMCorporationsPage() {
  const [corporations, setCorporations] = useState<Corporation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCorpName, setNewCorpName] = useState("");
  const [newCorpDesc, setNewCorpDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const supabase = createClient();

  const fetchCorporations = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Not authenticated");
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/corporations`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch corporations");
      }

      const data = await response.json();
      setCorporations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load corporations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorporations();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCorpName.trim()) return;

    setCreating(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("Not authenticated");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/corporations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: newCorpName.trim(),
          description: newCorpDesc.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to create corporation");
      }

      setNewCorpName("");
      setNewCorpDesc("");
      fetchCorporations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create corporation");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (corpId: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("Not authenticated");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/corporations/${corpId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to update corporation");
      }

      setEditingId(null);
      fetchCorporations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update corporation");
    }
  };

  const handleDelete = async (corpId: string) => {
    if (!confirm("Are you sure you want to delete this corporation?")) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("Not authenticated");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/corporations/${corpId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to delete corporation");
      }

      fetchCorporations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete corporation");
    }
  };

  const startEditing = (corp: Corporation) => {
    setEditingId(corp.id);
    setEditName(corp.name);
    setEditDesc(corp.description || "");
  };

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

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Manage Corporations</h2>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Add New Corporation */}
        <form onSubmit={handleCreate} className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Add New Corporation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                Name *
              </label>
              <input
                id="name"
                type="text"
                value={newCorpName}
                onChange={(e) => setNewCorpName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Corporation name"
                required
              />
            </div>
            <div>
              <label htmlFor="desc" className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <input
                id="desc"
                type="text"
                value={newCorpDesc}
                onChange={(e) => setNewCorpDesc(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Optional description"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={creating || !newCorpName.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded-lg font-medium"
          >
            {creating ? "Adding..." : "Add Corporation"}
          </button>
        </form>

        {/* Corporation List */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Existing Corporations</h3>
          {loading ? (
            <p className="text-gray-400">Loading...</p>
          ) : corporations.length === 0 ? (
            <p className="text-gray-400">No corporations yet. Add one above.</p>
          ) : (
            <div className="space-y-3">
              {corporations.map((corp) => (
                <div key={corp.id} className="bg-gray-700 rounded-lg p-4">
                  {editingId === corp.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded"
                      />
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded"
                        placeholder="Description"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(corp.id)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{corp.name}</div>
                        {corp.description && (
                          <div className="text-sm text-gray-400">{corp.description}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditing(corp)}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(corp.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
