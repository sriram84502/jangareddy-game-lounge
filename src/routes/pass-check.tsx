import { useState, useEffect, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "qrcode";
import {
  ArrowLeft,
  Check,
  CheckCircle,
  Copy,
  Crown,
  Flame,
  Gamepad2,
  MessageCircle,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { checkGamerPassBalanceFn } from "@/lib/booking.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/pass-check")({
  head: () => ({
    meta: [
      { title: "Check Gamer Pass Balance | Friendz Arena PS5 Lounge" },
      { name: "description", content: "Check your remaining Arena Pro prepaid gaming hours, pass code status, and validity in real-time." },
    ],
  }),
  component: PassCheckerPage,
});

function PassCheckerPage() {
  const checkPass = useServerFn(checkGamerPassBalanceFn);

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultPass, setResultPass] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [passQrUrl, setPassQrUrl] = useState<string>("");

  useEffect(() => {
    if (resultPass?.pass_code) {
      QRCode.toDataURL(resultPass.pass_code, { width: 180, margin: 1 }, (err, url) => {
        if (!err && url) setPassQrUrl(url);
      });
    } else {
      setPassQrUrl("");
    }
  }, [resultPass]);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    setErrorMessage("");
    setResultPass(null);

    try {
      const res = await checkPass({ data: { query: searchQuery.trim() } });
      if (res?.success && res.pass) {
        setResultPass(res.pass);
      } else {
        setErrorMessage(res?.message || "No gamer pass found matching that code or tag.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Could not check pass. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(code: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  }

  const percentLeft = resultPass
    ? Math.round((resultPass.remaining_hours / resultPass.total_hours) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-[#050819] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#070B24]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="size-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-[#FFB800] text-black font-display font-black text-xs">
              FA
            </span>
            <span className="font-display text-sm font-black uppercase text-white">Friendz Arena</span>
          </div>
          <Link
            to="/#rates"
            className="text-xs font-bold text-[#FFB800] hover:underline"
          >
            Buy A Pass
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-5 py-12 sm:py-16 space-y-8">
        <div className="text-center space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/40 px-3.5 py-1 font-display text-[11px] font-black uppercase tracking-wider text-[#FFB800]">
            <Crown className="size-3.5" /> ARENA PRO DIGITAL MEMBERSHIP
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
            Check Pass Balance
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Enter your <strong>Gamer Tag</strong> (e.g. ViperStriker) or your <strong>Pass Code</strong> (e.g. ARENA-PRO-889) to view your live remaining hours.
          </p>
        </div>

        {/* Search Input Box */}
        <form onSubmit={handleSearch} className="relative">
          <div className="flex gap-2 rounded-2xl border border-white/20 bg-[#081348]/90 p-2 shadow-2xl backdrop-blur-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Gamer Tag or ARENA code..."
                className="w-full bg-transparent pl-10 pr-3 py-2.5 text-sm font-medium text-white placeholder:text-muted-foreground focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-chamfer bg-[#FFB800] px-5 py-2.5 font-display text-xs font-black uppercase text-black hover:brightness-110 active:scale-95 transition-all shadow-md shrink-0"
            >
              {loading ? "Checking..." : "Check Hours"}
            </button>
          </div>
        </form>

        {errorMessage && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-4 text-xs text-red-300 text-center">
            {errorMessage}
          </div>
        )}

        {/* Result Digital Pass Card */}
        {resultPass && (
          <div className="relative overflow-hidden rounded-3xl border-2 border-[#FFB800]/60 bg-gradient-to-br from-[#0e174d] via-[#091036] to-[#050921] p-6 sm:p-8 shadow-2xl shadow-amber-500/10 space-y-6">
            {/* Holographic Watermark Glow */}
            <div className="absolute -right-12 -top-12 size-48 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-12 -bottom-12 size-48 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

            {/* Pass Top Bar */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="font-display text-[10px] font-black uppercase text-[#FFB800] tracking-wider">
                  FRIENDZ ARENA GAMER PASS
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(resultPass.pass_code)}
                    className="flex items-center gap-1.5 font-mono text-sm font-black text-cyan-300 hover:text-white transition-colors"
                  >
                    {resultPass.pass_code}
                    {copiedCode ? (
                      <Check className="size-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="size-3.5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <span
                className={`rounded-full px-3 py-1 font-display text-[10px] font-black uppercase tracking-wider border ${
                  resultPass.remaining_hours > 0 && resultPass.status === "active"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}
              >
                {resultPass.remaining_hours > 0 && resultPass.status === "active" ? "ACTIVE PASS" : "EXHAUSTED"}
              </span>
            </div>

            {/* Gamer Tag & Player Info */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Crown className="size-5 text-[#FFB800]" />
                  <h3 className="font-display text-2xl font-black uppercase text-white">
                    {resultPass.gamer_tag}
                  </h3>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Gamer: <strong className="text-white">{resultPass.customer_name}</strong>
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Original Tier</span>
                <p className="font-display text-base font-black text-white">{resultPass.total_hours} Hours Pass</p>
              </div>
            </div>

            {/* Hours Balance Progress Meter */}
            <div className="rounded-2xl border border-white/10 bg-black/60 p-5 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase font-bold text-muted-foreground">REMAINING BALANCE</span>
                <span className="font-display text-3xl font-black text-[#FFB800]">
                  {resultPass.remaining_hours}{" "}
                  <span className="text-sm font-bold text-muted-foreground font-sans">
                    / {resultPass.total_hours} Hours
                  </span>
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full transition-all duration-700 ${
                    percentLeft > 40
                      ? "bg-gradient-to-r from-emerald-500 to-cyan-400"
                      : percentLeft > 15
                      ? "bg-amber-400"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, percentLeft))}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                <span>Pass Price: ₹{resultPass.price_paid}</span>
                <span>{percentLeft}% time remaining</span>
              </div>
            </div>

            {/* Scannable Pass QR Code for Lounge Desk Checkout */}
            {passQrUrl && (
              <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-cyan-500/30 bg-black/60 p-4">
                <div className="rounded-xl bg-white p-2 shadow-lg shrink-0">
                  <img src={passQrUrl} alt="Gamer Pass QR" className="size-28" />
                </div>
                <div className="space-y-1.5 text-center sm:text-left">
                  <span className="inline-block rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    Show at Desk to Redeem
                  </span>
                  <h4 className="font-display text-sm font-black text-white">Digital Pass Scanner QR</h4>
                  <p className="text-xs text-muted-foreground">
                    Show this QR code at the desk when completing your session. The desk scanner will deduct your hours directly, so you <strong className="text-white">only pay for snacks and drinks!</strong>
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                to="/#book"
                className="btn-chamfer flex-1 bg-[#FFB800] py-3 text-center font-display text-xs font-black uppercase text-black hover:brightness-110 active:scale-95 shadow-lg"
              >
                Book PS5 Slot with Pass
              </Link>
              <a
                href={`https://wa.me/918498833389?text=Hello%20Friendz%20Arena!%20I%20have%20Pass%20${resultPass.pass_code}%20(${resultPass.gamer_tag})%20and%20want%20to%20top%20up%20more%20hours.`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-center font-display text-xs font-bold uppercase text-white hover:bg-white/10 flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="size-3.5" /> Top Up Hours
              </a>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="rounded-2xl border border-white/10 bg-[#081348]/50 p-5 text-xs text-muted-foreground space-y-2">
          <p className="font-bold text-white flex items-center gap-1.5">
            <Sparkles className="size-4 text-[#FFB800]" /> How to use your Gamer Pass:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>State your Gamer Tag or flash your Pass Code when entering the lounge.</li>
            <li>Hours are deducted in 1-hour increments for the session.</li>
            <li>Passes are valid across all 5 PS5 stations and all 90+ games.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
