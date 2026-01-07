// Imports at top
import { Trash2 } from "lucide-react";
import { CancelMatchDialog } from "./CancelMatchDialog";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Badge } from "./ui/badge";

export function LiveMatches() {
  const [matches, setMatches] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();

    const fetchLiveMatches = async () => {
      const { data } = await supabase
        .from("Match")
        .select(
          `
                    *,
                    player1:player1Id(name, email),
                    player2:player2Id(name, email)
                `
        )
        .eq("status", "LIVE");

      if (data) setMatches(data);
    };

    fetchLiveMatches();

    const channel = supabase
      .channel("live-matches")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Match",
          filter: "status=eq.LIVE",
        },
        () => {
          fetchLiveMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (matches.length === 0) return null;

  return (
    <div className="mb-8 space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2 text-white">
        <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        ĐANG DIỄN RA
      </h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {matches.map((match) => {
          const isParticipant =
            user &&
            (user.id === match.player1Id ||
              user.id === match.player2Id ||
              (match.player1 && user.email === match.player1.email) ||
              (match.player2 && user.email === match.player2.email));

          return (
            <div key={match.id} className="relative group">
              <Link href={`/live/${match.id}`}>
                <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl hover:border-red-500/50 transition-all cursor-pointer relative overflow-hidden h-full">
                  <div className="absolute inset-0 bg-linear-to-r from-blue-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex justify-between items-center relative z-10">
                    <div className="text-center flex-1">
                      <div className="font-bold text-lg text-blue-400 truncate">
                        {match.player1.name}
                      </div>
                    </div>

                    <div className="px-4 flex flex-col items-center">
                      <div className="text-2xl font-handjet font-bold tracking-widest bg-black/50 px-3 py-1 rounded border border-zinc-700">
                        {match.player1Score} - {match.player2Score}
                      </div>
                      <Badge
                        variant="outline"
                        className="mt-2 text-[10px] border-red-500/50 text-red-500 animate-pulse"
                      >
                        LIVE
                      </Badge>
                    </div>

                    <div className="text-center flex-1">
                      <div className="font-bold text-lg text-red-400 truncate">
                        {match.player2.name}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Cancel Button Overlay */}
              {isParticipant && (
                <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CancelMatchDialog
                    matchId={match.id}
                    trigger={
                      <div className="p-2 bg-black/50 hover:bg-red-500/20 text-zinc-400 hover:text-red-500 rounded-full cursor-pointer backdrop-blur-sm border border-white/5 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </div>
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
