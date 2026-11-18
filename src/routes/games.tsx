import { useState, useMemo, useEffect, useRef, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  Gamepad2,
  Heart,
  MessageCircle,
  Monitor,
  Play,
  Plus,
  Search,
  Sparkles,
  Star,
  Users,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  calculateSessionPrice,
  GROUP_SIZES,
  SESSION_DURATIONS,
  type SessionDuration,
} from "@/lib/pricing";
import { submitBookingRequest, checkSlotAvailabilityFn } from "@/lib/booking.functions";
import { GAMES_LIST, GENRE_FILTERS, type GameItem } from "@/data/games";

const GAME_TRAILERS: Record<string, { title: string; embedUrl: string }> = {
  "grand-theft-auto-vi": {
    title: "Grand Theft Auto VI - Official Reveal Trailer",
    embedUrl: "https://www.youtube-nocookie.com/embed/QdBZY2fkU-0?autoplay=1",
  },
  "marvels-spider-man-2": {
    title: "Marvel's Spider-Man 2 - Official Gameplay",
    embedUrl: "https://www.youtube-nocookie.com/embed/9fVYKsEmuRo?autoplay=1",
  },
  "god-of-war-ragnarok": {
    title: "God of War Ragnarök - Official Story Trailer",
    embedUrl: "https://www.youtube-nocookie.com/embed/hfJ4Km46A-0?autoplay=1",
  },
  "ea-sports-fc-24": {
    title: "EA SPORTS FC 24 - Official Gameplay Reveal",
    embedUrl: "https://www.youtube-nocookie.com/embed/XhP3Xh4LMA8?autoplay=1",
  },
  "tekken-8": {
    title: "TEKKEN 8 - Jin Kazama Official Reveal",
    embedUrl: "https://www.youtube-nocookie.com/embed/mKk3U6pXv7w?autoplay=1",
  },
};

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "90+ PS5 Games Library | Friendz Arena Jangareddygudem" },
      {
        name: "description",
        content:
          "Browse all 90+ PlayStation 5 games at Friendz Arena in Jangareddygudem. Featuring our Top 5 Blockbusters in an interactive 3D showcase, plus complete catalog with group hourly pricing.",
      },
      {
        property: "og:title",
        content: "90+ PS5 Games Library | Friendz Arena Jangareddygudem",
      },
      {
        property: "og:description",
        content:
          "Explore GTA VI, Spider-Man 2, God of War Ragnarök, EA SPORTS FC 24, Tekken 8, and 90+ games on PS5 at Friendz Arena.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: GamesPage,
});

