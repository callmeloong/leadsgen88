"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cancelLiveMatch } from "@/app/actions";

interface CancelMatchDialogProps {
  matchId: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  className?: string;
}

export function CancelMatchDialog({
  matchId,
  onSuccess,
  trigger,
  className,
}: CancelMatchDialogProps) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const router = useRouter();

  const handleCancel = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setUpdating(true);
    try {
      const res = await cancelLiveMatch(matchId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Đã huỷ trận đấu");
        setOpen(false);
        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
          router.push("/");
        }
      }
    } catch (error) {
      toast.error("Có lỗi xảy ra");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger || (
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 ${className}`}
            title="Huỷ trận đấu"
            disabled={updating}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="border-red-900 bg-zinc-950 text-white sm:max-w-md font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="w-5 h-5" />
            HỦY TRẬN ĐẤU?
          </DialogTitle>
          <DialogDescription className="text-zinc-400 pt-2">
            Bạn có chắc chắn muốn hủy trận đấu này không? Hành động này không
            thể hoàn tác.
            <div className="mt-4 p-3 bg-red-950/30 border border-red-900/50 rounded text-sm text-red-200">
              <p className="font-bold mb-1">⚠️ HỆ QUẢ:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>
                  Bạn sẽ bị trừ{" "}
                  <span className="font-bold text-red-400">20 Elo</span>.
                </li>
                <li>
                  Đối thủ được cộng{" "}
                  <span className="font-bold text-green-400">20 Elo</span>.
                </li>
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button
              variant="ghost"
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              onClick={(e) => e.stopPropagation()}
            >
              Thôi, đánh tiếp
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            className="bg-red-600 hover:bg-red-700 font-bold"
            onClick={handleCancel}
            disabled={updating}
          >
            {updating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            CHẤP NHẬN HỦY
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
