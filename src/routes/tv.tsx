import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Clock,
  Crown,
  Flame,
  Gamepad2,
  Sparkles,
  Trophy,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import { getPublicLoungeTvStatusFn } from "@/lib/booking.functions";

export const Route = createFileRoute("/tv")({
  head: () => ({
    meta: [
      { title: "Live Rig Status Board | Friendz Arena PS5 TV" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: async () => {
    return await getPublicLoungeTvStatusFn();
  },
  component: TvStatusBoardPage,
});

const RIGS_DATA = [
  { id: "Rig 01", name: "Rig 01 · DualSense 1v1 Arena", defaultGame: "EA SPORTS FC 24", genre: "Sports & 1v1" },
  { id: "Rig 02", name: "Rig 02 · Vice City Ready", defaultGame: "Grand Theft Auto VI", genre: "Open World (Disc 1)" },
  { id: "Rig 03", name: "Rig 03 · Fighting Colosseum", defaultGame: "TEKKEN 8", genre: "Esports & Fighter" },
  { id: "Rig 04", name: "Rig 04 · PlayStation Exclusives", defaultGame: "God of War Ragnarök", genre: "Action RPG 4K 120Hz" },
  { id: "Rig 05", name: "Rig 05 · Co-op Squad Lounge", defaultGame: "Marvel's Spider-Man 2", genre: "4-Player Squad Lounge" },
];

interface TvRigStatus {
  id: string;
  name: string;
  defaultGame: string;
  genre: string;
  isOccupied: boolean;
  isUpcoming?: boolean;
  startsIn?: number;
  upcomingTime?: string;
  minutesLeft?: number;
  gameTitle?: string;
  player?: string;
  partySize?: number;
  booking?: any;
}

function matchRig(stationName?: string | null, rigId?: string | null): boolean {
  if (!stationName || !rigId) return false;
  const s = stationName.toLowerCase();
  const r = rigId.toLowerCase();
  const getRigNum = (str: string) => {
    const m = str.match(/rig\s*0?([1-5])/i);
    return m ? Number(m[1]) : null;
  };
  const numS = getRigNum(s);
  const numR = getRigNum(r);
  if (numS !== null && numR !== null && numS === numR) return true;
  return s.includes(r) || r.includes(s);
}

function TvStatusBoardPage() {
  const initialData = Route.useLoaderData();
  const getTvStatus = useServerFn(getPublicLoungeTvStatusFn);

  const [tvData, setTvData] = useState<any>(initialData || null);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [currentMinutes, setCurrentMinutes] = useState<number>(() => {
    try {
      const parts = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      }).formatToParts(new Date());
      const h = Number(parts.find((p) => p.type === "hour")?.value || 0);
      const m = Number(parts.find((p) => p.type === "minute")?.value || 0);
      return h * 60 + m;
    } catch {
      const d = new Date();
      return d.getHours() * 60 + d.getMinutes();
    }
  });

  // Clock ticker every second in Indian Standard Time (Asia/Kolkata)
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      try {
        const parts = new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "numeric",
          minute: "numeric",
          hour12: false,
        }).formatToParts(now);
        const h = Number(parts.find((p) => p.type === "hour")?.value || 0);
        const m = Number(parts.find((p) => p.type === "minute")?.value || 0);
        setCurrentMinutes(h * 60 + m);
      } catch {
        setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
      }

      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString("en-IN", {
          timeZone: "Asia/Kolkata",
          weekday: "long",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      );
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll status every 8 seconds
  useEffect(() => {
    async function loadData() {
      try {
        const res = await getTvStatus();
        if (res) setTvData(res);
      } catch {}
    }
    loadData();
    const pollInterval = setInterval(loadData, 8000);
    return () => clearInterval(pollInterval);
  }, []);

  // Calculate live rig status based on today's bookings
  const liveRigs: TvRigStatus[] = useMemo(() => {
    const bookings = tvData?.todayBookings || [];

    return RIGS_DATA.map((r) => {
      // Find active confirmed booking on this rig (strictly for today)
      const match = bookings.find((b: any) => {
        if (!b.station_rig || !matchRig(b.station_rig, r.id)) return false;
        if (b.status !== "confirmed") return false;
        if (b.visit_date && tvData?.today && b.visit_date !== tvData.today) return false;

        const [bh, bm] = String(b.visit_time || "00:00").split(":").map(Number);
        const bStart = (bh || 0) * 60 + (bm || 0);
        const bEnd = bStart + (Number(b.duration_hours) || 1) * 60;

        // CRITICAL: If the booking time has NOT arrived yet, it CANNOT be live!
        // A booking at 10:00 AM or 11:00 AM cannot be active at 3:50 AM or 8:00 AM!
        if (currentMinutes < bStart - 5) {
          return false;
        }

        // If session has expired well past its end time (+25 min grace), it is no longer active
        if (currentMinutes > bEnd + 25) {
          return false;
        }

        // If session_started_at is recorded, ensure it is within session window
        if (b.session_started_at && (!b.visit_date || b.visit_date === tvData?.today)) {
          const elapsed = (Date.now() - new Date(b.session_started_at).getTime()) / 60000;
          const totalDur = (Number(b.duration_hours) || 1) * 60;
          if (elapsed >= 0 && elapsed <= totalDur + 30 && currentMinutes <= bEnd + 20) {
            return true;
          }
        }

        // Active right now or within active duration window
        return currentMinutes >= bStart - 5 && currentMinutes <= bEnd + 20;
      });

      if (match) {
        let minutesLeft = 30;
        if (match.session_started_at) {
          const elapsed = Math.round((Date.now() - new Date(match.session_started_at).getTime()) / 60000);
          const totalDur = (Number(match.duration_hours) || 1) * 60;
          minutesLeft = Math.max(1, totalDur - elapsed);
        } else {
          const [bh, bm] = String(match.visit_time || "00:00").split(":").map(Number);
          const bStart = (bh || 0) * 60 + (bm || 0);
          const bEnd = bStart + (Number(match.duration_hours) || 1) * 60;
          minutesLeft = Math.max(1, bEnd - currentMinutes);
        }

        return {
          ...r,
          isOccupied: true,
          booking: match,
          minutesLeft,
          gameTitle: match.notes || r.defaultGame,
          player: match.customer_name || "Gamer",
          partySize: match.party_size || 1,
        };
      }

      // Check upcoming reservation later today (strictly confirmed & for today)
      const upcoming = bookings.find((b: any) => {
        if (!b.station_rig || !matchRig(b.station_rig, r.id)) return false;
        if (b.status !== "confirmed") return false;
        if (b.visit_date && tvData?.today && b.visit_date !== tvData.today) return false;

        const [bh, bm] = String(b.visit_time || "00:00").split(":").map(Number);
        const bStart = (bh || 0) * 60 + (bm || 0);
        return bStart > currentMinutes;
      });

      if (upcoming) {
        const [bh, bm] = String(upcoming.visit_time || "00:00").split(":").map(Number);
        const bStart = (bh || 0) * 60 + (bm || 0);
        const diff = bStart - currentMinutes;
        return {
          ...r,
          isOccupied: false,
          isUpcoming: diff <= 60, // Mark as urgent upcoming only within 60 mins
          startsIn: diff,
          upcomingTime: upcoming.visit_time,
          gameTitle: upcoming.notes || r.defaultGame,
          player: upcoming.customer_name,
        };
      }

      return {
        ...r,
        isOccupied: false,
        isUpcoming: false,
        gameTitle: r.defaultGame,
      };
    });
  }, [tvData, currentMinutes]);

  const activeCount = liveRigs.filter((r) => r.isOccupied).length;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#030616] text-white font-sans select-none">
      {/* Top Banner Header */}
      <header className="flex items-center justify-between border-b border-white/10 bg-[#060A24] px-8 py-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#FFB800] text-black font-display font-black text-2xl shadow-lg shadow-amber-500/20">
            FA
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl font-black uppercase tracking-wider text-white">
                Friendz Arena
              </span>
              <span className="rounded-full bg-cyan-400/20 border border-cyan-400/50 px-2.5 py-0.5 font-display text-[10px] font-black text-cyan-300 uppercase">
                PS5 Lounge · 4K 120Hz
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Beside RTC Bus Stand, Jangareddygudem · 5 Pro Rigs · 90+ Deluxe Titles
            </p>
          </div>
        </div>

        {/* Live Rig Occupancy Badge */}
        <div className="flex items-center gap-6">
          <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-2.5 text-center">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">RIG OCCUPANCY</span>
            <div className="flex items-center justify-center gap-2">
              <span className="size-2.5 rounded-full bg-emerald-400 animate-ping" />
              <p className="font-display text-xl font-black text-white">
                {activeCount} / 5 <span className="text-xs text-cyan-300 font-sans">Active</span>
              </p>
            </div>
          </div>

          {/* High-Speed WiFi info */}
          <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-2.5 flex items-center gap-3">
            <Wifi className="size-5 text-cyan-400" />
            <div className="text-left text-xs">
              <p className="font-bold text-white">FriendzArena_Guest</p>
              <p className="font-mono text-[10px] text-muted-foreground">WiFi: arena@2026</p>
            </div>
          </div>

          {/* Clock */}
          <div className="text-right">
            <p className="font-display text-2xl font-black text-[#FFB800] font-mono tracking-tight">{currentTime}</p>
            <p className="text-[11px] text-muted-foreground">{currentDate}</p>
          </div>
        </div>
      </header>

      {/* Main 5-Rig High-Contrast Grid */}
      <main className="flex-1 p-6 grid grid-cols-5 gap-5 items-stretch min-h-0">
        {liveRigs.map((rig) => {
          return (
            <div
              key={rig.id}
              className={`relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 p-6 transition-all shadow-2xl backdrop-blur-xl ${
                rig.isOccupied
                  ? "border-red-500/80 bg-gradient-to-b from-red-950/40 via-[#0a071f] to-[#040614] shadow-red-500/10"
                  : rig.isUpcoming
                  ? "border-amber-400/80 bg-gradient-to-b from-amber-950/40 via-[#0a071f] to-[#040614] shadow-amber-400/10"
                  : "border-emerald-500/80 bg-gradient-to-b from-emerald-950/40 via-[#060c24] to-[#040614] shadow-emerald-500/10"
              }`}
            >
              {/* Card Header: Station ID & Live Pill */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg font-black uppercase tracking-wider text-white">
                    {rig.id}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-[11px] font-black uppercase tracking-wider border ${
                      rig.isOccupied
                        ? "bg-red-500/20 text-red-300 border-red-500/50 animate-pulse"
                        : rig.isUpcoming
                        ? "bg-amber-400/20 text-amber-300 border-amber-400/50"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                    }`}
                  >
                    <span
                      className={`size-2 rounded-full ${
                        rig.isOccupied ? "bg-red-400" : rig.isUpcoming ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                    />
                    {rig.isOccupied ? "IN MATCH" : rig.isUpcoming ? "RESERVED" : "AVAILABLE"}
                  </span>
                </div>

                <p className="mt-1 text-xs text-muted-foreground truncate">{rig.name.split("·")[1]?.trim()}</p>
              </div>

              {/* Middle Section: Big Visual Meter & Game */}
              <div className="my-auto py-4 text-center space-y-3">
                {rig.isOccupied ? (
                  <>
                    <div className="mx-auto flex size-20 items-center justify-center rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 shadow-xl shadow-red-500/20">
                      <Gamepad2 className="size-10 stroke-[2.5]" />
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">CURRENTLY PLAYING</span>
                      <h3 className="font-display text-lg font-black text-[#FFB800] leading-snug line-clamp-2 px-1">
                        {rig.gameTitle}
                      </h3>
                      <p className="mt-1 text-xs text-white/90 font-medium">
                        Player: <strong className="text-cyan-300">{rig.player}</strong> ({rig.partySize}P)
                      </p>
                    </div>

                    {/* Countdown */}
                    <div className="rounded-2xl bg-black/60 border border-red-500/30 p-3">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">TIME REMAINING</span>
                      <p className="font-display text-2xl font-black text-red-400 font-mono">
                        {rig.minutesLeft}m Left
                      </p>
                    </div>
                  </>
                ) : rig.isUpcoming ? (
                  <>
                    <div className="mx-auto flex size-20 items-center justify-center rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300">
                      <Clock className="size-10 stroke-[2.5]" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-300">UPCOMING SESSION</span>
                      <h3 className="font-display text-base font-black text-white px-1">{rig.gameTitle}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">Booked by {rig.player}</p>
                    </div>
                    <div className="rounded-2xl bg-black/60 border border-amber-400/30 p-3">
                      <p className="font-display text-lg font-black text-amber-300">
                        {(rig.startsIn ?? 0) <= 60
                          ? `Starts in ${rig.startsIn ?? 0} mins`
                          : `Reserved at ${rig.upcomingTime || ""}`}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mx-auto flex size-20 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-xl shadow-emerald-500/10">
                      <Zap className="size-10 stroke-[2.5]" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-400">READY FOR YOU</span>
                      <h3 className="font-display text-xl font-black text-white uppercase">FREE RIG</h3>
                      <p className="mt-1 text-xs text-cyan-300">90+ Games Installed</p>
                    </div>
                    <div className="rounded-2xl bg-black/60 border border-emerald-500/30 p-3">
                      <p className="font-display text-xs font-bold uppercase text-[#FFB800]">
                        {rig.upcomingTime
                          ? `Free Now · Reserved at ${rig.upcomingTime}`
                          : "Scan Desk QR or Drop In"}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Card Footer: Hardware Spec */}
              <div className="border-t border-white/10 pt-3 text-[10px] text-muted-foreground flex justify-between items-center">
                <span>Sony Bravia 4K 120Hz</span>
                <span className="text-cyan-400 font-bold">DualSense Edge</span>
              </div>
            </div>
          );
        })}
      </main>

      {/* Bottom Ticker & Announcements */}
      <footer className="h-14 border-t border-white/10 bg-[#060A24] flex items-center px-6 overflow-hidden shrink-0">
        <div className="flex items-center gap-2 bg-[#FFB800] text-black font-display text-xs font-black px-3 py-1 rounded-lg shrink-0 mr-4 uppercase tracking-wider">
          <Flame className="size-3.5 fill-current" /> ARENA LIVE
        </div>

        <div className="flex-1 overflow-hidden whitespace-nowrap text-xs font-medium text-white/90">
          <div className="inline-block animate-[marquee_25s_linear_infinite] space-x-12">
            <span>🏆 <strong>EA FC 24 Jangareddygudem Cup</strong> this Saturday @ 5:00 PM · ₹5,000 Cash Prize Pool · Register at the desk</span>
            <span>🔥 <strong>Grand Theft Auto VI Day 1 Edition</strong> playable on Rig 01 & Rig 02 (2 Physical Discs)</span>
            <span>⚡ <strong>Arena Pro Gamer Pass</strong>: 10 Hours prepaid gaming for just ₹850 (Save ₹150) · Ask at desk</span>
            <span>🍿 <strong>Squad Gamer Fuel</strong>: 2 Red Bulls + Peri Peri Fries for ₹240</span>
            <span>🎮 <strong>Zero Lag Display</strong>: All 5 stations equipped with high refresh rate 4K 120Hz screens & 3D Audio</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
