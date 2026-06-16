"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquareWarning } from "lucide-react";

interface SendToJuryDialogProps {
  eventId: string;
  defaultType?: "TIRE" | "TECHNICAL" | "WEIGHT" | "OTHER";
  defaultStartNumber?: number;
  onSuccess?: () => void;
}

export default function SendToJuryDialog({
  eventId,
  defaultType = "OTHER",
  defaultStartNumber,
  onSuccess,
}: SendToJuryDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>(defaultType);
  const [startNumber, setStartNumber] = useState(defaultStartNumber ? String(defaultStartNumber) : "");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleOpen = () => {
    setType(defaultType);
    setStartNumber(defaultStartNumber ? String(defaultStartNumber) : "");
    setDescription("");
    setError("");
    setSent(false);
    setOpen(true);
  };

  const handleSend = async () => {
    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/complaints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          description: description.trim(),
          targetStartNumber: startNumber ? Number(startNumber) : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed");
      }
      setSent(true);
      onSuccess?.();
      setTimeout(() => setOpen(false), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send report");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen} className="flex items-center gap-2 text-orange-700 border-orange-300 hover:bg-orange-50">
        <MessageSquareWarning className="h-4 w-4" />
        Send to Jury
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareWarning className="h-5 w-5 text-orange-600" />
              Send Report to Jury
            </DialogTitle>
          </DialogHeader>

          {sent ? (
            <div className="py-6 text-center text-green-700">
              <p className="font-medium">Report submitted to jury</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TIRE">Tyre</SelectItem>
                    <SelectItem value="TECHNICAL">Technical</SelectItem>
                    <SelectItem value="WEIGHT">Weight</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Start number (optional)</label>
                <Input
                  className="mt-1"
                  type="number"
                  placeholder="e.g. 12"
                  value={startNumber}
                  onChange={(e) => setStartNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description *</label>
                <textarea
                  className="mt-1 w-full border rounded px-3 py-2 text-sm min-h-20 resize-none"
                  placeholder="Describe the issue in detail…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          )}

          {!sent && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSend} disabled={saving}>
                {saving ? "Sending…" : "Send to Jury"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
