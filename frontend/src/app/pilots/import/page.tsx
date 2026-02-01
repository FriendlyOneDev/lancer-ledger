"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ImportPilotPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      setError("Please select a CSV file");
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Read first few lines for preview
    const text = await selectedFile.text();
    const lines = text.split("\n").slice(0, 5);
    setPreview(lines.join("\n"));
  };

  const handleImport = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the current session token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/pilots/import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Import failed");
      }

      const pilot = await response.json();
      router.push(`/pilots/${pilot.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
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
        <h2 className="text-2xl font-bold mb-6">Import Pilot from AL Log</h2>

        <div className="bg-gray-800 rounded-lg p-6 space-y-6">
          <div>
            <p className="text-gray-400 mb-4">
              Upload a CSV export from your Adventurers League log. This will
              create a new pilot with all their log entries and exotic gear.
            </p>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="csv-file"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              CSV File
            </label>
            <input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-500
                cursor-pointer"
            />
          </div>

          {preview && (
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">
                Preview (first 5 lines):
              </h3>
              <pre className="bg-gray-900 p-3 rounded text-xs text-gray-400 overflow-x-auto">
                {preview}
              </pre>
            </div>
          )}

          {file && (
            <div className="text-sm text-gray-400">
              Selected: <span className="text-white">{file.name}</span> (
              {(file.size / 1024).toFixed(1)} KB)
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleImport}
              disabled={!file || loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium"
            >
              {loading ? "Importing..." : "Import Pilot"}
            </button>
            <Link
              href="/dashboard"
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
            >
              Cancel
            </Link>
          </div>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <h3 className="font-medium text-gray-400 mb-2">What gets imported:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Pilot name and callsign</li>
            <li>License Level (parsed from log notes)</li>
            <li>Manna (from GP gained)</li>
            <li>Downtime (from downtime gained)</li>
            <li>All log entries (game and trade logs)</li>
            <li>Exotic gear (magic items)</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
