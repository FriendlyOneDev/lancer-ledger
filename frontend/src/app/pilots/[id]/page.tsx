import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import ClockWidget from "@/components/ClockWidget";
import ClockTickControls from "@/components/ClockTickControls";
import LLClockDisplay from "@/components/LLClockDisplay";
import type {
  Pilot,
  Clock,
  ExoticGear,
  LogEntry,
} from "@/types/database";

interface PilotPageProps {
  params: Promise<{ id: string }>;
}

export default async function PilotPage({ params }: PilotPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get pilot data
  const { data: pilotData, error: pilotError } = await supabase
    .from("pilots")
    .select("*")
    .eq("id", id)
    .single();

  if (pilotError || !pilotData) {
    notFound();
  }

  const pilot = pilotData as Pilot;

  // Check ownership (allow if owner or GM)
  const { data: profileData } = await supabase
    .from("users")
    .select("is_gm")
    .eq("id", user.id)
    .single();

  const profile = profileData as { is_gm: boolean } | null;

  if (pilot.user_id !== user.id && !profile?.is_gm) {
    notFound();
  }

  // Get pilot's clocks
  const { data: clocksData } = await supabase
    .from("clocks")
    .select("*")
    .eq("pilot_id", id)
    .order("created_at", { ascending: false });

  const clocks = clocksData as Clock[] | null;

  // Get pilot's exotic gear (only active gear, not lost)
  const { data: gearData } = await supabase
    .from("exotic_gear")
    .select("*")
    .eq("pilot_id", id)
    .is("lost_log_id", null)
    .order("created_at", { ascending: false });

  const gear = gearData as ExoticGear[] | null;

  // Get pilot's corporation reputation (aggregated from reputation_changes)
  const { data: reputationData } = await supabase
    .from("pilot_reputation")
    .select("*")
    .eq("pilot_id", id);

  const reputation = reputationData as
    | { pilot_id: string; corporation_id: string; corporation_name: string; reputation_value: number }[]
    | null;

  // Get pilot's log entries (most recent first)
  const { data: logsData } = await supabase
    .from("log_entries")
    .select("*")
    .eq("pilot_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const logs = logsData as LogEntry[] | null;

  // LL clock progress is displayed per-level by LLClockDisplay

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

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Pilot Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex gap-4">
              {pilot.avatar_url && (
                <img
                  src={pilot.avatar_url}
                  alt={pilot.name}
                  className="w-24 h-24 rounded-lg object-cover"
                />
              )}
              <div>
                <h2 className="text-3xl font-bold">{pilot.name}</h2>
                {pilot.callsign && (
                  <p className="text-xl text-gray-400">
                    &quot;{pilot.callsign}&quot;
                  </p>
                )}
                {pilot.background && (
                  <p className="text-gray-500 mt-2">{pilot.background}</p>
                )}
              </div>
            </div>
            <div className="text-right flex flex-col gap-2 items-end">
              <span className="px-4 py-2 bg-blue-600 text-lg font-bold rounded">
                LL{pilot.license_level}
              </span>
              {pilot.user_id === user.id && (
                <Link
                  href={`/pilots/${id}/edit`}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                >
                  Edit Pilot
                </Link>
              )}
            </div>
          </div>

          {/* LL Clock */}
          <div className="mt-6 flex justify-center">
            <LLClockDisplay
              licenseLevel={pilot.license_level}
              progress={pilot.ll_clock_progress}
            />
          </div>

          {/* Resources */}
          <div className="mt-6 grid grid-cols-2 gap-4 text-center">
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Manna</p>
              <p className="text-2xl font-bold">{pilot.manna}</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Downtime</p>
              <p className="text-2xl font-bold">{pilot.downtime}</p>
            </div>
          </div>
        </div>

        {/* Personal Clocks */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Personal Clocks</h3>
            <Link
              href={`/pilots/${id}/clocks/new`}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm"
            >
              Add Clock
            </Link>
          </div>
          {clocks && clocks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clocks.map((clock) => (
                <div
                  key={clock.id}
                  className={`bg-gray-700 rounded-lg p-4 ${
                    clock.is_completed ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">{clock.name}</span>
                    <div className="flex items-center gap-2">
                      {clock.is_completed && (
                        <span className="px-2 py-0.5 bg-green-600 text-xs rounded">
                          Complete
                        </span>
                      )}
                      {pilot.user_id === user.id && (
                        <Link
                          href={`/clocks/${clock.id}/edit`}
                          className="px-2 py-0.5 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                        >
                          Edit
                        </Link>
                      )}
                    </div>
                  </div>
                  {pilot.user_id === user.id ? (
                    <ClockTickControls
                      clockId={clock.id}
                      name={clock.name}
                      filled={clock.filled}
                      segments={clock.segments}
                      isCompleted={clock.is_completed}
                    />
                  ) : (
                    <ClockWidget
                      filled={clock.filled}
                      total={clock.segments}
                      label=""
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              No personal clocks yet.
            </p>
          )}
        </div>

        {/* Corporation Reputation */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Corporation Reputation</h3>
            <p className="text-sm text-gray-500">
              Managed through log entries
            </p>
          </div>
          {reputation && reputation.length > 0 ? (
            <div className="space-y-2">
              {reputation.map((rep) => (
                <div
                  key={rep.corporation_id}
                  className="flex justify-between items-center bg-gray-700 rounded-lg p-3"
                >
                  <span>{rep.corporation_name}</span>
                  <span
                    className={`font-bold ${
                      rep.reputation_value > 0
                        ? "text-green-400"
                        : rep.reputation_value < 0
                          ? "text-red-400"
                          : "text-gray-400"
                    }`}
                  >
                    {rep.reputation_value > 0 ? "+" : ""}
                    {rep.reputation_value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              No corporation reputation yet.
            </p>
          )}
        </div>

        {/* Exotic Gear */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Exotic Gear</h3>
            <p className="text-sm text-gray-500">
              Acquired/lost through log entries
            </p>
          </div>
          {gear && gear.length > 0 ? (
            <div className="space-y-2">
              {gear.map((item) => (
                <div key={item.id} className="bg-gray-700 rounded-lg p-3">
                  <div className="font-medium">{item.name}</div>
                  {item.description && (
                    <div className="text-sm text-gray-400">
                      {item.description}
                    </div>
                  )}
                  {item.notes && (
                    <div className="text-sm text-gray-500 mt-1">
                      {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              No exotic gear yet.
            </p>
          )}
        </div>

        {/* Recent Logs */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Recent Logs</h3>
            <div className="flex gap-2">
              <Link
                href={`/pilots/${id}/logs/new?type=game`}
                className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm"
              >
                Game Log
              </Link>
              <Link
                href={`/pilots/${id}/logs/new?type=trade`}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-sm"
              >
                Trade Log
              </Link>
            </div>
          </div>
          {logs && logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="bg-gray-700 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span
                        className={`px-2 py-0.5 text-xs rounded ${
                          log.log_type === "game"
                            ? "bg-green-600"
                            : "bg-purple-600"
                        }`}
                      >
                        {log.log_type === "game" ? "Game" : "Trade"}
                      </span>
                      <span className="ml-2 text-sm text-gray-400">
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {log.manna_change !== 0 && (
                        <span
                          className={
                            log.manna_change > 0
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {log.manna_change > 0 ? "+" : ""}
                          {log.manna_change} Manna
                        </span>
                      )}
                      {log.downtime_change !== 0 && (
                        <span
                          className={
                            log.downtime_change > 0
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {log.downtime_change > 0 ? "+" : ""}
                          {log.downtime_change} DT
                        </span>
                      )}
                      {pilot.user_id === user.id && (
                        <Link
                          href={`/logs/${log.id}/edit`}
                          className="px-2 py-0.5 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                        >
                          Edit
                        </Link>
                      )}
                    </div>
                  </div>
                  {log.description && (
                    <p className="text-gray-300 mt-2 text-sm">
                      {log.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No logs yet.</p>
          )}
        </div>

        {/* Pilot Notes */}
        {pilot.notes && (
          <div className="bg-gray-800 rounded-lg p-6 mt-6">
            <h3 className="text-xl font-bold mb-4">Notes</h3>
            <p className="text-gray-300 whitespace-pre-wrap">{pilot.notes}</p>
          </div>
        )}
      </main>
    </div>
  );
}
