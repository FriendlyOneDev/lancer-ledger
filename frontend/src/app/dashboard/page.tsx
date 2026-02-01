import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  // Debug: log if profile fetch failed
  if (profileError) {
    console.error("Profile fetch error:", profileError);
  }

  // Get user's pilots
  const { data: pilots } = await supabase
    .from("pilots")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const handleSignOut = async () => {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">TTRPG Ledger</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">
              {profile?.display_name || profile?.discord_username || "Pilot"}
              {profile?.is_gm && (
                <span className="ml-2 px-2 py-1 bg-yellow-600 text-xs rounded">
                  GM
                </span>
              )}
            </span>
            <form action={handleSignOut}>
              <button
                type="submit"
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Your Pilots</h2>
          <div className="flex gap-2">
            <Link
              href="/pilots/import"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
            >
              Import from AL Log
            </Link>
            <Link
              href="/pilots/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"
            >
              Create Pilot
            </Link>
          </div>
        </div>

        {pilots && pilots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pilots.map((pilot) => (
              <Link
                key={pilot.id}
                href={`/pilots/${pilot.id}`}
                className="block p-6 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{pilot.name}</h3>
                    {pilot.callsign && (
                      <p className="text-gray-400">&quot;{pilot.callsign}&quot;</p>
                    )}
                  </div>
                  <span className="px-2 py-1 bg-blue-600 text-sm rounded">
                    LL{pilot.license_level}
                  </span>
                </div>
                <div className="mt-4 flex gap-4 text-sm text-gray-400">
                  <span>Manna: {pilot.manna}</span>
                  <span>Downtime: {pilot.downtime}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400 mb-4">
              You don&apos;t have any pilots yet.
            </p>
            <Link
              href="/pilots/new"
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"
            >
              Create Your First Pilot
            </Link>
          </div>
        )}

        {profile?.is_gm && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">GM Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/gm/pilots"
                className="p-4 bg-gray-800 rounded-lg hover:bg-gray-750 text-center"
              >
                View All Pilots
              </Link>
              <Link
                href="/gm/logs"
                className="p-4 bg-gray-800 rounded-lg hover:bg-gray-750 text-center"
              >
                View All Logs
              </Link>
              <Link
                href="/gm/corporations"
                className="p-4 bg-gray-800 rounded-lg hover:bg-gray-750 text-center"
              >
                Manage Corporations
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
