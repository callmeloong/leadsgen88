"use client";

import { useState } from "react";
import { Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { issueChallenge } from "@/app/actions";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";

export function ChallengeButton({
  player,
  customTrigger,
}: {
  player: any;
  customTrigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const handleChallenge = async () => {
    setLoading(true);
    const formattedTime = scheduledTime
      ? new Date(scheduledTime).toISOString()
      : undefined;
    const res = await issueChallenge(player.id, message, formattedTime);
    setLoading(false);
    setOpen(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Đã gửi lời thách đấu! Chờ đối thủ nhận kèo.");
      setMessage("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {customTrigger ? (
          customTrigger
        ) : (
          <Badge className="text-lg px-6 py-2 bg-red-600 hover:bg-red-700 cursor-pointer animate-pulse border-none text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            <Swords className="w-5 h-5 mr-2" />
            THÁCH ĐẤU
          </Badge>
        )}
      </DialogTrigger>
      <DialogContent className="font-mono">
        <DialogHeader>
          <DialogTitle>Gửi lời tuyên chiến?</DialogTitle>
          <DialogDescription>
            Bạn có chắc chắn muốn thách đấu{" "}
            <strong className="text-red-500">{player.name}</strong> không?
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          <Textarea
            placeholder="Nhập lời nhắn gửi yêu thương (hoặc khiêu khích)..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="bg-card/50"
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Thời gian thi đấu (Tùy chọn)
            </label>
            <input
              type="datetime-local"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [color-scheme:dark]"
              onChange={(e) => setScheduledTime(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              *Bot sẽ nhắc trước 30 phút.
            </p>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            *Tin nhắn sẽ được gửi cùng thông báo tới Telegram.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleChallenge}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? "Đang gửi..." : "Gửi Lời Thách Đấu ⚔️"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