// The 5 Most Popular PS5 Blockbuster Games for the Hero 3D Breakout Carousel
export const POPULAR_CAROUSEL_GAMES = [
  {
    index: "01",
    id: "grand-theft-auto-vi",
    title: "Grand Theft Auto VI",
    categoryLabel: "PS5 NEXT-GEN BLOCKBUSTER",
    tagline: "The most anticipated video game launch in human history.",
    subMeta: "Arriving Day 1 on PS5 · Vice City, State of Leonida",
    breakoutImage: "/hero-gta6-breakout.png",
    posterImage: "/games/gta-6.jpg",
    rating: "9.9",
    starsCount: 5,
    genreTags: ["OPEN WORLD", "ACTION", "HEISTS", "RAY TRACING"],
    synopsis:
      "Rockstar Games takes players back to neon-drenched Vice City and the sun-soaked wetlands of Leonida. Experience Lucia and Jason's cinematic crime story in breathtaking 4K 60FPS ray tracing on Friendz Arena's dedicated PS5 stations without console costs or 150GB download waiting.",
    studio: "Rockstar Games",
    stationRig: "Rig 02 · Vice City Ready",
    displaySpecs: "4K 60FPS Ray Tracing",
    playersInfo: "1 Player (Single Player & Online)",
    releaseBadge: "🔥 Day 1 on PS5",
    colorTheme: {
      primary: "#EC4899", // Neon Fuchsia / Pink
      secondary: "#23C8F3", // Cyber Cyan
      glow: "from-pink-500/25 via-fuchsia-600/20 to-transparent",
      bgCard: "bg-[#110B22]/90",
      bottomBar: "bg-[#180F30] border-fuchsia-500/40 text-fuchsia-300",
      badgeBorder: "border-fuchsia-500/60 bg-fuchsia-950/70 text-fuchsia-300",
      accentButton: "bg-[#FFB800] text-black hover:bg-amber-400",
    },
  },
  {
    index: "02",
    id: "marvels-spider-man-2",
    title: "Marvel's Spider-Man 2",
    categoryLabel: "PLAYSTATION 5 EXCLUSIVE",
    tagline: "Be Greater. Together.",
    subMeta: "PlayStation Studios Blockbuster · 4K 60FPS Fidelity",
    breakoutImage: "/hero-spiderman-breakout.png",
    posterImage: "/games/marvels-spider-man-2.jpg",
    rating: "9.8",
    starsCount: 5,
    genreTags: ["SUPERHERO", "ACTION-ADVENTURE", "EXCLUSIVE", "HAPTICS"],
    synopsis:
      "Spider-Men Peter Parker and Miles Morales face the ultimate test of strength inside and outside the mask as they fight to save the city from Venom and the monstrous symbiote threat. Seamlessly switch between both heroes with near-instant fast-travel across Marvel's New York.",
    studio: "Insomniac Games",
    stationRig: "Rig 04 · PlayStation Exclusives",
    displaySpecs: "Near-Zero Fast Travel",
    playersInfo: "1 Player (DualSense Immersion)",
    releaseBadge: "🕸️ PS5 Exclusive",
    colorTheme: {
      primary: "#EF4444", // Cyber Red
      secondary: "#23C8F3", // Electric Blue
      glow: "from-red-600/25 via-cyan-500/20 to-transparent",
      bgCard: "bg-[#0E1528]/90",
      bottomBar: "bg-[#0F1C36] border-red-500/40 text-red-300",
      badgeBorder: "border-red-500/60 bg-red-950/70 text-red-300",
      accentButton: "bg-[#23C8F3] text-black hover:bg-cyan-300",
    },
  },
  {
    index: "03",
    id: "god-of-war-ragnarok",
    title: "God of War Ragnarök",
    categoryLabel: "BAFTA GAME OF THE YEAR WINNER",
    tagline: "Death Can Have Me When It Earns Me.",
    subMeta: "PlayStation Studios Masterpiece · Nine Realms Odyssey",
    breakoutImage: "/hero-kratos-breakout.png",
    posterImage: "/games/god-of-war-ragnarok.jpg",
    rating: "9.9",
    starsCount: 5,
    genreTags: ["MYTHIC ACTION", "ADVENTURE", "HACK & SLASH", "CINEMATIC"],
    synopsis:
      "Embark on an epic and heartfelt journey as Kratos and Atreus struggle with holding on and letting go against the armies of Asgard. Feel every brutal swing of the Leviathan Axe and fiery Blades of Chaos through Sony DualSense adaptive triggers and spatial 3D audio.",
    studio: "Santa Monica Studio",
    stationRig: "Rig 04 · PlayStation Exclusives",
    displaySpecs: "4K 60FPS Low-Latency",
    playersInfo: "1 Player (Cinematic Experience)",
    releaseBadge: "⚡ 4K 60FPS HDR",
    colorTheme: {
      primary: "#38BDF8", // Frost Rune Blue
      secondary: "#FFB800", // Spartan Gold
      glow: "from-sky-500/25 via-blue-700/20 to-transparent",
      bgCard: "bg-[#09152A]/90",
      bottomBar: "bg-[#0D1E3A] border-sky-500/40 text-sky-300",
      badgeBorder: "border-sky-500/60 bg-sky-950/70 text-sky-300",
      accentButton: "bg-[#FFB800] text-black hover:bg-amber-400",
    },
  },
  {
    index: "04",
    id: "ea-sports-fc-24",
    title: "EA SPORTS FC 24",
    categoryLabel: "MOST PLAYED SQUAD DERBY",
    tagline: "The World's Game on PlayStation 5.",
    subMeta: "HyperMotionV Physics · 19,000+ Licensed Players",
    breakoutImage: "/hero-eafc-breakout.png",
    posterImage: "/games/ea-sports-fc-24.jpg",
    rating: "9.5",
    starsCount: 5,
    genreTags: ["FOOTBALL", "SPORTS", "LOCAL 1V1 & 2V2", "DERBY"],
    synopsis:
      "The definitive football experience with HyperMotionV technology capturing the game as it is truly played. Grab up to 4 DualSense wireless controllers for intense head-to-head couch rivalries, weekend matches, and UEFA Champions League glory at Friendz Arena.",
    studio: "EA Sports",
    stationRig: "Rig 01 · DualSense 1v1 Arena",
    displaySpecs: "4K High-Refresh Low-Lag",
    playersInfo: "1–4 Players (Local Couch Co-op)",
    releaseBadge: "⚽ 4P Local Derby",
    colorTheme: {
      primary: "#10B981", // Pitch Emerald
      secondary: "#84CC16", // Volt Lime
      glow: "from-emerald-500/25 via-teal-600/20 to-transparent",
      bgCard: "bg-[#061B16]/90",
      bottomBar: "bg-[#0A261F] border-emerald-500/40 text-emerald-300",
      badgeBorder: "border-emerald-500/60 bg-emerald-950/70 text-emerald-300",
      accentButton: "bg-[#10B981] text-black hover:bg-emerald-400",
    },
  },
  {
    index: "05",
    id: "tekken-8",
    title: "TEKKEN 8",
    categoryLabel: "NEXT-GEN 1V1 FIGHTING ARENA",
    tagline: "Fist Meets Fate.",
    subMeta: "Powered by Unreal Engine 5 · Zero Input Lag",
    breakoutImage: "/hero-tekken-breakout.png",
    posterImage: "/games/tekken-8.jpg",
    rating: "9.7",
    starsCount: 5,
    genreTags: ["FIGHTING", "1V1 COMPETITIVE", "MARTIAL ARTS", "ZERO-LAG"],
    synopsis:
      "A revolutionary new chapter of the legendary fighting franchise. Powered by Unreal Engine 5 with the aggressive new Heat System, high-impact stage destruction, dynamic visual effects, and lightning-fast 60FPS responsiveness on our competitive esports displays.",
    studio: "Bandai Namco Entertainment",
    stationRig: "Rig 03 · Fighting Colosseum",
    displaySpecs: "Zero-Lag 60FPS Fighter",
    playersInfo: "1–2 Players (Local 1v1 Arena)",
    releaseBadge: "🥊 1v1 Zero-Lag",
    colorTheme: {
      primary: "#F59E0B", // Electric Amber / Gold
      secondary: "#A855F7", // Devil Gene Purple
      glow: "from-amber-500/25 via-purple-600/20 to-transparent",
      bgCard: "bg-[#1A1208]/90",
      bottomBar: "bg-[#251A0A] border-amber-500/40 text-amber-300",
      badgeBorder: "border-amber-500/60 bg-amber-950/70 text-amber-300",
      accentButton: "bg-[#FFB800] text-black hover:bg-amber-400",
    },
  },
];

