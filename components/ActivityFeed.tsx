"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Trash2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initializeLiveMatch } from "@/app/actions";
import { CancelMatchDialog } from "./CancelMatchDialog";

interface MatchActivity {
  id: string;
  player1: { id: string; name: string };
  player2: { id: string; name: string };
  player1Score: number;
  player2Score: number;
  winnerId: string | null;
  eloDelta1: number;
  eloDelta2: number;
  createdAt: string;
  status: string;
  scheduled_time: string;
  message?: string;
}

function getFlavorText(p1Score: number, p2Score: number, eloDiff: number) {
  const scoreDiff = Math.abs(p1Score - p2Score);

  if (scoreDiff === 0) return "Bất phân thắng bại! Kèo căng!";
  if (scoreDiff === 1) return "Chiến thắng sát nút! Thót tim!";
  if (scoreDiff >= 5) return "Hủy diệt hoàn toàn! Out trình!";
  if (Math.abs(eloDiff) > 20) return "Địa chấn đã xảy ra! Lật kèo ngoạn mục!";

  const phrases = [
    "Một trận đấu kịch tính!",
    "Kẻ tám lạng, người nửa cân.",
    "Chiến thắng xứng đáng.",
    "Phong độ hủy diệt.",
    "Không thể cản phá!",
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

export function ActivityFeed({
  matches,
  upcoming,
  live,
  currentUserId,
}: {
  matches: MatchActivity[];
  upcoming?: any[];
  live?: any[];
  currentUserId?: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("activity_feed_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Match" },
        () => {
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Challenge" },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, supabase]);

  return (
    <Card className="border-border bg-card/50 flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
          <Activity className="w-5 h-5 animate-pulse text-green-500" />
          Live Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ScrollArea className="pr-4">
          <div className="space-y-4">
            {/* LIVE Matches Section */}
            {live && live.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-green-500 uppercase tracking-widest mb-3 flex items-center gap-2 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  HAPPENING NOW
                </h3>
                <div className="space-y-3">
                  {live.map((match: any) => {
                    const isParticipant =
                      currentUserId &&
                      (currentUserId === match.player1.id ||
                        currentUserId === match.player2.id ||
                        currentUserId === match.player1Id ||
                        currentUserId === match.player2Id);

                    return (
                      <div key={match.id} className="relative group">
                        <Link href={`/live/${match.id}`} className="block">
                          <div className="bg-green-950/20 border border-green-500/30 p-3 rounded text-sm relative overflow-hidden font-mono group-hover:bg-green-950/40 transition-all shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 animate-pulse" />
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-green-400">
                                {match.player1.name}
                              </span>
                              <span className="text-xs text-green-500/70 font-mono border border-green-500/30 px-1 rounded">
                                LIVE
                              </span>
                              <span className="font-bold text-green-400">
                                {match.player2.name}
                              </span>
                            </div>
                            <div className="flex justify-center items-center gap-4 text-2xl font-bold text-white">
                              <span>{match.player1Score}</span>
                              <span className="text-sm text-muted-foreground">
                                -
                              </span>
                              <span>{match.player2Score}</span>
                            </div>
                          </div>
                        </Link>

                        {isParticipant && (
                          <div className="absolute top-1 right-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                            <CancelMatchDialog
                              matchId={match.id}
                              trigger={
                                <div className="p-1.5 bg-black/50 hover:bg-red-500/20 text-zinc-400 hover:text-red-500 rounded-full cursor-pointer backdrop-blur-sm border border-white/5 transition-colors">
                                  <Trash2 className="w-3 h-3" />
                                </div>
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="my-4 border-t border-zinc-800 border-dashed" />
              </div>
            )}

            {/* Upcoming Section */}
            {upcoming && upcoming.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  Coming Soon
                </h3>
                <div className="space-y-3">
                  {upcoming.map((match: any) => {
                    const isParticipant =
                      currentUserId &&
                      (currentUserId === match.challengerId ||
                        currentUserId === match.opponentId);

                    return (
                      <button
                        key={match.id}
                        onClick={() => initializeLiveMatch(match.id)}
                        className="w-full text-left cursor-pointer group block"
                      >
                        <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded text-sm relative overflow-hidden font-mono group-hover:border-primary/50 transition-colors">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-red-500" />
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-blue-400">
                              {match.challenger.name}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              VS
                            </span>
                            <span className="font-bold text-red-400">
                              {match.opponent.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              ⏰{" "}
                              {new Date(match.scheduled_time).toLocaleString(
                                "vi-VN",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  day: "2-digit",
                                  month: "2-digit",
                                  timeZone: "Asia/Ho_Chi_Minh",
                                }
                              )}
                            </span>
                          </div>
                          {match.message && (
                            <p className="text-xs italic text-yellow-500/70 mt-1">
                              &quot;{match.message}&quot;
                            </p>
                          )}
                          {isParticipant && (
                            <div className="absolute top-1 right-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                              <CancelMatchDialog
                                matchId={match.id}
                                trigger={
                                  <div className="p-1.5 bg-black/50 hover:bg-red-500/20 text-zinc-400 hover:text-red-500 rounded-full cursor-pointer backdrop-blur-sm border border-white/5 transition-colors">
                                    <Trash2 className="w-3 h-3" />
                                  </div>
                                }
                              />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="my-4 border-t border-zinc-800 border-dashed" />
              </div>
            )}

            {/* Recent Results */}
            {matches.map((match) => {
              const isDraw = match.player1Score === match.player2Score;
              const isP1Win = match.player1Score > match.player2Score;

              let winner = match.player1;
              let loser = match.player2;
              let winnerDelta = match.eloDelta1;

              if (isP1Win) {
                winner = match.player1;
                loser = match.player2;
                winnerDelta = match.eloDelta1;
              } else if (!isDraw) {
                winner = match.player2;
                loser = match.player1;
                winnerDelta = match.eloDelta2;
              }

              const flavor = getFlavorText(
                match.player1Score,
                match.player2Score,
                match.eloDelta1
              ); // Use absolute delta doesn't matter much for flavor logic

              return (
                <div
                  key={match.id}
                  className="border-l-2 border-primary/20 pl-4 py-1 relative font-mono"
                >
                  <div
                    className={`absolute -left-[5px] top-2 w-2 h-2 rounded-full ${
                      isDraw ? "bg-yellow-500/50" : "bg-primary/50"
                    }`}
                  />
                  <p className="text-xs text-muted-foreground font-mono mb-1">
                    {new Date(match.createdAt).toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}
                  </p>

                  {isDraw ? (
                    <div className="text-sm">
                      <Link
                        href={`/player/${match.player1.id}`}
                        className="font-bold text-foreground hover:underline"
                      >
                        {match.player1.name}
                      </Link>
                      <span className="text-muted-foreground mx-1">
                        drew with
                      </span>
                      <Link
                        href={`/player/${match.player2.id}`}
                        className="font-bold text-foreground hover:underline"
                      >
                        {match.player2.name}
                      </Link>
                    </div>
                  ) : (
                    <div className="text-sm">
                      <Link
                        href={`/player/${winner.id}`}
                        className="font-bold text-primary hover:underline"
                      >
                        {winner.name}
                      </Link>
                      <span className="text-muted-foreground mx-1">def.</span>
                      <Link
                        href={`/player/${loser.id}`}
                        className="font-bold text-muted-foreground hover:underline"
                      >
                        {loser.name}
                      </Link>
                    </div>
                  )}

                  <div className="font-mono text-sm font-bold mt-1">
                    {match.player1Score} - {match.player2Score}
                    {!isDraw && winnerDelta > 0 && (
                      <span className="text-green-500 ml-2">
                        (+{winnerDelta} ELO)
                      </span>
                    )}
                    {isDraw && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({match.eloDelta1 > 0 ? "+" : ""}
                        {match.eloDelta1}/{match.eloDelta2 > 0 ? "+" : ""}
                        {match.eloDelta2})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-yellow-500/80 italic mt-1 font-mono">
                    &quot;{flavor}&quot;
                  </p>
                </div>
              );
            })}
            {matches.length === 0 &&
              (!live || live.length === 0) &&
              (!upcoming || upcoming.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  No data found.
                </p>
              )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
