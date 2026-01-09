import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Swords, Edit } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EloChart } from "@/components/EloChart";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { ChallengeButton } from "@/components/ChallengeButton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { getRank, getTitles } from "@/lib/titles";
import { PlayerNameDisplay } from "@/components/PlayerNameDisplay";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function PlayerProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Fetch Player Info
  const { data: player } = await supabase
    .from("Player")
    .select("*")
    .eq("id", id)
    .single();

  if (!player) return notFound();

  // Fetch Match History
  const { data: matches } = await supabase
    .from("Match")
    .select(
      `
            *,
            player1:player1Id(name),
            player2:player2Id(name)
        `
    )
    .or(`player1Id.eq.${id},player2Id.eq.${id}`)
    .in("status", ["APPROVED", "CANCELLED"])
    .order("createdAt", { ascending: false })
    .limit(20);

  // Fetch actual total matches count (to include draws)
  const { count: realTotalMatches } = await supabase
    .from("Match")
    .select("*", { count: "exact", head: true })
    .or(`player1Id.eq.${id},player2Id.eq.${id}`)
    .eq("status", "APPROVED");

  const totalMatches = realTotalMatches || player.wins + player.losses;
  const draws = Math.max(0, totalMatches - (player.wins + player.losses));
  const winRate =
    totalMatches > 0 ? Math.round((player.wins / totalMatches) * 100) : 0;

  // Calculate ELO History
  let currentElo = player.elo;
  const eloHistory = [{ date: "Now", elo: currentElo }];

  // Work backwards
  matches?.forEach((match: any) => {
    const isP1 = match.player1Id === id;
    const eloChange = isP1 ? match.eloDelta1 : match.eloDelta2;

    // ELO before this match = Current ELO - Change
    // Example: Now 1200, Match +20 => Before was 1180
    const previousElo = currentElo - eloChange;

    eloHistory.push({
      date: new Date(match.createdAt).toLocaleDateString(),
      elo: previousElo, // This becomes the "current" for the next iteration step backwards?
      // Wait, no. We are stepping back in time.
      // Match N (Latest): Elo After = 1200. Elo Change = +20. Elo Before = 1180.
      // Match N-1: Elo After = 1180. Elo Change = -10. Elo Before = 1190.
    });
    currentElo = previousElo;
  });

  // Remove the last "Now" entry if we have matches, because we want the history timeline.
  // Actually, "Now" is a valid point.
  // But the loop generates "Elo BEFORE match".
  // So the array serves as points: [Latest ELO, ELO before Match 1, ELO before Match 2...]

  // Let's refine for the chart.
  // We want chronological: Match 1 End -> Match 2 End -> Match 3 End ... -> Current.

  // Let's reconstruct chronologically.
  // 1. Get ALL matches (or limit 100) sorted OLD to NEW.
  // But we only fetched limit 20 DESC.
  // If we only have recent 20 matches, we can only trace back 20 steps.
  // The "start" of the chart will be "ELO 20 matches ago".

  // Correct logic with partial history:
  // 1. Start from Current Player ELO.
  // 2. Iterate backwards through recent matches.
  // 3. Store points.

  // Verify Identity
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwnProfile = user?.email === player.email;

  // Compute Rank & Titles
  const currentRank = getRank(player.elo);
  const earnedTitles = getTitles({
    matches: totalMatches,
    wins: player.wins,
    winRate: winRate,
  });

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-8">
      <Link
        href="/"
        className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Link>

      {/* Profile Header */}
      <div className="flex flex-col items-center justify-center space-y-4 pt-8">
        <div className="relative">
          <Avatar className="w-32 h-32 border-4 border-primary/20">
            <AvatarFallback className="text-4xl font-bold bg-secondary text-secondary-foreground">
              {player.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {/* Rank Badge Absolute */}
          <div
            className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full border ${currentRank.borderColor} ${currentRank.bgColor} ${currentRank.color} text-[10px] font-black uppercase tracking-widest bg-black shadow-lg whitespace-nowrap`}
          >
            {currentRank.name}
          </div>
        </div>

        <div className="text-center space-y-2 mt-4">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight flex flex-col md:flex-row justify-center items-center gap-2 md:gap-4">
            <PlayerNameDisplay name={player.name} nickname={player.nickname} />
          </h1>

          <div className="flex items-center justify-center gap-4">
            <Badge
              variant="outline"
              className="text-lg px-4 py-1 border-primary/50 text-primary font-mono"
            >
              ELO: {player.elo}
            </Badge>
            {isOwnProfile && <EditProfileDialog player={player} />}
            {!isOwnProfile && <ChallengeButton player={player} />}
          </div>

          {/* Titles List */}
          {earnedTitles.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-2 max-w-md mx-auto">
              {earnedTitles.map((t, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 ${t.color} text-xs font-bold uppercase tracking-wider shadow-sm hover:scale-105 transition-transform cursor-help`}
                  title={t.name}
                >
                  <span>{t.icon}</span>
                  <span>{t.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <Card className="bg-card/50 border-primary/20">
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center p-6">
          <div className="p-4 bg-background/50 rounded-lg">
            <div className="text-3xl font-bold">{totalMatches}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Matches
            </div>
          </div>
          <div className="p-4 bg-background/50 rounded-lg">
            <div className="text-3xl font-bold text-green-500">
              {player.wins}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Wins
            </div>
          </div>
          <div className="p-4 bg-background/50 rounded-lg">
            <div className="text-3xl font-bold text-zinc-400">{draws}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Draws
            </div>
          </div>
          <div className="p-4 bg-background/50 rounded-lg">
            <div className="text-3xl font-bold text-yellow-500">{winRate}%</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Win Rate
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ELO Chart */}
      <EloChart data={eloHistory} />

      {/* Match History */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="uppercase tracking-wider">
            Match History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">RESULT</TableHead>
                <TableHead className="font-bold">OPPONENT</TableHead>
                <TableHead className="text-center font-bold">SCORE</TableHead>
                <TableHead className="text-right font-bold">
                  ELO CHANGE
                </TableHead>
                <TableHead className="text-right font-bold">DATE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches?.map((match) => {
                const isP1 = match.player1Id === id;
                const opponentName = isP1
                  ? match.player2.name
                  : match.player1.name;
                const myScore = isP1 ? match.player1Score : match.player2Score;
                const oppScore = isP1 ? match.player2Score : match.player1Score;
                const isWin = myScore > oppScore;
                const isDraw = myScore === oppScore;
                const isCancelled = match.status === "CANCELLED";
                const eloChange = isP1 ? match.eloDelta1 : match.eloDelta2;

                return (
                  <TableRow key={match.id} className="hover:bg-muted/50">
                    <TableCell>
                      {isCancelled ? (
                        <Badge
                          variant="outline"
                          className="border-red-900 bg-red-950 text-red-500"
                        >
                          CANCELLED
                        </Badge>
                      ) : isDraw ? (
                        <Badge
                          variant="secondary"
                          className="bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                        >
                          DRAW
                        </Badge>
                      ) : (
                        <Badge
                          variant={isWin ? "default" : "secondary"}
                          className={
                            isWin
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-red-900/50 text-red-200"
                          }
                        >
                          {isWin ? "VICTORY" : "DEFEAT"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-lg">
                      <div className="flex items-center gap-2">
                        {opponentName}
                        <Link
                          href={`/compare?player1=${id}&player2=${
                            isP1 ? match.player2Id : match.player1Id
                          }`}
                          className="ml-2 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                          title="Compare Head-to-Head"
                        >
                          <Swords className="w-4 h-4" />
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xl">
                      {isCancelled ? (
                        <span className="text-muted-foreground text-sm">
                          --
                        </span>
                      ) : (
                        <>
                          <span
                            className={
                              isDraw
                                ? "text-muted-foreground"
                                : isWin
                                ? "text-green-500"
                                : "text-red-500"
                            }
                          >
                            {myScore}
                          </span>
                          <span className="text-muted-foreground mx-2">-</span>
                          <span
                            className={
                              isDraw
                                ? "text-muted-foreground"
                                : !isWin
                                ? "text-green-500"
                                : "text-red-500"
                            }
                          >
                            {oppScore}
                          </span>
                        </>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-lg">
                      {eloChange > 0 ? (
                        <span className="text-green-500">+{eloChange}</span>
                      ) : eloChange < 0 ? (
                        <span className="text-red-500">{eloChange}</span>
                      ) : (
                        <span className="text-muted-foreground">
                          {eloChange}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {new Date(match.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!matches || matches.length === 0) && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No matches recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
