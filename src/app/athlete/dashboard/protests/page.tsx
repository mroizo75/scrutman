"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle, FileQuestion, Plus, Upload, ExternalLink, Clock } from "lucide-react";
import AthleteNav from "@/components/AthleteNav";

interface EventOption { id: string; title: string; startDate: string }
interface Protest {
  id: string;
  eventId: string;
  type: string;
  description: string;
  targetStartNumber: number | null;
  status: string;
  paymentReceiptUrl: string | null;
  paymentAmount: number | null;
  juryDecision: string | null;
  decisionNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  PENDING_PAYMENT: "bg-orange-100 text-orange-800",
  OPEN: "bg-yellow-100 text-yellow-800",
  UNDER_REVIEW: "bg-blue-100 text-blue-800",
  UPHELD: "bg-green-100 text-green-800",
  DISMISSED: "bg-gray-100 text-gray-600",
  WITHDRAWN: "bg-gray-100 text-gray-500",
};

export default function AthleteProtestsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [events, setEvents] = useState<EventOption[]>([]);
  const [protests, setProtests] = useState<Protest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [eventId, setEventId] = useState("");
  const [type, setType] = useState("TECHNICAL");
  const [description, setDescription] = useState("");
  const [targetStartNumber, setTargetStartNumber] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const userData = Cookies.get("user");
    if (!userData) { router.push("/login"); return; }
    const user = JSON.parse(userData);
    if (user.role !== "ATHLETE") { router.push("/athlete/dashboard"); return; }
    setUserId(user.id);
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    fetch("/api/events/public").then((r) => r.json()).then((d) => setEvents(d.events ?? []));
    loadProtests();
  }, [userId]);

  const loadProtests = () => {
    setLoading(true);
    fetch("/api/protests/my")
      .then((r) => r.json())
      .then((d) => setProtests(d.protests ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const uploadReceipt = async (): Promise<string | null> => {
    if (!receiptFile) return null;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", receiptFile);
      const res = await fetch("/api/upload/payment-receipt", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return data.url;
    } catch {
      setError("Failed to upload receipt");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const submitProtest = async () => {
    if (!eventId || !description.trim()) {
      setError("Event and description are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let receiptUrl: string | null = null;
      if (receiptFile) {
        receiptUrl = await uploadReceipt();
        if (!receiptUrl) { setSaving(false); return; }
      }

      const res = await fetch(`/api/events/${eventId}/protests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          description: description.trim(),
          targetStartNumber: targetStartNumber ? Number(targetStartNumber) : undefined,
          paymentReceiptUrl: receiptUrl,
          paymentAmount: paymentAmount ? Number(paymentAmount) : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed");
      }
      setSuccess("Protest submitted");
      setShowForm(false);
      setDescription("");
      setTargetStartNumber("");
      setPaymentAmount("");
      setReceiptFile(null);
      setTimeout(() => setSuccess(null), 4000);
      loadProtests();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit protest");
    } finally {
      setSaving(false);
    }
  };

  const uploadReceiptForExisting = async (protest: Protest) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch("/api/upload/payment-receipt", { method: "POST", body: fd });
      if (!uploadRes.ok) { setError("Upload failed"); return; }
      const { url } = await uploadRes.json();
      await fetch(`/api/events/${protest.eventId}/protests/${protest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentReceiptUrl: url }),
      });
      setSuccess("Receipt uploaded — protest is now OPEN");
      setTimeout(() => setSuccess(null), 4000);
      loadProtests();
    };
    input.click();
  };

  return (
    <>
      <AthleteNav />
      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileQuestion className="h-6 w-6 text-red-600" />
              My Protests
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Submit formal protests against decisions or results
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            New Protest
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />{error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />{success}
          </div>
        )}

        {/* Protest form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submit a Protest</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded p-3 text-sm">
                <p className="font-medium">Important</p>
                <p className="mt-0.5">A protest deposit is required. Upload your payment receipt before submitting, or submit first and upload later. Your protest will only be forwarded to the jury once the receipt is received.</p>
              </div>

              <div>
                <label className="text-sm font-medium">Event *</label>
                <Select value={eventId} onValueChange={setEventId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select event…" /></SelectTrigger>
                  <SelectContent>
                    {events.map((ev) => <SelectItem key={ev.id} value={ev.id}>{ev.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Protest type *</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TIRE">Tyre</SelectItem>
                    <SelectItem value="TECHNICAL">Technical</SelectItem>
                    <SelectItem value="WEIGHT">Weight</SelectItem>
                    <SelectItem value="RACE_RESULT">Race Result</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Start number of protested car (optional)</label>
                <Input
                  className="mt-1"
                  type="number"
                  placeholder="e.g. 12"
                  value={targetStartNumber}
                  onChange={(e) => setTargetStartNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description *</label>
                <textarea
                  className="mt-1 w-full border rounded px-3 py-2 text-sm min-h-24 resize-none"
                  placeholder="Describe the grounds for your protest in detail…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Payment receipt (upload to activate protest)</label>
                <div className="mt-1 flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {receiptFile ? receiptFile.name : "Choose file"}
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                  />
                  {receiptFile && (
                    <span className="text-sm text-muted-foreground">{(receiptFile.size / 1024).toFixed(0)} KB</span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Deposit amount paid (optional)</label>
                <Input
                  className="mt-1 w-40"
                  type="number"
                  placeholder="e.g. 500"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={submitProtest} disabled={saving || uploading}>
                  {saving || uploading ? "Submitting…" : "Submit Protest"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Protest history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Protest History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!loading && protests.length === 0 && (
              <p className="text-sm text-muted-foreground">No protests submitted yet</p>
            )}
            {protests.map((p) => (
              <div key={p.id} className="border rounded p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-medium text-sm">{p.type}</span>
                    {p.targetStartNumber && (
                      <span className="text-muted-foreground text-sm ml-1">— car #{p.targetStartNumber}</span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[p.status] ?? ""}`}>
                    {p.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{p.description}</p>

                {p.paymentReceiptUrl ? (
                  <a
                    href={p.paymentReceiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:underline text-xs"
                  >
                    <ExternalLink className="h-3 w-3" /> View receipt
                  </a>
                ) : p.status === "PENDING_PAYMENT" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => uploadReceiptForExisting(p)}
                    className="flex items-center gap-2 text-orange-700 border-orange-300"
                  >
                    <Upload className="h-3 w-3" /> Upload receipt to activate
                  </Button>
                ) : null}

                {p.juryDecision && (
                  <div className="bg-muted rounded p-2 text-sm">
                    <p className="font-medium">Jury decision: {p.juryDecision}</p>
                    {p.decisionNotes && <p className="text-muted-foreground mt-0.5">{p.decisionNotes}</p>}
                  </div>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Submitted {new Date(p.createdAt).toLocaleDateString()}
                  {p.resolvedAt && ` · Resolved ${new Date(p.resolvedAt).toLocaleDateString()}`}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
