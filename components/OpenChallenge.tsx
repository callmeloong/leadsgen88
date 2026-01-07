"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Zap, Swords, Clock, User } from "lucide-react";
import { issueOpenChallenge, acceptOpenChallenge } from "@/app/actions";
import { useRouter } from "next/navigation";

export function OpenChallengeButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [gameType, setGameType] = useState("8 Ball");
  const [raceTo, setRaceTo] = useState(0);
  const [handicap, setHandicap] = useState(0);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const formattedTime = scheduledTime
        ? new Date(scheduledTime).toISOString()
        : undefined;
      const result = await issueOpenChallenge(
        message,
        formattedTime,
        gameType,
        raceTo,
        handicap
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã tung kèo thơm thành công!");
        setOpen(false);
        setMessage("");
        setScheduledTime("");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          className="font-bold uppercase tracking-wider gap-2 animate-pulse hover:animate-none"
        >
          <Zap className="w-4 h-4" />
          Gạ kèo thơm
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] font-mono">
        <DialogHeader>
          <DialogTitle className="uppercase flex items-center gap-2 text-destructive">
            <Swords className="w-6 h-6" />
            Tung Kèo Thơm (Open Challenge)
          </DialogTitle>
          <DialogDescription>
            Tạo một lời thách đấu mở. Bất kỳ ai cũng có thể nhận kèo này! Ai
            nhanh tay người đó được.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="message">Lời nhắn (Gáy)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ai ngon nhào vô..."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="scheduledTime">Thời gian (Tùy chọn)</Label>
            <Input
              id="scheduledTime"
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="[color-scheme:dark]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Thể thức</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={gameType}
                onChange={(e) => setGameType(e.target.value)}
              >
                <option value="8 Ball">8 Ball</option>
                <option value="9 Ball">9 Ball</option>
                <option value="10 Ball">10 Ball</option>
                <option value="15 Ball (Rotation)">15 Ball</option>
                <option value="Bida Lỗ (Chung)">Bida Lỗ</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Chạm (Race)</Label>
              <Input
                type="number"
                placeholder="0 = Tự do"
                value={raceTo}
                onChange={(e) => setRaceTo(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Chấp (Handicap)</Label>
            <Input
              type="number"
              placeholder="Số ván chấp..."
              value={handicap}
              onChange={(e) => setHandicap(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              *Đối thủ sẽ được cộng sẵn {handicap > 0 ? handicap : 0} điểm.
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "Đang tạo..." : "TUNG CHIÊU NGAY"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function OpenChallengeList({
  challenges,
  currentUserId,
}: {
  challenges: any[];
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleAccept = async (challengeId: string) => {
    if (!confirm("Bạn có chắc muốn nhận kèo này không?")) return;

    startTransition(async () => {
      const result = await acceptOpenChallenge(challengeId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã nhận kèo thành công! Chiến thôi!");
        // Optimistic update or wait for revalidatePath is enough usually, but router.refresh helps
        router.refresh();
      }
    });
  };

  if (!challenges || challenges.length === 0) return null;

  return (
    <Card className="border-destructive/50 bg-destructive/5 mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive uppercase tracking-wider">
          <Zap className="w-6 h-6" />
          Kèo Thơm Đang Chờ (Open Challenges)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {challenges.map((challenge) => (
            <div
              key={challenge.id}
              className="bg-background/80 border border-destructive/30 p-4 rounded-lg shadow-[0_0_10px_rgba(239,68,68,0.1)] relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Swords className="w-24 h-24 rotate-12" />
              </div>

              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center border border-destructive/50 text-destructive font-black">
                    {challenge.challenger.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-lg uppercase">
                      {challenge.challenger.name}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(challenge.createdAt).toLocaleString()}
                    </div>

                    <div className="mt-1 flex flex-wrap gap-1">
                      {challenge.game_type && (
                        <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold border border-primary/30">
                          {challenge.game_type}
                        </span>
                      )}
                      {challenge.race_to > 0 && (
                        <span className="bg-orange-500/20 text-orange-500 px-1.5 py-0.5 rounded text-[10px] font-bold border border-orange-500/30">
                          Chạm {challenge.race_to}
                        </span>
                      )}
                      {challenge.handicap > 0 && (
                        <span className="bg-purple-500/20 text-purple-500 px-1.5 py-0.5 rounded text-[10px] font-bold border border-purple-500/30">
                          Chấp {challenge.handicap}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {challenge.message && (
                  <div className="bg-muted p-2 rounded text-sm italic border-l-2 border-destructive">
                    "{challenge.message}"
                  </div>
                )}

                {challenge.scheduled_time ? (
                  <div className="text-sm flex items-center gap-2 text-destructive">
                    <Clock className="w-4 h-4" />
                    Scheduled:{" "}
                    {new Date(challenge.scheduled_time).toLocaleString()}
                  </div>
                ) : (
                  <div className="text-sm flex items-center gap-2 text-green-500 font-bold animate-pulse">
                    <Clock className="w-4 h-4" />
                    Lúc nào cũng oke!
                  </div>
                )}

                {challenge.challengerId === currentUserId ? (
                  <Button
                    disabled
                    variant="outline"
                    className="w-full opacity-50"
                  >
                    Kèo của bạn
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleAccept(challenge.id)}
                    disabled={isPending}
                    className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold uppercase tracking-wider shadow-lg shadow-destructive/20 animate-pulse hover:animate-none"
                  >
                    🔥 Nhận Kèo Ngay
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