function GamesPage() {
  const sendBookingRequest = useServerFn(submitBookingRequest);
  const checkSlotFn = useServerFn(checkSlotAvailabilityFn);

  // Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [favoritedGames, setFavoritedGames] = useState<Record<string, boolean>>({});

  // Video Trailer Lightbox Modal State
  const [activeTrailer, setActiveTrailer] = useState<{ title: string; embedUrl: string } | null>(null);

  // Catalog State
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Booking Modal / Drawer State
  const [selectedGameForBooking, setSelectedGameForBooking] = useState<string | null>(null);
  const [visitDate, setVisitDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [visitTime, setVisitTime] = useState<string>("16:00");
  const [durationHours, setDurationHours] = useState<SessionDuration>(1);
  const [partySize, setPartySize] = useState(1);
  const [contactMethod, setContactMethod] = useState<"phone" | "whatsapp">("whatsapp");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Live Slot & Game Availability State (GTA VI: 2 discs max, Deluxe: all 5 rigs)
  const [availability, setAvailability] = useState<{
    available: boolean;
    availableRigsCount: number;
    bookedRigsCount: number;
    gameAvailable: boolean;
    gameCopiesLeft: number;
    totalGameCopies: number;
    isGta6: boolean;
    isDeluxeDigital: boolean;
    message: string;
  } | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const activeGame = POPULAR_CAROUSEL_GAMES[currentSlide];

  // Auto-check slot availability whenever date, time, duration or requested game changes
  useEffect(() => {
    let isMounted = true;
    if (!visitDate || !visitTime) return;
    setCheckingAvailability(true);
    const targetGame = selectedGameForBooking || activeGame.title;
    checkSlotFn({
      data: {
        visitDate,
        visitTime,
        durationHours,
        gameTitle: targetGame,
      },
    })
      .then((res) => {
        if (isMounted && res) {
          setAvailability(res);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setCheckingAvailability(false);
      });
    return () => {
      isMounted = false;
    };
  }, [visitDate, visitTime, durationHours, selectedGameForBooking, activeGame.title]);

  // Auto-play carousel timer
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % POPULAR_CAROUSEL_GAMES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused]);

  function handlePrev() {
    setCurrentSlide((prev) =>
      prev === 0 ? POPULAR_CAROUSEL_GAMES.length - 1 : prev - 1
    );
  }

  function handleNext() {
    setCurrentSlide((prev) => (prev + 1) % POPULAR_CAROUSEL_GAMES.length);
  }

  function toggleFavorite(id: string) {
    setFavoritedGames((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function openBookingForGame(gameTitle: string) {
    setSelectedGameForBooking(gameTitle);
    setSubmitted(false);
    setErrorMessage("");
    const modalEl = document.getElementById("booking-dialog");
    if (modalEl) {
      modalEl.scrollIntoView({ behavior: "smooth" });
    }
  }

  // Filter remaining catalog games
  const filteredCatalog = useMemo(() => {
    return GAMES_LIST.filter((game) => {
      let matchesFilter = true;
      if (activeFilter === "all") {
        matchesFilter = true;
      } else if (activeFilter === "ps-plus") {
        matchesFilter = game.source === "ps-plus";
      } else if (activeFilter === "disc") {
        matchesFilter = game.source === "disc";
      } else if (activeFilter === "multiplayer") {
        matchesFilter =
          game.genre === "multiplayer" ||
          game.players.toLowerCase().includes("players") ||
          game.players.toLowerCase().includes("co-op");
      } else {
        matchesFilter = game.genre === activeFilter;
      }

      const matchesSearch =
        searchQuery.trim() === "" ||
        game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.genreLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (game.badge && game.badge.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, searchQuery]);

  async function handleBookingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitted(false);
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const rawNotes = String(formData.get("notes") ?? "");
    const targetGame = selectedGameForBooking || activeGame.title;
    const finalNotes =
      targetGame && !rawNotes.includes(targetGame)
        ? `Game requested: ${targetGame}${rawNotes ? ` | ${rawNotes}` : ""}`
        : rawNotes;

    const result = await sendBookingRequest({
      data: {
        customerName: String(formData.get("customerName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        contactMethod,
        visitDate: String(formData.get("visitDate") ?? ""),
        visitTime: String(formData.get("visitTime") ?? ""),
        partySize,
        durationHours,
        gameGenre: "any",
        notes: finalNotes,
        website: String(formData.get("website") ?? ""),
      },
    }).catch(() => null);

    if (result?.success) {
      event.currentTarget.reset();
      setDurationHours(1);
      setPartySize(1);
      setContactMethod("whatsapp");
      setSubmitted(true);
    } else {
      setErrorMessage("We couldn’t save your request. Please check your details and try again.");
    }
    setSubmitting(false);
  }

  const estimatedTotal = calculateSessionPrice(partySize, durationHours);

  return (
    <main className="min-h-screen bg-[#050819] text-foreground antialiased selection:bg-[#FFB800] selection:text-black">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050819]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-3.5 group"
            aria-label="Friendz Arena Home"
          >
            <div className="relative size-12 shrink-0 overflow-hidden rounded-full border-2 border-cyan-400/80 bg-[#081348] p-1 shadow-lg shadow-cyan-500/25 transition-transform group-hover:scale-105">
              <img
                src="/logo.png"
                alt="Friendz Arena Mascot Crest"
                className="size-full rounded-full object-contain"
              />
            </div>
            <span className="min-w-0">
              <span className="block truncate font-display text-base font-extrabold uppercase tracking-tight text-white sm:text-lg group-hover:text-cyan-300 transition-colors">
                Friendz Arena
              </span>
              <span className="block text-[11px] font-semibold tracking-wider text-[#23C8F3] uppercase">
                90+ PS5 Games
              </span>
            </span>
          </Link>

          {/* Sub Navigation Bar - IMDb / Entertainment Style Tabs */}
          <nav
            className="hidden items-center gap-7 text-xs font-bold uppercase tracking-wider text-muted-foreground md:flex"
            aria-label="Main games navigation"
          >
            <Link to="/" className="transition-colors hover:text-white">
              Home
            </Link>
            <a href="#popular-5" className="text-[#23C8F3] transition-colors">
              Popular 5 (3D)
            </a>
            <a href="#all-games" className="transition-colors hover:text-white">
              All 90+ Games
            </a>
            <a href="/#rates" className="transition-colors hover:text-white">
              Rates
            </a>
            <a href="/#stations" className="transition-colors hover:text-white">
              5 Rigs
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => openBookingForGame(activeGame.title)}
              className="btn-chamfer inline-flex items-center gap-1.5 bg-[#FFB800] px-5 py-2.5 font-display text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-amber-500/20"
            >
              Book Rig Now
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* HERO SECTION: CREATIVE 3D BREAKOUT CAROUSEL (5 POPULAR GAMES)            */}
      {/* Matching the Reference Green Lantern / IMDb Entertainment Showcase Design */}
      {/* ========================================================================= */}
      <section
        id="popular-5"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative isolate overflow-hidden border-b border-white/10 pt-8 pb-16 sm:pt-12 sm:pb-24"
      >
        {/* Dynamic Ambient Glow Behind Active Game */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -top-24 left-1/2 -z-10 h-[40rem] w-[70rem] -translate-x-1/2 rounded-full bg-gradient-to-b ${activeGame.colorTheme.glow} blur-[160px] transition-all duration-1000`}
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Top Breadcrumb / Category Tag */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-display text-xs font-bold uppercase tracking-widest text-[#23C8F3]">
                Top 5 Blockbusters Showcase
              </span>
              <span className="text-white/30">/</span>
              <span className="text-xs text-muted-foreground">
                3D Character Breakout Experience
              </span>
            </div>

            {/* Slide Navigation Controls */}
            <div className="flex items-center gap-2">
              <span className="font-display text-xs font-bold text-muted-foreground">
                {activeGame.index} / 05
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex size-8 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition-all hover:border-cyan-400 hover:bg-cyan-950/40 hover:text-cyan-300"
                  aria-label="Previous game"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex size-8 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition-all hover:border-cyan-400 hover:bg-cyan-950/40 hover:text-cyan-300"
                  aria-label="Next game"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {/* MAIN HERO CARD (Matching Reference Layout Structure) */}
          <div className="relative rounded-3xl border border-white/10 bg-[#080E24]/80 p-6 shadow-2xl backdrop-blur-2xl sm:p-10 lg:p-12">
            {/* Background Grid Accent */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/[0.04] via-transparent to-transparent"
            />

            <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
              {/* LEFT COLUMN: Title, Tagline, Action Preview Button, Search Bar */}
              <div className="relative z-10 lg:col-span-4">
                {/* Category Badge */}
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-display text-[10px] font-black uppercase tracking-wider backdrop-blur-md transition-colors ${activeGame.colorTheme.badgeBorder}`}
                >
                  <Gamepad2 className="size-3" />
                  <span>{activeGame.categoryLabel}</span>
                </div>

                {/* Main Big Title (Like 'Green Lantern' in Reference) */}
                <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-white transition-all duration-500 sm:text-5xl lg:text-6xl">
                  {activeGame.title}
                </h1>

                {/* Sub-meta (Like '★ June 14 - 2020 in Lagos, Nigeria') */}
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <span className="flex text-amber-400">
                    <Star className="size-3.5 fill-current" />
                  </span>
                  <span className="text-white/90">{activeGame.subMeta}</span>
                </div>

                {/* Action Buttons: 'Preview Trailer' & 'Book Station' (Matching Reference) */}
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const t = GAME_TRAILERS[activeGame.id];
                      if (t) setActiveTrailer(t);
                    }}
                    className="group inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/5 py-2 pl-2 pr-5 font-display text-xs font-bold uppercase tracking-wider text-white transition-all hover:border-cyan-400 hover:bg-cyan-950/40"
                  >
                    <span className="flex size-9 items-center justify-center rounded-full bg-[#FFB800] text-black shadow-lg transition-transform group-hover:scale-110">
                      <Play className="size-4 fill-current ml-0.5" />
                    </span>
                    <span>Preview Trailer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openBookingForGame(activeGame.title)}
                    className="btn-chamfer inline-flex items-center gap-2 bg-[#23C8F3] px-5 py-2.5 font-display text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-cyan-500/20"
                  >
                    <Gamepad2 className="size-3.5" />
                    <span>Book Rig</span>
                  </button>
                </div>

                {/* Search Bar (Matching Reference bottom left search input) */}
                <div className="mt-8 max-w-xs">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Quick search 90+ games..."
                      className="w-full rounded-full border border-white/10 bg-black/40 py-2 pl-9 pr-4 text-xs text-white placeholder:text-muted-foreground focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* CENTER COLUMN: THE 3D BREAKOUT CHARACTER (Like Green Lantern Breaking Out of Card) */}
              <div className="relative flex items-center justify-center lg:col-span-5 min-h-[340px] sm:min-h-[420px] lg:min-h-[480px]">
                {/* Radial Glow Burst Behind Character */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute size-72 sm:size-96 rounded-full bg-cyan-400/15 blur-[100px] transition-all duration-700"
                />

                {/* 3D Breakout Character Graphic with Floating Elevation */}
                <div className="relative z-20 w-full flex items-center justify-center">
                  <img
                    key={activeGame.id}
                    src={activeGame.breakoutImage}
                    alt={`${activeGame.title} 3D Character Breakout`}
                    className="relative max-h-[380px] sm:max-h-[460px] lg:max-h-[520px] w-auto object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.85)] animate-float-hero transition-all duration-700"
                  />
                </div>

                {/* Carousel Indicator Dots (Matching Reference '○ ○ ● ○') */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 backdrop-blur-md">
                  {POPULAR_CAROUSEL_GAMES.map((game, i) => (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => setCurrentSlide(i)}
                      className={`size-2.5 rounded-full transition-all ${
                        currentSlide === i
                          ? "bg-cyan-400 scale-125 shadow-md shadow-cyan-400/50"
                          : "bg-white/30 hover:bg-white/60"
                      }`}
                      aria-label={`Go to slide ${i + 1}: ${game.title}`}
                    />
                  ))}
                </div>
              </div>

              {/* RIGHT COLUMN: Vertical Poster Card + Game Specs & Rig Info (Matching Reference) */}
              <div className="relative z-10 lg:col-span-3">
                <div className="rounded-2xl border border-white/10 bg-[#060A1D]/90 p-3.5 shadow-xl">
                  {/* Poster Art with Heart / Favorite Icon */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-black">
                    <img
                      src={activeGame.posterImage}
                      alt={`${activeGame.title} official cover`}
                      className="size-full object-cover object-center transition-transform duration-500 hover:scale-105"
                    />

                    {/* Bookmark / Heart Toggle in Top Left Corner */}
                    <button
                      type="button"
                      onClick={() => toggleFavorite(activeGame.id)}
                      className="absolute top-2.5 left-2.5 flex size-8 items-center justify-center rounded-lg bg-black/70 backdrop-blur-md transition-colors hover:bg-black"
                      aria-label="Add to favorites"
                    >
                      <Heart
                        className={`size-4 transition-colors ${
                          favoritedGames[activeGame.id]
                            ? "fill-red-500 text-red-500"
                            : "text-white/80 hover:text-white"
                        }`}
                      />
                    </button>

                    {/* Badge in Bottom Corner */}
                    <div className="absolute bottom-2.5 right-2.5 rounded bg-black/85 px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider text-[#FFB800] backdrop-blur-md">
                      {activeGame.releaseBadge}
                    </div>
                  </div>

                  {/* Under Poster Info */}
                  <div className="mt-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display text-sm font-bold text-white truncate">
                        {activeGame.title}
                      </h4>
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="size-2.5 fill-current" />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 border-t border-white/10 pt-2 text-[11px] text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Station:</span>
                        <span className="font-semibold text-white">{activeGame.stationRig}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Display:</span>
                        <span className="font-semibold text-cyan-300">
                          {activeGame.displaySpecs}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Multiplayer:</span>
                        <span className="font-semibold text-white">{activeGame.playersInfo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Studio:</span>
                        <span className="font-semibold text-white/90">{activeGame.studio}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================= */}
            {/* BOTTOM BAR: NUMBER, RATING, GENRES, SYNOPSIS, CONTROLS        */}
            {/* (Matching Reference '03 Green Lantern' Bottom Section)       */}
            {/* ============================================================= */}
            <div
              className={`mt-10 rounded-2xl border p-5 sm:p-7 transition-all duration-700 ${activeGame.colorTheme.bottomBar}`}
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                {/* Big Number & Game Title (Like '03 Green Lantern' in Reference) */}
                <div className="flex items-center gap-5 shrink-0">
                  <span className="font-display text-5xl sm:text-6xl font-black tracking-tighter text-white/90">
                    {activeGame.index}
                  </span>
                  <div>
                    <h3 className="font-display text-base sm:text-lg font-black uppercase text-white">
                      {activeGame.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => openBookingForGame(activeGame.title)}
                        className="inline-flex items-center gap-1 font-bold text-white hover:underline"
                      >
                        <Plus className="size-3" /> Quick Book
                      </button>
                      <span className="text-white/40">•</span>
                      <button
                        type="button"
                        onClick={() => {
                          const t = GAME_TRAILERS[activeGame.id];
                          if (t) setActiveTrailer(t);
                        }}
                        className="inline-flex items-center gap-1 font-bold text-[#FFB800] hover:underline"
                      >
                        <Play className="size-3 fill-current" /> Watch Trailer
                      </button>
                    </div>
                  </div>
                </div>

                {/* Center Content: Star Rating, Genre Pills, Rich Synopsis */}
                <div className="max-w-2xl flex-1 lg:px-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="size-3.5 fill-current" />
                      ))}
                    </div>
                    <span className="font-display text-xs font-bold text-white">
                      Rating: {activeGame.rating}/10
                    </span>
                    <span className="text-white/30">•</span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeGame.genreTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-black/30 px-2 py-0.5 font-display text-[9px] font-black uppercase tracking-wider text-white/90"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-white/85">
                    {activeGame.synopsis}
                  </p>
                </div>

                {/* Right Action: Chamfered Book Button + Carousel Arrow Navigation */}
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => openBookingForGame(activeGame.title)}
                    className="btn-chamfer inline-flex items-center gap-2 bg-[#FFB800] px-5 py-2.5 font-display text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-amber-500/20"
                  >
                    <Play className="size-3.5 fill-current" /> Play Today
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="flex size-9 items-center justify-center rounded-lg border border-white/20 bg-black/40 text-white hover:bg-white/10"
                      aria-label="Previous slide"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex size-9 items-center justify-center rounded-lg border border-white/20 bg-black/40 text-white hover:bg-white/10"
                      aria-label="Next slide"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* REST OF THE GAMES CATALOG (BELOW HERO CAROUSEL)                           */}
      {/* "and below it should show the rest"                                       */}
      {/* ========================================================================= */}
      <section id="all-games" className="py-16 sm:py-24 border-b border-white/10 bg-[#070B1E]">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-950/40 px-3.5 py-1.5 font-display text-xs font-semibold text-cyan-300">
                <Sparkles className="size-3.5" />
                <span>Complete PS5 Collection</span>
              </div>
              <h2 className="mt-3 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl md:text-5xl">
                Browse All{" "}
                <span className="bg-gradient-to-r from-[#23C8F3] via-[#A855F7] to-[#EC4899] bg-clip-text text-transparent">
                  90+ Games
                </span>
              </h2>
              <p className="mt-3 text-sm text-muted-foreground sm:text-base leading-relaxed">
                PlayStation Plus Deluxe library + in-lounge physical discs. Every game is installed and
                ready to boot instantly on our five PS5 rigs.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-display text-xs text-muted-foreground">
                Showing <span className="font-bold text-[#FFB800]">{filteredCatalog.length}</span> of{" "}
                <span className="font-bold text-white">{GAMES_LIST.length}</span> games
              </div>
            </div>
          </div>

          {/* Search Bar & Genre Filter Pills */}
          <div className="mt-10 space-y-4">
            <div className="relative max-w-md">
              <Search
                aria-hidden="true"
                className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search games (e.g. Cricket 24, GTA 6, EA FC, Tekken, Spider-Man)..."
                className="rounded-full border-white/10 bg-[#0E1538] pl-10 pr-9 text-sm text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Genre Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {GENRE_FILTERS.map((filter) => {
                const isActive = activeFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveFilter(filter.value)}
                    className={`rounded-full px-4 py-1.5 font-display text-xs font-bold transition-all ${
                      isActive
                        ? "bg-[#FFB800] text-black shadow-md shadow-amber-500/20"
                        : "border border-white/10 bg-white/5 text-muted-foreground hover:border-white/30 hover:text-white"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Games Grid */}
          {filteredCatalog.length === 0 ? (
            <div className="mt-14 rounded-2xl border border-dashed border-white/10 py-16 text-center">
              <Gamepad2 className="mx-auto size-12 text-muted-foreground/60" />
              <h3 className="mt-4 font-display text-lg font-bold text-white">
                No games matched your search
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try searching for a different title or reset your filters above.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-5 rounded-full"
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter("all");
                }}
              >
                Reset filters
              </Button>
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredCatalog.map((game) => (
                <article
                  key={game.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0E1538]/80 transition-all duration-300 hover:-translate-y-1 hover:border-[#FFB800]/80 hover:shadow-xl hover:shadow-amber-500/5"
                >
                  {/* Game Cover */}
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted/20">
                    <img
                      src={game.cover}
                      alt={`${game.title} cover`}
                      width={300}
                      height={450}
                      loading="lazy"
                      className="size-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Badge */}
                    {game.badge && (
                      <span
                        className={`absolute left-2 top-2 rounded px-2 py-0.5 font-display text-[9px] font-black uppercase tracking-wider shadow ${
                          game.badge.includes("Day 1")
                            ? "bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-fuchsia-950/60"
                            : "bg-[#FFB800] text-black"
                        }`}
                      >
                        {game.badge}
                      </span>
                    )}

                    {/* Player count */}
                    <span className="absolute bottom-2 right-2 rounded bg-black/85 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
                      {game.players}
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="flex flex-1 flex-col p-3 sm:p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#23C8F3]">
                      {game.genreLabel}
                    </p>
                    <h3 className="mt-1 line-clamp-1 font-display text-sm font-bold text-white sm:text-base">
                      {game.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {game.tagline}
                    </p>

                    <div className="mt-auto pt-3">
                      <button
                        type="button"
                        onClick={() => openBookingForGame(game.title)}
                        className="w-full rounded-md border border-white/10 bg-white/5 py-1.5 font-display text-xs font-semibold text-white transition-all hover:bg-[#FFB800] hover:text-black hover:border-[#FFB800]"
                      >
                        Request Game
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* QUICK IN-PAGE SESSION BOOKING REQUEST DIALOG                              */}
      {/* ========================================================================= */}
      <section id="booking-dialog" className="py-16 sm:py-24 bg-[#050819] border-b border-white/10">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <div className="rounded-3xl border border-white/10 bg-[#081348]/60 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-widest text-[#FFB800]">
                  READY FOR YOUR PS5 SESSION?
                </p>
                <h3 className="mt-2 font-display text-2xl sm:text-3xl font-black uppercase text-white">
                  Request Station Booking
                </h3>
              </div>
              {selectedGameForBooking && (
                <div className="rounded-full border border-cyan-400/50 bg-cyan-950/40 px-4 py-1.5 text-xs font-bold text-cyan-300">
                  Game: <strong className="text-white">{selectedGameForBooking}</strong>
                </div>
              )}
            </div>

            {/* Live Backend Slot Availability Badge */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex size-2.5 rounded-full ${
                      checkingAvailability
                        ? "bg-amber-400 animate-pulse"
                        : availability?.isAvailable
                        ? "bg-emerald-400 animate-ping"
                        : "bg-red-500"
                    }`}
                  />
                  <span className="font-display text-xs font-bold uppercase tracking-wider text-white">
                    Live PS5 Station Availability
                  </span>
                </div>
                {checkingAvailability ? (
                  <span className="text-xs text-muted-foreground animate-pulse">Checking slot & game copies...</span>
                ) : availability ? (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wider ${
                      availability.available && availability.gameAvailable
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-red-500/20 text-red-300 border border-red-500/40"
                    }`}
                  >
                    {availability.available && availability.gameAvailable
                      ? availability.isGta6
                        ? `🟢 Rig Free & GTA VI Disc (${availability.gameCopiesLeft} of 2 Discs Free)`
                        : `🟢 ${availability.availableRigsCount} of 5 Rigs Free (PlayStation Plus Deluxe on All Rigs)`
                      : availability.isGta6 && !availability.gameAvailable
                      ? "⚠️ 2 of 2 GTA VI Discs Booked for this slot"
                      : "🔴 All 5 Stations Booked"}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {availability ? availability.message : "Checking live PS5 stations..."}
              </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleBookingSubmit}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customerName" className="text-xs font-bold uppercase tracking-wider text-white">
                    Your Name
                  </Label>
                  <Input
                    id="customerName"
                    name="customerName"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="Enter your name"
                    className="rounded-xl border-white/10 bg-[#0E1538] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-white">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    minLength={7}
                    maxLength={20}
                    pattern="[+()0-9 -]{7,20}"
                    placeholder="e.g. 8498833389"
                    className="rounded-xl border-white/10 bg-[#0E1538] text-white"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="visitDate" className="text-xs font-bold uppercase tracking-wider text-white">
                    Preferred Date
                  </Label>
                  <Input
                    id="visitDate"
                    name="visitDate"
                    type="date"
                    required
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="rounded-xl border-white/10 bg-[#0E1538] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visitTime" className="text-xs font-bold uppercase tracking-wider text-white">
                    Start Time
                  </Label>
                  <Input
                    id="visitTime"
                    name="visitTime"
                    type="time"
                    required
                    value={visitTime}
                    onChange={(e) => setVisitTime(e.target.value)}
                    className="rounded-xl border-white/10 bg-[#0E1538] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partySize" className="text-xs font-bold uppercase tracking-wider text-white">
                    Number of Players
                  </Label>
                  <Input
                    id="partySize"
                    type="number"
                    min={1}
                    max={5}
                    value={partySize}
                    onChange={(event) =>
                      setPartySize(Math.min(5, Math.max(1, Number(event.target.value) || 1)))
                    }
                    className="rounded-xl border-white/10 bg-[#0E1538] text-white"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-white">
                    Duration & Group Total
                  </Label>
                  <Select
                    value={String(durationHours)}
                    onValueChange={(value) => setDurationHours(Number(value) as SessionDuration)}
                  >
                    <SelectTrigger className="rounded-xl border-white/10 bg-[#0E1538] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#0E1538] text-white">
                      {SESSION_DURATIONS.map((hours) => (
                        <SelectItem key={hours} value={String(hours)}>
                          {hours} {hours === 1 ? "hour" : "hours"} · ₹
                          {calculateSessionPrice(partySize, hours)} total
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-white">
                    Confirm Via
                  </Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setContactMethod("whatsapp")}
                      className={`flex-1 rounded-xl py-2.5 font-display text-xs font-bold border transition-all ${
                        contactMethod === "whatsapp"
                          ? "bg-[#FFB800] text-black border-[#FFB800]"
                          : "border-white/10 bg-[#0E1538] text-muted-foreground hover:text-white"
                      }`}
                    >
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setContactMethod("phone")}
                      className={`flex-1 rounded-xl py-2.5 font-display text-xs font-bold border transition-all ${
                        contactMethod === "phone"
                          ? "bg-[#FFB800] text-black border-[#FFB800]"
                          : "border-white/10 bg-[#0E1538] text-muted-foreground hover:text-white"
                      }`}
                    >
                      Phone Call
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-white">
                  Specific Requests or Additional Games
                </Label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  defaultValue={
                    selectedGameForBooking ? `Game selected: ${selectedGameForBooking}` : ""
                  }
                  key={selectedGameForBooking}
                  placeholder="e.g. Need 2 controllers, GTA VI Day 1 priority, EA FC 24 multiplayer..."
                  className="w-full rounded-xl border border-white/10 bg-[#0E1538] p-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#FFB800]"
                />
              </div>

              {/* Honeypot */}
              <div aria-hidden="true" className="absolute -left-[10000px] size-px overflow-hidden">
                <label htmlFor="website">Leave empty</label>
                <input id="website" name="website" tabIndex={-1} autoComplete="off" />
              </div>

              {errorMessage && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {errorMessage}
                </p>
              )}

              {submitted && (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-sm text-emerald-200">
                  <Check className="size-5 text-emerald-400 mt-0.5" />
                  <p>
                    <strong className="text-white">Request Sent!</strong> Friendz Arena will confirm
                    station availability with you shortly via {contactMethod}.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-white/10 pt-5">
                <div>
                  <span className="text-xs text-muted-foreground">Estimated Total</span>
                  <p className="font-display text-2xl font-black text-[#FFB800]">
                    ₹{estimatedTotal}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* One-Tap WhatsApp Instant Booking */}
                  <a
                    href={`https://wa.me/918498833389?text=${encodeURIComponent(
                      `Hello Friendz Arena! 🎮 I'd like to book a PS5 session:\n\n` +
                      `🕹️ Game: ${selectedGameForBooking || activeGame.title}\n` +
                      `📅 Date: ${visitDate}\n` +
                      `⏰ Start Time: ${visitTime}\n` +
                      `👥 Players: ${partySize} (${durationHours} hr session)\n` +
                      `💰 Est. Total: ₹${estimatedTotal}\n\n` +
                      `Please confirm station slot availability!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950/60 px-5 py-3 font-display text-xs font-black uppercase tracking-wider text-emerald-300 hover:bg-emerald-900/60 transition-all shadow-lg"
                  >
                    <MessageCircle className="size-4 fill-current text-emerald-400" />
                    <span>One-Tap WhatsApp</span>
                  </a>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-chamfer inline-flex items-center gap-2 bg-[#FFB800] px-7 py-3.5 font-display text-xs font-black uppercase tracking-wider text-black shadow-xl shadow-amber-500/20 disabled:opacity-50"
                  >
                    {submitting ? "Sending..." : "Submit Online"}
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#050819] py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 sm:flex-row sm:px-8">
          <div className="flex items-center gap-3">
            <div className="size-10 overflow-hidden rounded-full border border-cyan-400 bg-[#081348] p-1">
              <img
                src="/logo.png"
                alt="Friendz Arena Logo"
                className="size-full rounded-full object-contain"
              />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-white uppercase">Friendz Arena</p>
              <p className="text-xs text-muted-foreground">PS5 Gaming Lounge · Jangareddygudem</p>
            </div>
          </div>

          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <a href="/#rates" className="hover:text-white transition-colors">
              Rates
            </a>
            <a href="/#stations" className="hover:text-white transition-colors">
              5 Rigs
            </a>
            <a href="/#book" className="hover:text-[#FFB800] transition-colors">
              Book
            </a>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Friendz Arena. All Rights Reserved.
          </p>
        </div>
      </footer>

      {/* Video Trailer / Gameplay Lightbox Modal */}
      {activeTrailer && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6"
          onClick={() => setActiveTrailer(null)}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/20 bg-[#080E24] p-4 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-[#FFB800] text-black">
                  <Play className="size-3.5 fill-current ml-0.5" />
                </span>
                <h3 className="font-display text-base font-bold text-white uppercase truncate">
                  {activeTrailer.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTrailer(null)}
                className="flex size-8 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/20"
                aria-label="Close trailer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-2xl bg-black">
              <iframe
                src={activeTrailer.embedUrl}
                title={activeTrailer.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="size-full border-0"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                4K High-Refresh HDR · PlayStation 5 Experience at Friendz Arena
              </span>
              <button
                type="button"
                onClick={() => {
                  const currentTitle = activeGame.title;
                  setActiveTrailer(null);
                  openBookingForGame(currentTitle);
                }}
                className="btn-chamfer inline-flex items-center gap-2 bg-[#FFB800] px-5 py-2.5 font-display text-xs font-black uppercase tracking-wider text-black"
              >
                Book This Station Rig Now <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
