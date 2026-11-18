import { useState, useEffect, useMemo, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Check,
  Calendar as CalendarIcon,
  Clock3,
  ExternalLink,
  Flame,
  Gamepad2,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquarePlus,
  Monitor,
  Navigation,
  Phone,
  Search,
  Sparkles,
  Star,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import loungeImage from "@/assets/gaming-lounge.jpg";
import adventurePoster from "@/assets/game-posters/adventure.jpg";
import fightingPoster from "@/assets/game-posters/fighting.jpg";
import multiplayerPoster from "@/assets/game-posters/multiplayer.jpg";
import openWorldPoster from "@/assets/game-posters/open-world.jpg";
import racingPoster from "@/assets/game-posters/racing.jpg";
import sportsPoster from "@/assets/game-posters/sports.jpg";
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
import {
  submitBookingRequest,
  checkSlotAvailabilityFn,
  getDaySlotsAvailabilityFn,
  getPublicTestimonialsFn,
  submitTestimonialFn,
} from "@/lib/booking.functions";
import { GAMES_LIST, GENRE_FILTERS, type GameItem } from "@/data/games";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" },
      { title: "Friendz Arena | Your Portal to Epic PS5 Gaming" },
      {
        name: "description",
        content:
          "Friendz Arena is Jangareddygudem's premier PS5 gaming lounge. Five next-gen stations, 90+ games with PlayStation Plus Deluxe, GTA VI Day 1 arrival, and transparent hourly group pricing.",
      },
      { property: "og:title", content: "Friendz Arena | Your Portal to Epic PS5 Gaming" },
      {
        property: "og:description",
        content:
          "Five PS5 stations, 90+ games with PlayStation Plus Deluxe, GTA VI Day 1 arrival, and group session prices at Friendz Arena in Jangareddygudem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const gameGenres = [
  {
    genreKey: "sports",
    label: "Sports & Cricket",
    detail: "Kick off with EA FC 24, Cricket 24 & WWE 2K24",
    poster: sportsPoster,
    alt: "Football and sports match under stadium lights",
  },
  {
    genreKey: "racing",
    label: "Racing",
    detail: "High-speed NFS Unbound, The Crew & DIRT 5",
    poster: racingPoster,
    alt: "A racing car speeding through a neon-lit city",
  },
  {
    genreKey: "fighting",
    label: "Fighting",
    detail: "TEKKEN 8, Mortal Kombat 11 & Street Fighter V",
    poster: fightingPoster,
    alt: "Two masked fighters facing off in an arena",
  },
  {
    genreKey: "action-adventure",
    label: "Action & Adventure",
    detail: "Spider-Man 2, God of War Ragnarok & Bloodborne",
    poster: adventurePoster,
    alt: "An explorer discovering a jungle ruin",
  },
  {
    genreKey: "open-world",
    label: "Open World",
    detail: "GTA VI (Day 1), GTA V, Red Dead 2 & Tsushima",
    poster: openWorldPoster,
    alt: "A rider overlooking a futuristic city",
  },
  {
    genreKey: "multiplayer",
    label: "Multiplayer & Co-op",
    detail: "It Takes Two, A Way Out & Overcooked",
    poster: multiplayerPoster,
    alt: "A team of heroes ready to play together",
  },
];

const HERO_SQUAD_CHARACTERS = [
  {
    id: "gta-6",
    characterName: "Lucia & Jason",
    gameTitle: "Grand Theft Auto VI",
    badge: "🔥 Day 1 on PS5",
    genre: "open-world",
    genreLabel: "Vice City Open World",
    specs: "4K 60FPS · Ray Tracing",
    description: "Rockstar's neon Vice City on launch day without buying a ₹50,000 console.",
    image: "/games/gta-6.jpg",
    accentColor: "border-fuchsia-500/50 text-fuchsia-400 bg-fuchsia-950/30",
    glowColor: "from-fuchsia-500/20 to-transparent",
    btnColor: "hover:bg-fuchsia-500 hover:text-white hover:border-fuchsia-500",
  },
  {
    id: "spiderman-2",
    characterName: "Peter & Miles",
    gameTitle: "Marvel's Spider-Man 2",
    badge: "🕸️ PS5 Exclusive",
    genre: "action-adventure",
    genreLabel: "Dual Web-Slingers",
    specs: "Near-Zero Fast Travel",
    description: "High-speed swings through Manhattan with adaptive triggers and symbiote powers.",
    image: "/games/marvels-spider-man-2.jpg",
    accentColor: "border-cyan-500/50 text-cyan-400 bg-cyan-950/30",
    glowColor: "from-cyan-500/20 to-transparent",
    btnColor: "hover:bg-cyan-400 hover:text-black hover:border-cyan-400",
  },
  {
    id: "god-of-war",
    characterName: "Kratos & Atreus",
    gameTitle: "God of War Ragnarök",
    badge: "⚡ 4K 60FPS HDR",
    genre: "action-adventure",
    genreLabel: "Nine Realms Legend",
    specs: "Cinematic Surround Audio",
    description: "Feel every Leviathan Axe throw and shield bash through DualSense haptic feedback.",
    image: "/games/god-of-war-ragnarok.jpg",
    accentColor: "border-purple-500/50 text-purple-400 bg-purple-950/30",
    glowColor: "from-purple-500/20 to-transparent",
    btnColor: "hover:bg-purple-500 hover:text-white hover:border-purple-500",
  },
  {
    id: "tekken-8",
    characterName: "Jin Kazama",
    gameTitle: "TEKKEN 8",
    badge: "🥊 1v1 Zero-Lag",
    genre: "fighting",
    genreLabel: "Iron Fist Striker",
    specs: "Unreal Engine 5 Next-Gen",
    description: "Aggressive Heat System fights on low-latency screens. Bring your rival and settle it.",
    image: "/games/tekken-8.jpg",
    accentColor: "border-amber-500/50 text-amber-400 bg-amber-950/30",
    glowColor: "from-amber-500/20 to-transparent",
    btnColor: "hover:bg-[#FFB800] hover:text-black hover:border-[#FFB800]",
  },
  {
    id: "ea-fc-24",
    characterName: "Pitch Champions",
    gameTitle: "EA SPORTS FC 24",
    badge: "⚽ 4P Local Derby",
    genre: "sports",
    genreLabel: "Multiplayer Derby",
    specs: "HyperMotionV Physics",
    description: "The ultimate 4-controller couch derby. Champions League nights with your squad.",
    image: "/games/ea-sports-fc-24.jpg",
    accentColor: "border-emerald-500/50 text-emerald-400 bg-emerald-950/30",
    glowColor: "from-emerald-500/20 to-transparent",
    btnColor: "hover:bg-emerald-500 hover:text-white hover:border-emerald-500",
  },
];

const ARENA_STATIONS = [
  {
    number: "01",
    name: "DualSense 1v1 Arena",
    featuredGame: "EA SPORTS FC 24",
    secondaryGame: "Cricket 24 · WWE 2K24",
    cover: "/games/ea-sports-fc-24.jpg",
    genre: "sports",
    tag: "Sports & Cricket",
    badge: "1v1 & 2v2 Battle",
    accentColor: "border-cyan-500/40 text-cyan-400 bg-cyan-950/30",
    glowColor: "from-cyan-500/20 to-transparent",
  },
  {
    number: "02",
    name: "Vice City Ready",
    featuredGame: "GTA VI & GTA V",
    secondaryGame: "4K 60FPS Ray Tracing",
    cover: "/games/gta-6.jpg",
    genre: "open-world",
    tag: "Open World Action",
    badge: "🔥 Day 1 on PS5",
    accentColor: "border-fuchsia-500/50 text-fuchsia-400 bg-fuchsia-950/30",
    glowColor: "from-fuchsia-500/20 to-transparent",
  },
  {
    number: "03",
    name: "Fighting Colosseum",
    featuredGame: "TEKKEN 8",
    secondaryGame: "Mortal Kombat 11 · SFV",
    cover: "/games/tekken-8.jpg",
    genre: "fighting",
    tag: "Competitive Fighting",
    badge: "Zero-Lag 60FPS",
    accentColor: "border-emerald-500/40 text-emerald-400 bg-emerald-950/30",
    glowColor: "from-emerald-500/20 to-transparent",
  },
  {
    number: "04",
    name: "PlayStation Exclusives",
    featuredGame: "Marvel's Spider-Man 2",
    secondaryGame: "God of War · Tsushima",
    cover: "/games/marvels-spider-man-2.jpg",
    genre: "action-adventure",
    tag: "Action & Adventure",
    badge: "Cinematic 4K HDR",
    accentColor: "border-purple-500/40 text-purple-400 bg-purple-950/30",
    glowColor: "from-purple-500/20 to-transparent",
  },
  {
    number: "05",
    name: "Co-op Squad Lounge",
    featuredGame: "It Takes Two",
    secondaryGame: "A Way Out · Overcooked",
    cover: "/games/it-takes-two.jpg",
    genre: "multiplayer",
    tag: "Multiplayer Co-op",
    badge: "2–4 Friends Fun",
    accentColor: "border-amber-500/40 text-amber-400 bg-amber-950/30",
    glowColor: "from-amber-500/20 to-transparent",
  },
];

const TESTIMONIALS = [
  {
    name: "Ailani Wyatt",
    role: "FIFA & Cricket Regular",
    initial: "AW",
    stars: 5,
    bgColor: "bg-gradient-to-b from-[#23C8F3] to-[#0284C7] text-black",
    cardAngle: "rotate-[-2deg]",
    avatarBg: "bg-black/20 text-black",
    text: "This gaming lounge exceeded all my expectations! The graphics on the 4K screens are breathtaking, and gameplay is ultra smooth. Cricket 24 with 4 friends was non-stop fun!",
  },
  {
    name: "Keira Roy",
    role: "Tourney Player",
    initial: "KR",
    stars: 5,
    bgColor: "bg-gradient-to-b from-[#A855F7] to-[#7E22CE] text-white",
    cardAngle: "rotate-[1.5deg]",
    avatarBg: "bg-white/20 text-white",
    text: "The local multiplayer mode is a lot of fun. Controllers are perfectly balanced and genuinely responsive. Can't wait for GTA 6 launch day on these PS5 stations!",
  },
  {
    name: "Sam Lopez",
    role: "Regular Visitor",
    initial: "SL",
    stars: 5,
    bgColor: "bg-gradient-to-b from-[#059669] to-[#047857] text-white",
    cardAngle: "rotate-[-1.5deg]",
    avatarBg: "bg-white/20 text-white",
    text: "Plus, the regular game updates with new titles make it even better. Highly recommended for anyone looking for an exciting and immersive gaming experience in Jangareddygudem!",
  },
  {
    name: "Gianna McGee",
    role: "Weekend Squad",
    initial: "GM",
    stars: 5,
    bgColor: "bg-gradient-to-b from-[#84CC16] to-[#4D7C0F] text-black",
    cardAngle: "rotate-[2deg]",
    avatarBg: "bg-black/20 text-black",
    text: "Absolutely love this gaming spot! The gameplay on PS5 is incredibly smooth, and group pricing is super reasonable (₹150 for 2 players). The vibe kept us hooked for 3 hours straight!",
  },
];

function Index() {
  const sendBookingRequest = useServerFn(submitBookingRequest);
  const checkSlotFn = useServerFn(checkSlotAvailabilityFn);
  const getPublicTestimonials = useServerFn(getPublicTestimonialsFn);
  const submitTestimonial = useServerFn(submitTestimonialFn);

  // Dynamic Testimonials & Review Form
  const [testimonialsList, setTestimonialsList] = useState<any[]>(TESTIMONIALS);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewName, setReviewName] = useState("");
  const [reviewRole, setReviewRole] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewHoverRating, setReviewHoverRating] = useState<number | null>(null);
  const [reviewGame, setReviewGame] = useState("");
  const [reviewRig, setReviewRig] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getPublicTestimonials()
      .then((res: any) => {
        if (isMounted && Array.isArray(res) && res.length > 0) {
          const colors = [
            "bg-gradient-to-b from-[#23C8F3] to-[#0284C7] text-black",
            "bg-gradient-to-b from-[#A855F7] to-[#7E22CE] text-white",
            "bg-gradient-to-b from-[#059669] to-[#047857] text-white",
            "bg-gradient-to-b from-[#84CC16] to-[#4D7C0F] text-black",
            "bg-gradient-to-b from-[#EC4899] to-[#BE185D] text-white",
            "bg-gradient-to-b from-[#F59E0B] to-[#D97706] text-black",
          ];
          const angles = ["rotate-[-2deg]", "rotate-[1.5deg]", "rotate-[-1.5deg]", "rotate-[2deg]"];
          const mapped = res.map((item: any, idx: number) => {
            const bgColor = item.bg_color || colors[idx % colors.length];
            const cardAngle = item.card_angle || angles[idx % angles.length];
            const isDarkText = bgColor.includes("text-black");
            const avatarBg = isDarkText ? "bg-black/20 text-black" : "bg-white/20 text-white";
            const words = (item.customer_name || "Gamer").trim().split(/\s+/);
            const initial =
              words
                .map((w: string) => w[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase() || "GA";

            return {
              id: item.id,
              name: item.customer_name,
              role: item.role || "Gamer",
              initial,
              stars: Math.max(1, Math.min(5, Number(item.rating) || 5)),
              bgColor,
              cardAngle,
              avatarBg,
              text: item.comment,
              favoriteGame: item.favorite_game,
              stationRig: item.station_rig,
              isFeatured: Boolean(item.is_featured),
              createdAt: item.created_at,
            };
          });
          setTestimonialsList(mapped);
        }
      })
      .catch((err) => {
        console.warn("Could not load public testimonials, falling back to seed", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleReviewSubmit(e: FormEvent) {
    e.preventDefault();
    if (!reviewName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (!reviewComment.trim() || reviewComment.trim().length < 5) {
      toast.error("Please enter a review comment of at least 5 characters.");
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await submitTestimonial({
        data: {
          customerName: reviewName.trim(),
          role: reviewRole.trim() || "Gamer",
          rating: reviewRating,
          comment: reviewComment.trim(),
          favoriteGame: reviewGame.trim() || undefined,
          stationRig: reviewRig.trim() || undefined,
        },
      });

      if (res?.success && res.testimonial) {
        const item = res.testimonial;
        const colors = [
          "bg-gradient-to-b from-[#23C8F3] to-[#0284C7] text-black",
          "bg-gradient-to-b from-[#A855F7] to-[#7E22CE] text-white",
          "bg-gradient-to-b from-[#059669] to-[#047857] text-white",
          "bg-gradient-to-b from-[#84CC16] to-[#4D7C0F] text-black",
        ];
        const bgColor = item.bg_color || colors[0];
        const isDarkText = bgColor.includes("text-black");
        const words = (item.customer_name || "Gamer").trim().split(/\s+/);
        const initial =
          words
            .map((w: string) => w[0])
            .filter(Boolean)
            .slice(0, 2)
            .join("")
            .toUpperCase() || "GA";

        const newReview = {
          id: item.id,
          name: item.customer_name,
          role: item.role || "Gamer",
          initial,
          stars: item.rating,
          bgColor,
          cardAngle: "rotate-0",
          avatarBg: isDarkText ? "bg-black/20 text-black" : "bg-white/20 text-white",
          text: item.comment,
          favoriteGame: item.favorite_game,
          stationRig: item.station_rig,
          isFeatured: false,
          createdAt: item.created_at,
        };

        setTestimonialsList((prev) => [newReview, ...prev]);
        toast.success("🎉 Thank you! Your review is now live on Friendz Arena!");
        setReviewModalOpen(false);
        setReviewName("");
        setReviewRole("");
        setReviewGame("");
        setReviewRig("");
        setReviewComment("");
        setReviewRating(5);
      } else {
        toast.error("Failed to submit review. Please try again.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  }
  const [durationHours, setDurationHours] = useState<SessionDuration>(1);
  const [partySize, setPartySize] = useState(1);
  const [contactMethod, setContactMethod] = useState<"phone" | "whatsapp">("whatsapp");
  const [selectedGenre, setSelectedGenre] = useState<string>("any");
  const getDaySlotsFn = useServerFn(getDaySlotsAvailabilityFn);
  const [daySlots, setDaySlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showBookingPopup, setShowBookingPopup] = useState(false);
  const [popupBooking, setPopupBooking] = useState<any | null>(null);

  const [selectedGameTitle, setSelectedGameTitle] = useState<string>("");
  const [visitDate, setVisitDate] = useState<string>(() => {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  });
  const [visitTime, setVisitTime] = useState<string>("16:00");
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
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Playo-style 10-day quick date picker items
  const dateOptions = useMemo(() => {
    const list = [];
    const now = new Date();
    const istOffset = 5.5 * 60;
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const istNow = new Date(utcTime + istOffset * 60000);

    for (let i = 0; i < 10; i++) {
      const d = new Date(istNow);
      d.setDate(istNow.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayName =
        i === 0
          ? "TODAY"
          : i === 1
          ? "TOMORROW"
          : d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
      const dateNum = d.getDate();
      const monthStr = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
      list.push({ iso, dayName, dateNum, monthStr, isToday: i === 0, isTomorrow: i === 1 });
    }
    return list;
  }, []);

  // Fetch slot-by-slot availability whenever date, duration, or game changes (Playo style)
  useEffect(() => {
    let isMounted = true;
    if (!visitDate) return;
    setLoadingSlots(true);
    getDaySlotsFn({
      data: {
        visitDate,
        durationHours,
        gameTitle: selectedGameTitle,
      },
    })
      .then((res) => {
        if (isMounted && res?.slots) {
          setDaySlots(res.slots);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingSlots(false);
      });
    return () => {
      isMounted = false;
    };
  }, [visitDate, durationHours, selectedGameTitle]);

  // Live slot & game availability check whenever date, time, duration or game changes
  useEffect(() => {
    let isMounted = true;
    if (!visitDate || !visitTime) return;
    setCheckingAvailability(true);
    checkSlotFn({
      data: {
        visitDate,
        visitTime,
        durationHours,
        gameTitle: selectedGameTitle,
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
  }, [visitDate, visitTime, durationHours, selectedGameTitle]);

  // Game catalog state
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const total = calculateSessionPrice(partySize, durationHours);

  const filteredGames = useMemo(() => {
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

  const displayedGames = useMemo(() => {
    return filteredGames.slice(0, 10);
  }, [filteredGames]);

  function handleSelectGame(game: GameItem) {
    setSelectedGenre(game.genre);
    setSelectedGameTitle(game.title);
    const bookEl = document.getElementById("book");
    if (bookEl) {
      bookEl.scrollIntoView({ behavior: "smooth" });
    }
  }

  function handleSelectGta6() {
    setSelectedGenre("open-world");
    setSelectedGameTitle("Grand Theft Auto VI (Day 1 Launch Slot)");
    const bookEl = document.getElementById("book");
    if (bookEl) {
      bookEl.scrollIntoView({ behavior: "smooth" });
    }
  }

  function handleSelectGta5() {
    setSelectedGenre("open-world");
    setSelectedGameTitle("Grand Theft Auto V (PS5 4K Ray Tracing)");
    const bookEl = document.getElementById("book");
    if (bookEl) {
      bookEl.scrollIntoView({ behavior: "smooth" });
    }
  }

  function handleSelectStation(stationName: string, gameTitle: string, genre: string) {
    setSelectedGenre(genre);
    setSelectedGameTitle(`${stationName} - ${gameTitle}`);
    const bookEl = document.getElementById("book");
    if (bookEl) {
      bookEl.scrollIntoView({ behavior: "smooth" });
    }
  }

  function handleGenreClick(genreKey: string) {
    setActiveFilter(genreKey);
    const libraryEl = document.getElementById("game-library");
    if (libraryEl) {
      libraryEl.scrollIntoView({ behavior: "smooth" });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitted(false);
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const rawNotes = String(formData.get("notes") ?? "");
    const finalNotes =
      selectedGameTitle && !rawNotes.includes(selectedGameTitle)
        ? `Game requested: ${selectedGameTitle}${rawNotes ? ` | ${rawNotes}` : ""}`
        : rawNotes;

    const finalVisitDate = String(formData.get("visitDate") || visitDate);
    const finalVisitTime = String(formData.get("visitTime") || visitTime);

    const result = await sendBookingRequest({
      data: {
        customerName: String(formData.get("customerName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        contactMethod,
        visitDate: finalVisitDate,
        visitTime: finalVisitTime,
        partySize,
        durationHours,
        gameGenre: selectedGenre as
          | "sports"
          | "racing"
          | "fighting"
          | "action-adventure"
          | "open-world"
          | "multiplayer"
          | "any",
        notes: finalNotes,
        website: String(formData.get("website") ?? ""),
      },
    }).catch(() => null);

    if (result?.success) {
      const bData = result.booking || {
        id: "REQ-" + Math.random().toString(36).substring(2, 7).toUpperCase(),
        customerName: String(formData.get("customerName") ?? "Gamer"),
        phone: String(formData.get("phone") ?? ""),
        contactMethod,
        visitDate: finalVisitDate,
        visitTime: finalVisitTime,
        partySize,
        durationHours,
        gameGenre: selectedGenre,
        notes: finalNotes,
        estimatedTotal: total,
        stationRig: result.assignedRig || null,
        status: "pending",
      };

      setPopupBooking(bData);
      setShowBookingPopup(true);
      toast.success("Booking request received! Check popup confirmation.");

      event.currentTarget.reset();
      setDurationHours(1);
      setPartySize(1);
      setContactMethod("whatsapp");
      setSelectedGameTitle("");
      setSelectedGenre("any");
      setSubmitted(true);
    } else {
      setErrorMessage(
        (result as any)?.error || "We couldn’t save your request. Please check your details and try again."
      );
    }
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#070B1E] text-foreground antialiased selection:bg-[#FFB800] selection:text-black">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 w-full max-w-full border-b border-white/10 bg-[#050819]/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
          <a
            href="#top"
            className="flex min-w-0 items-center gap-3 group"
            aria-label="Friendz Arena Home"
          >
            <div className="relative size-11 sm:size-12 shrink-0 overflow-hidden rounded-full border-2 border-cyan-400/80 bg-[#081348] p-1 shadow-lg shadow-cyan-500/25 transition-transform group-hover:scale-105">
              <img
                src="/logo.png"
                alt="Friendz Arena Logo"
                className="size-full rounded-full object-contain"
              />
            </div>
            <span className="min-w-0">
              <span className="block truncate font-display text-sm sm:text-base font-extrabold uppercase tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                Friendz Arena
              </span>
              <span className="block text-[10px] sm:text-[11px] font-semibold tracking-wider text-[#23C8F3] uppercase truncate">
                PS5 Gaming Lounge
              </span>
            </span>
          </a>

          <nav
            className="hidden items-center gap-8 text-xs font-bold uppercase tracking-wider text-muted-foreground md:flex"
            aria-label="Main navigation"
          >
            <a className="transition-colors hover:text-white" href="#rates">
              Rates
            </a>
            <a className="transition-colors hover:text-white" href="#stations">
              Rigs
            </a>
            <Link
              to="/games"
              className="inline-flex items-center gap-1.5 font-bold text-[#23C8F3] transition-colors hover:text-cyan-200"
            >
              Games ({GAMES_LIST.length})
              <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-cyan-300">
                3D
              </span>
            </Link>
            <a className="transition-colors hover:text-white" href="#visit">
              Visit
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="https://wa.me/918498833389?text=Hi%20Friendz%20Arena%2C%20I%20would%20like%20to%20inquire%20about%20PS5%20slots%20and%20games!"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-chamfer hidden sm:inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20ba59] px-3.5 py-2.5 font-display text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <MessageCircle className="size-3.5 fill-current" /> WhatsApp
            </a>
            <a
              href="#book"
              className="btn-chamfer inline-flex items-center gap-1.5 bg-[#FFB800] px-4 sm:px-5 py-2 sm:py-2.5 font-display text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              Book Now
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section: "YOUR PORTAL TO EPIC GAMING" */}
      <section
        id="top"
        className="relative isolate w-full max-w-full overflow-hidden border-b border-white/10 pt-8 pb-16 sm:pt-16 sm:pb-28"
      >
        {/* Ambient Radial Cyber Lighting based on Logo Palette */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[-10%] top-[-10%] -z-10 size-[36rem] rounded-full bg-[#23C8F3]/15 blur-[130px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[-5%] top-[10%] -z-10 size-[38rem] rounded-full bg-[#8F58AF]/20 blur-[150px]"
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Epic Gaming Heroes Squad Visual (Clean Arched Frame) */}
            <div className="relative order-2 lg:order-1 lg:col-span-6 min-w-0">
              <div className="relative mx-auto max-w-md sm:max-w-lg">
                {/* Arched Gaming Frame with Cyber Glow */}
                <div className="group relative aspect-[4/5] w-full overflow-hidden rounded-t-[80px] sm:rounded-t-[100px] rounded-b-3xl border border-cyan-400/30 bg-gradient-to-b from-[#081348] via-[#0B1B3D] to-[#050819] p-2.5 sm:p-3 shadow-2xl shadow-cyan-950/80 ring-1 ring-cyan-500/20">
                  <div className="relative size-full overflow-hidden rounded-t-[70px] sm:rounded-t-[90px] rounded-b-2xl bg-[#050819]">
                    {/* Epic Hero Characters Squad Visual */}
                    <img
                      src="/hero-characters-squad.jpg"
                      alt="Friendz Arena Gaming Heroes Squad"
                      className="size-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                    />

                    {/* Gradient Overlay for Text Readability */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050819] via-transparent to-[#050819]/50"
                    />

                    {/* Top Floating Logo Crest Badge */}
                    <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-1.5 sm:gap-2 rounded-full border border-cyan-400/40 bg-[#050819]/90 py-1 pl-1.5 pr-2.5 sm:pr-3.5 shadow-lg backdrop-blur-md max-w-[50%]">
                      <div className="size-6 sm:size-7 shrink-0 overflow-hidden rounded-full border border-cyan-400/60 bg-[#081348] p-0.5">
                        <img
                          src="/logo.png"
                          alt="Friendz Arena Logo Crest"
                          className="size-full rounded-full object-contain"
                        />
                      </div>
                      <span className="font-display text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-cyan-300 truncate">
                        Friendz Arena
                      </span>
                    </div>

                    {/* Top Right Live Ready Badge */}
                    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-[#050819]/90 px-2.5 sm:px-3 py-1 backdrop-blur-md shadow-lg">
                      <span className="relative flex size-2">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                      </span>
                      <span className="font-display text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-400 whitespace-nowrap">
                        5 Rigs Online
                      </span>
                    </div>

                    {/* Bottom Sleek Frosted HUD Card */}
                    <div className="absolute inset-x-2.5 bottom-2.5 sm:inset-x-3 sm:bottom-3 rounded-2xl border border-white/10 bg-slate-950/85 p-3 sm:p-4 backdrop-blur-xl shadow-2xl">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-display text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-[#23C8F3] flex items-center gap-1.5">
                            <Sparkles className="size-3 text-cyan-400" /> PlayStation 5 Squad Hub
                          </p>
                          <h3 className="mt-0.5 font-display text-xs sm:text-base font-black uppercase tracking-tight text-white">
                            Assemble Your Squad
                          </h3>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2 sm:px-2.5 py-0.5 sm:py-1 font-display text-[10px] sm:text-[11px] font-black uppercase tracking-wide text-amber-400">
                            From ₹100/Hr
                          </span>
                        </div>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-white/10 pt-2 text-[9px] sm:text-[10px] font-medium text-slate-300">
                        <span className="inline-flex items-center gap-1">
                          <Gamepad2 className="size-3 text-cyan-400" /> 5 Dedicated Rigs
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Monitor className="size-3 text-fuchsia-400" /> 4K 120Hz Displays
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Zap className="size-3 text-amber-400" /> PS Plus Deluxe
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Headline, Subtitle, Actions */}
            <div className="order-1 lg:order-2 lg:col-span-6 lg:pl-6 min-w-0">
              {/* Category Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-950/50 px-3.5 sm:px-4 py-1.5 font-display text-xs font-semibold text-cyan-300 backdrop-blur-md shadow-sm max-w-full">
                <span className="relative flex size-2 shrink-0">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-cyan-400" />
                </span>
                <span className="uppercase tracking-widest text-[10px] sm:text-[11px] text-cyan-200 truncate">PS5 Gaming Lounge</span>
                <span className="text-white/20">|</span>
                <span className="font-display font-black text-[#FFB800] truncate">Jangareddygudem</span>
              </div>

              {/* Big Two-Tone Headline aligned with logo colors */}
              <h1 className="mt-5 font-display text-3xl sm:text-6xl xl:text-7xl font-black uppercase leading-[1.06] tracking-tight text-white">
                Your Portal To{" "}
                <span className="bg-gradient-to-r from-[#23C8F3] via-[#A855F7] to-[#EC4899] bg-clip-text text-transparent">
                  Epic Gaming
                </span>
              </h1>

              <p className="mt-4 sm:mt-5 max-w-xl text-sm sm:text-lg leading-relaxed text-slate-300">
                Five PlayStation 5 stations loaded with 90+ titles, PlayStation Plus Deluxe, and 4K
                120Hz HDR displays. Drop in solo or bring your squad for Jangareddygudem’s ultimate
                next-gen gaming experience.
              </p>

              {/* Action Buttons */}
              <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#book"
                  className="btn-chamfer inline-flex items-center gap-2 bg-[#FFB800] px-6 sm:px-7 py-3 sm:py-3.5 font-display text-xs font-black uppercase tracking-wider text-black shadow-xl shadow-amber-500/20 transition-transform hover:-translate-y-0.5"
                >
                  Book A Session <ArrowRight className="size-4" />
                </a>

                <a
                  href="https://wa.me/918498833389?text=Hi%20Friendz%20Arena%2C%20I%20want%20to%20book%20a%20PS5%20slot!"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-chamfer inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba59] px-5 sm:px-6 py-3 sm:py-3.5 font-display text-xs font-black uppercase tracking-wider text-black shadow-xl shadow-emerald-500/20 transition-transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <MessageCircle className="size-4 fill-current" /> WhatsApp
                </a>

                <Link
                  to="/games"
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-950/30 px-5 sm:px-6 py-2.5 sm:py-3 font-display text-xs font-bold uppercase tracking-wider text-cyan-300 transition-all hover:border-cyan-300 hover:bg-cyan-900/40 shadow-lg shadow-cyan-950/40 backdrop-blur-sm"
                >
                  <Sparkles className="size-3.5 text-cyan-300" /> 90+ Games
                </Link>

                <Link
                  to="/pass-check"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 sm:px-5 py-2.5 sm:py-3 font-display text-xs font-bold uppercase tracking-wider text-slate-300 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
                >
                  Check Pass
                </Link>
              </div>

              {/* Modern Trust / Spec Cards Grid */}
              <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 border-t border-white/10 pt-6">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-3.5 backdrop-blur-md transition-colors hover:border-cyan-400/30">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Gamepad2 className="size-4" />
                    <span className="font-display text-[11px] font-bold uppercase tracking-wider text-white">5 PS5 Rigs</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">4K 120Hz Displays</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-3.5 backdrop-blur-md transition-colors hover:border-fuchsia-400/30">
                  <div className="flex items-center gap-2 text-fuchsia-400">
                    <Sparkles className="size-4" />
                    <span className="font-display text-[11px] font-bold uppercase tracking-wider text-white">90+ Titles</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Deluxe Library & GTA VI</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-3.5 backdrop-blur-md transition-colors hover:border-amber-400/30">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Clock3 className="size-4" />
                    <span className="font-display text-[11px] font-bold uppercase tracking-wider text-white">From ₹100/hr</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Transparent Group Rates</p>
                </div>
              </div>
            </div>
          </div>

          {/* Side-by-Side Game Characters Squad Lineup with Text */}
          <div className="mt-16 pt-12 border-t border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/50 bg-cyan-950/40 px-3.5 py-1 text-xs font-bold text-cyan-300 backdrop-blur-md">
                  <Users className="size-3.5" />
                  <span>SIDE-BY-SIDE ARENA LINEUP</span>
                </div>
                <h2 className="mt-2.5 font-display text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-white">
                  Meet Your Heroes.{" "}
                  <span className="bg-gradient-to-r from-[#23C8F3] via-[#A855F7] to-[#EC4899] bg-clip-text text-transparent">
                    Pick Your Game.
                  </span>
                </h2>
              </div>
              <p className="max-w-md text-xs sm:text-sm text-muted-foreground">
                Click any character below to lock in their featured title directly on your session booking request.
              </p>
            </div>

            {/* 5 Side-by-Side Dome-Topped Cards */}
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
              {HERO_SQUAD_CHARACTERS.map((char) => (
                <div
                  key={char.id}
                  className={`group relative flex flex-col overflow-hidden rounded-t-[44px] rounded-b-2xl border ${char.accentColor} p-2.5 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl`}
                >
                  {/* Arched Character Image Window */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-[36px] rounded-b-xl bg-[#070B1E]">
                    <img
                      src={char.image}
                      alt={char.characterName}
                      className="size-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"
                    />

                    {/* Top Badge */}
                    <span className="absolute top-2.5 left-2.5 rounded-full bg-black/85 px-2.5 py-0.5 font-display text-[9px] font-bold text-white backdrop-blur-md border border-white/10">
                      {char.badge}
                    </span>

                    {/* Specs pill at bottom of image */}
                    <div className="absolute inset-x-0 bottom-0 p-2.5">
                      <span className="rounded bg-black/80 px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider text-cyan-300 backdrop-blur-sm">
                        {char.specs}
                      </span>
                    </div>
                  </div>

                  {/* Character & Game Text Content */}
                  <div className="flex flex-1 flex-col p-3 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {char.genreLabel}
                    </p>
                    <h3 className="mt-1 font-display text-sm sm:text-base font-black uppercase text-white group-hover:text-cyan-300 transition-colors">
                      {char.characterName}
                    </h3>
                    <p className="font-display text-xs font-bold text-[#FFB800]">
                      {char.gameTitle}
                    </p>
                    <p className="mt-2 text-[11px] leading-snug text-muted-foreground line-clamp-2">
                      {char.description}
                    </p>

                    {/* Quick Select Button */}
                    <div className="mt-auto pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGenre(char.genre);
                          setSelectedGameTitle(char.gameTitle);
                          const bookEl = document.getElementById("book");
                          if (bookEl) {
                            bookEl.scrollIntoView({ behavior: "smooth" });
                          }
                        }}
                        className={`w-full rounded-lg border border-white/20 bg-white/5 py-2 font-display text-[10px] font-black uppercase tracking-wider text-white transition-all ${char.btnColor}`}
                      >
                        Select & Play
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section: "FOR THE PLAYERS BY THE PLAYERS" (Matching Reference) */}
      <section className="relative isolate border-b border-white/10 bg-[#0A0F2D] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            {/* Left Headline */}
            <div className="lg:col-span-5">
              <h2 className="font-display text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
                For The Players <br />
                By The{" "}
                <span className="text-[#23C8F3]">Players</span>
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                Built by gamers for competitive and casual gaming sessions. High-refresh 4K screens,
                genuine Sony DualSense wireless controllers, zero lag, and instant game access.
              </p>
            </div>

            {/* Right: 4 Colorful Asymmetric Arch Cards */}
            <div className="lg:col-span-7">
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-4">
                {/* Card 1: Cyber Cyan Arch (Matching Logo Palette) */}
                <div className="flex flex-col justify-between rounded-tl-[50px] rounded-tr-2xl rounded-b-2xl bg-gradient-to-b from-[#23C8F3] to-[#0A88B4] p-5 text-black shadow-xl shadow-cyan-950/50 min-h-[160px] transition-transform hover:-translate-y-1">
                  <span className="font-display text-3xl font-black sm:text-4xl text-black">5</span>
                  <div>
                    <h3 className="font-display text-xs font-black uppercase tracking-wider text-black">
                      PS5 Stations
                    </h3>
                    <p className="text-[10px] font-semibold text-black/80">Dedicated Rigs</p>
                  </div>
                </div>

                {/* Card 2: Royal Violet / Purple Arch (Matching Logo Palette) */}
                <div className="flex flex-col justify-between rounded-t-2xl rounded-b-2xl bg-gradient-to-b from-[#A855F7] to-[#6D2E9C] p-5 text-white shadow-xl shadow-purple-950/50 min-h-[160px] transition-transform hover:-translate-y-1">
                  <span className="font-display text-3xl font-black sm:text-4xl">90+</span>
                  <div>
                    <h3 className="font-display text-xs font-black uppercase tracking-wider">
                      Ready Games
                    </h3>
                    <p className="text-[10px] text-white/80">PS Plus Deluxe</p>
                  </div>
                </div>

                {/* Card 3: Electric Emerald Green Arch */}
                <div className="flex flex-col justify-between rounded-t-2xl rounded-b-2xl bg-gradient-to-b from-[#059669] to-[#047857] p-5 text-white shadow-xl shadow-emerald-950/50 min-h-[160px] transition-transform hover:-translate-y-1">
                  <span className="font-display text-3xl font-black sm:text-4xl">4K 60</span>
                  <div>
                    <h3 className="font-display text-xs font-black uppercase tracking-wider">
                      HDR Displays
                    </h3>
                    <p className="text-[10px] text-white/80">Low Latency</p>
                  </div>
                </div>

                {/* Card 4: Chartreuse / Lime Arch */}
                <div className="flex flex-col justify-between rounded-t-2xl rounded-bl-2xl rounded-br-[50px] bg-gradient-to-b from-[#84CC16] to-[#4D7C0F] p-5 text-black shadow-xl shadow-lime-950/50 min-h-[160px] transition-transform hover:-translate-y-1">
                  <span className="font-display text-3xl font-black sm:text-4xl">₹100</span>
                  <div>
                    <h3 className="font-display text-xs font-black uppercase tracking-wider">
                      Starting Rate
                    </h3>
                    <p className="text-[10px] font-semibold text-black/80">Whole Group / Hr</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section: "UNLEASH YOUR INNER GAMER" & GTA VI (Matching Reference) */}
      <section
        id="gta-6"
        className="relative isolate overflow-hidden border-b border-white/10 bg-[#070B1E] py-16 sm:py-24"
      >
        {/* Subtle Backdrop Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[45rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-fuchsia-600/10 to-cyan-500/10 blur-[150px]"
        />

        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Content */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/50 bg-fuchsia-950/50 px-3.5 py-1.5 font-display text-xs font-bold text-fuchsia-400">
                <Flame className="size-3.5" />
                <span>The Most Anticipated Launch in Gaming History</span>
              </div>

              <h2 className="mt-4 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-5xl lg:text-6xl">
                Unleash Your Inner{" "}
                <span className="bg-gradient-to-r from-[#23C8F3] via-[#A855F7] to-[#EC4899] bg-clip-text text-transparent">
                  Gamer
                </span>
              </h2>

              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                With seamless gameplay, thrilling 4-player battles, and exclusive titles, we bring the
                gaming universe to Jangareddygudem. Rockstar Games is taking us back to neon-soaked
                Vice City in <strong className="text-white">Grand Theft Auto VI</strong>, and you can
                experience it on Day One right here at Friendz Arena.
              </p>

              {/* 4 Feature Highlights */}
              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
                  <div className="flex items-center gap-2 text-fuchsia-400">
                    <Monitor className="size-4" />
                    <h4 className="font-display text-sm font-bold text-white">4K 60FPS Ray Tracing</h4>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Experience Leonida’s sunsets, wetlands, and neon nightlife on ultra-responsive screens.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Zap className="size-4" />
                    <h4 className="font-display text-sm font-bold text-white">DualSense Immersion</h4>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Feel every gear shift, highway drift, and speedboat spray through adaptive triggers.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
                  <div className="flex items-center gap-2 text-fuchsia-400">
                    <Flame className="size-4" />
                    <h4 className="font-display text-sm font-bold text-white">Day 1 Zero Download Waiting</h4>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    No 150GB download waiting or ₹50,000 console cost. Walk in and play on launch day.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Users className="size-4" />
                    <h4 className="font-display text-sm font-bold text-white">Squad Side-by-Side</h4>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    5 stations side-by-side so you and your crew can explore Vice City simultaneously.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleSelectGta6}
                  className="btn-chamfer inline-flex items-center gap-2 bg-[#FFB800] px-6 py-3 font-display text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-amber-500/20"
                >
                  Pre-Book GTA VI Slot <ArrowRight className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={handleSelectGta5}
                  className="rounded-full border border-cyan-400/50 bg-cyan-950/20 px-6 py-3 font-display text-xs font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-900/30"
                >
                  Play GTA V Today (₹100/hr)
                </button>
              </div>
            </div>

            {/* Right Arched Portal Window (Matching Reference Dome Character) */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-sm">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-[130px] rounded-b-3xl border-2 border-fuchsia-500/40 bg-gradient-to-b from-fuchsia-900/40 via-[#0E1538] to-[#070B1E] p-3 shadow-2xl shadow-fuchsia-950/70">
                  <div className="relative size-full overflow-hidden rounded-t-[120px] rounded-b-2xl bg-black">
                    <img
                      src="/games/gta-6.jpg"
                      alt="Grand Theft Auto VI Lucia and Jason"
                      className="size-full object-cover object-center"
                      loading="lazy"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"
                    />

                    {/* Corner Badge */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-fuchsia-600 px-3.5 py-1 font-display text-[10px] font-black uppercase tracking-wider text-white shadow-lg">
                      Day 1 on PS5
                    </div>

                    {/* Bottom Details */}
                    <div className="absolute inset-x-0 bottom-0 p-5 text-center">
                      <p className="font-display text-xs font-bold uppercase tracking-widest text-fuchsia-400">
                        Rockstar Games
                      </p>
                      <h3 className="font-display text-xl font-black uppercase text-white">
                        Grand Theft Auto VI
                      </h3>
                      <p className="mt-1 text-xs text-white/80">Vice City · State of Leonida</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* "MEET OUR 5 PS5 ARENA RIGS" (Matching "MEET OUR ELITE TEAM" in Reference) */}
      <section
        id="stations"
        className="relative isolate border-b border-white/10 bg-[#0A0F2D] py-16 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="text-center">
            <p className="font-display text-xs font-bold uppercase tracking-widest text-[#23C8F3]">
              5 Dedicated Battle Stations
            </p>
            <h2 className="mt-3 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
              Meet Our 5 PS5{" "}
              <span className="bg-gradient-to-r from-[#23C8F3] via-[#A855F7] to-[#EC4899] bg-clip-text text-transparent">
                Arena Rigs
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Each station is equipped with genuine Sony DualSense controllers, ultra-fast SSD storage,
              and low-latency 4K gaming displays.
            </p>
          </div>

          {/* 5 Dome-Topped Vertical Cards */}
          <div className="mt-12 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5 sm:gap-5">
            {ARENA_STATIONS.map((station) => (
              <div
                key={station.number}
                className={`group relative flex flex-col overflow-hidden rounded-t-[50px] rounded-b-2xl border ${station.accentColor} p-2.5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl`}
              >
                {/* Dome Image Container */}
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-[40px] rounded-b-xl bg-[#070B1E]">
                  <img
                    src={station.cover}
                    alt={station.name}
                    className="size-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"
                  />

                  {/* Rig Number Badge */}
                  <span className="absolute top-2.5 right-2.5 rounded-full bg-black/80 px-2 py-0.5 font-display text-[10px] font-bold text-white backdrop-blur-md">
                    RIG {station.number}
                  </span>

                  {/* Bottom Rig Tag */}
                  <div className="absolute inset-x-0 bottom-0 p-2.5">
                    <span className="rounded bg-black/75 px-1.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                      {station.badge}
                    </span>
                  </div>
                </div>

                {/* Card Text Content */}
                <div className="flex flex-1 flex-col p-3 text-center">
                  <h3 className="font-display text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {station.name}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-white/90">
                    {station.featuredGame}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{station.secondaryGame}</p>

                  <div className="mt-auto pt-3">
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectStation(station.name, station.featuredGame, station.genre)
                      }
                      className="w-full rounded-md border border-white/20 bg-white/5 py-1.5 font-display text-[10px] font-bold uppercase tracking-wider text-white transition-all hover:bg-[#FFB800] hover:text-black hover:border-[#FFB800]"
                    >
                      Select Rig
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hourly Pricing Rates Table */}
      <section id="rates" className="scroll-mt-8 border-b border-white/10 bg-[#070B1E] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-widest text-[#FFB800]">
                PICK YOUR PLAY TIME
              </p>
              <h2 className="mt-3 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
                Straight-Up Session Rates
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Prices are for the entire group. Select any rate below to auto-fill your booking request.
            </p>
          </div>

          <div className="w-full max-w-full overflow-x-auto rounded-2xl border border-white/10 bg-[#0E1538]/60 backdrop-blur-md">
            <table className="w-full min-w-[38rem] border-collapse text-left">
              <caption className="sr-only">
                Total session prices in rupees by number of people and hours
              </caption>
              <thead>
                <tr className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-5 py-4">
                    Group Size
                  </th>
                  {SESSION_DURATIONS.map((hours) => (
                    <th key={hours} scope="col" className="px-5 py-4">
                      {hours} {hours === 1 ? "Hour" : "Hours"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GROUP_SIZES.map((people) => (
                  <tr
                    key={people}
                    className="border-b border-white/10 last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <th
                      scope="row"
                      className="whitespace-nowrap px-5 py-4 font-display text-sm font-bold text-white"
                    >
                      {people} {people === 1 ? "Person" : "People"}
                    </th>
                    {SESSION_DURATIONS.map((hours) => (
                      <td key={hours} className="px-5 py-3">
                        <button
                          type="button"
                          className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 font-display text-sm font-bold text-[#FFB800] transition-all hover:bg-[#FFB800] hover:text-black hover:scale-105 active:scale-95"
                          onClick={() => {
                            setPartySize(people);
                            setDurationHours(hours);
                            const bookEl = document.getElementById("book");
                            if (bookEl) {
                              bookEl.scrollIntoView({ behavior: "smooth" });
                            }
                          }}
                        >
                          ₹{calculateSessionPrice(people, hours)}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Arena Pro Gamer Passes & Loyalty Hours */}
          <div className="mt-12 rounded-3xl border border-white/15 bg-gradient-to-br from-[#0c1340]/90 via-[#070b24]/90 to-[#0e174d]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/40 px-3 py-1 font-display text-[11px] font-black uppercase tracking-wider text-[#FFB800]">
                  🔥 PREPAID MEMBERSHIP
                </span>
                <h3 className="mt-3 font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                  Arena Pro Gamer Passes
                </h3>
                <p className="mt-1 max-w-xl text-xs sm:text-sm text-muted-foreground">
                  Game regularly? Load prepaid hours at massive savings. Get a unique digital Gamer Pass code to flash at the desk on any visit!
                </p>
              </div>
              <a
                href="https://wa.me/918498833389?text=Hello%20Friendz%20Arena!%20I%20want%20to%20get%20an%20Arena%20Pro%20Gamer%20Pass%20for%20PS5%20gaming."
                target="_blank"
                rel="noreferrer"
                className="btn-chamfer inline-flex items-center justify-center gap-2 bg-[#25D366] px-5 py-2.5 font-display text-xs font-black uppercase text-black shadow-lg hover:brightness-110 active:scale-95"
              >
                <MessageCircle className="size-4 fill-current" /> Buy Pass via WhatsApp
              </a>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {/* Tier 1 */}
              <div className="relative rounded-2xl border border-white/10 bg-black/40 p-5 transition-all hover:border-[#FFB800]/50">
                <span className="font-display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">⚡ ROOKIE PASS</span>
                <h4 className="mt-1 font-display text-xl font-black uppercase text-white">5 Gaming Hours</h4>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-2xl font-black text-[#FFB800]">₹450</span>
                  <span className="text-xs text-muted-foreground line-through">₹500</span>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">Save ₹50</span>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">Valid for 30 days · Valid across all 5 PS5 stations · Single or co-op sessions.</p>
                <a
                  href="https://wa.me/918498833389?text=Hello!%20I%20want%20to%20buy%20the%205-Hour%20Rookie%20Pass%20(₹450)%20for%20Friendz%20Arena."
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 block w-full rounded-xl border border-white/20 py-2 text-center font-display text-xs font-bold uppercase text-white hover:bg-white/10"
                >
                  Get Rookie Pass
                </a>
              </div>

              {/* Tier 2 */}
              <div className="relative rounded-2xl border-2 border-cyan-400 bg-cyan-950/20 p-5 shadow-lg shadow-cyan-500/10">
                <div className="absolute -top-3 right-4 rounded-full bg-cyan-400 px-3 py-0.5 font-display text-[10px] font-black uppercase text-black">
                  POPULAR
                </div>
                <span className="font-display text-[10px] font-bold uppercase tracking-wider text-cyan-300">🔥 PRO GAMER PASS</span>
                <h4 className="mt-1 font-display text-xl font-black uppercase text-white">10 Gaming Hours</h4>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-2xl font-black text-[#FFB800]">₹850</span>
                  <span className="text-xs text-muted-foreground line-through">₹1,000</span>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">Save ₹150</span>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">Valid for 60 days · Custom gamer tag handle · Priority station access.</p>
                <a
                  href="https://wa.me/918498833389?text=Hello!%20I%20want%20to%20buy%20the%2010-Hour%20Pro%20Gamer%20Pass%20(₹850)%20for%20Friendz%20Arena."
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 block w-full rounded-xl bg-cyan-400 py-2 text-center font-display text-xs font-black uppercase text-black hover:brightness-110"
                >
                  Get Pro Pass
                </a>
              </div>

              {/* Tier 3 */}
              <div className="relative rounded-2xl border border-purple-500/40 bg-purple-950/20 p-5 transition-all hover:border-purple-400">
                <span className="font-display text-[10px] font-bold uppercase tracking-wider text-purple-300">👑 ELITE CHAMPION PASS</span>
                <h4 className="mt-1 font-display text-xl font-black uppercase text-white">20 Gaming Hours</h4>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-2xl font-black text-[#FFB800]">₹1,600</span>
                  <span className="text-xs text-muted-foreground line-through">₹2,000</span>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">Save ₹400</span>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">Valid for 90 days · Priority slot booking · Exclusive rig reservation rights.</p>
                <a
                  href="https://wa.me/918498833389?text=Hello!%20I%20want%20to%20buy%20the%2020-Hour%20Elite%20Champion%20Pass%20(₹1,600)%20for%20Friendz%20Arena."
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 block w-full rounded-xl border border-purple-500/50 bg-purple-500/20 py-2 text-center font-display text-xs font-bold uppercase text-white hover:bg-purple-500/40"
                >
                  Get Elite Pass
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Genre Section */}
      <section id="games" className="scroll-mt-8 border-b border-white/10 bg-[#0A0F2D] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="font-display text-xs font-bold uppercase tracking-widest text-cyan-400">
              Find Your Kind Of Game
            </p>
            <h2 className="mt-3 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
              What Are You Playing Today?
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Click a genre below to explore matching titles available on our five PS5 stations.
            </p>
          </div>
          <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
            {gameGenres.map(({ genreKey, label, detail, poster, alt }, index) => (
              <button
                key={label}
                type="button"
                onClick={() => handleGenreClick(genreKey)}
                className="group relative isolate aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-[#0E1538] text-left transition-all hover:border-[#FFB800] hover:shadow-xl hover:shadow-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB800]"
              >
                <img
                  src={poster}
                  alt={alt}
                  width={365}
                  height={500}
                  loading="lazy"
                  className="absolute inset-0 -z-20 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/40 to-transparent"
                />
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                  <p className="mb-1 font-display text-[10px] font-black uppercase tracking-wider text-[#FFB800]">
                    Genre {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="font-display text-sm font-bold leading-snug text-white sm:text-base">
                    {label}
                  </h3>
                  <p className="mt-1 text-xs text-white/80">{detail}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Game Library */}
      <section
        id="game-library"
        className="scroll-mt-8 border-b border-white/10 bg-[#070B1E] py-16 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-950/40 px-3.5 py-1.5 font-display text-xs font-semibold text-cyan-300">
                <Sparkles className="size-3.5" />
                <span>PlayStation Plus Deluxe + In-Lounge Discs</span>
              </div>
              <h2 className="mt-3 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl md:text-5xl">
                Available Game Library
              </h2>
              <p className="mt-3 text-muted-foreground sm:text-base">
                Browse our top 10 featured games ready to play on our 5 PS5 stations. Click any game to request it directly for your session!
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-display text-xs text-muted-foreground">
                Showing <span className="font-bold text-[#FFB800]">{displayedGames.length}</span> of{" "}
                <span className="font-bold text-white">{GAMES_LIST.length}</span> games
              </div>
              <Link
                to="/games"
                className="btn-chamfer hidden sm:inline-flex items-center gap-1.5 bg-[#23C8F3] hover:bg-cyan-300 px-4 py-2 text-xs font-black uppercase tracking-wider text-black transition-all"
              >
                View Full Library ({GAMES_LIST.length}) →
              </Link>
            </div>
          </div>

          {/* Search Bar & Filter Pills */}
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
                placeholder="Search games (e.g. Cricket 24, GTA 6, EA FC, Tekken)..."
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

            {/* Filter Pills */}
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
          {displayedGames.length === 0 ? (
            <div className="mt-14 rounded-2xl border border-dashed border-white/10 py-16 text-center">
              <Gamepad2 className="mx-auto size-12 text-muted-foreground/60" />
              <h3 className="mt-4 font-display text-lg font-bold text-white">No games matched your search</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try searching for a different title or select "All Games" above.
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
            <>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5">
                {displayedGames.map((game) => (
                  <article
                    key={game.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0E1538]/80 transition-all duration-300 hover:-translate-y-1 hover:border-[#FFB800]/80 hover:shadow-xl hover:shadow-amber-500/5"
                  >
                    {/* Game Cover */}
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted/20">
                      <img
                        src={game.cover}
                        alt={`${game.title} PS5 cover art`}
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
                      <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
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
                          onClick={() => handleSelectGame(game)}
                          className="w-full rounded-md border border-white/10 bg-white/5 py-1.5 font-display text-xs font-semibold text-white transition-all hover:bg-[#FFB800] hover:text-black hover:border-[#FFB800]"
                        >
                          Request Game
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* View All Games CTA Button */}
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/games"
                  className="btn-chamfer inline-flex items-center gap-2 bg-gradient-to-r from-[#FFB800] via-amber-400 to-[#23C8F3] px-6 py-3 font-display text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-amber-500/20 hover:scale-105 transition-all cursor-pointer"
                >
                  <Gamepad2 className="size-4" />
                  View All {GAMES_LIST.length} PS5 Games in 3D Catalog →
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Customer Testimonials: "WHAT PLAYERS ARE SAYING" (Matching Reference Tilted Pills) */}
      <section
        id="reviews"
        className="relative isolate overflow-hidden border-b border-white/10 bg-[#0A0F2D] py-16 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="text-center">
            <p className="font-display text-xs font-bold uppercase tracking-widest text-[#FFB800]">
              VERIFIED VISITOR REVIEWS
            </p>
            <h2 className="mt-3 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
              What Players Are{" "}
              <span className="bg-gradient-to-r from-[#23C8F3] via-[#A855F7] to-[#EC4899] bg-clip-text text-transparent">
                Saying
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground sm:text-base">
              Real feedback from local players who bring their friends to Friendz Arena.
            </p>

            {/* Write a Review Button */}
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setReviewModalOpen(true)}
                className="btn-chamfer bg-gradient-to-r from-[#FFB800] via-amber-400 to-[#23C8F3] px-6 py-3 font-display text-xs font-black uppercase tracking-wider text-black shadow-xl shadow-amber-500/20 hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
              >
                <MessageSquarePlus className="size-4" />
                Write a Review / Share Feedback
              </button>
            </div>
          </div>

          {/* Dynamic Testimonials Grid */}
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {testimonialsList.map((review: any, idx: number) => (
              <div
                key={review.id || `${review.name}-${idx}`}
                className={`relative flex flex-col justify-between rounded-[36px] p-6 shadow-2xl transition-transform duration-300 hover:rotate-0 hover:scale-105 ${review.bgColor} sm:${review.cardAngle}`}
              >
                <div>
                  {/* Top user row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-full font-display text-xs font-black ${review.avatarBg}`}
                      >
                        {review.initial}
                      </div>
                      <div>
                        <h3 className="font-display text-sm font-bold leading-tight truncate max-w-[150px]">
                          {review.name}
                        </h3>
                        <p className="text-[11px] opacity-80 truncate max-w-[150px]">{review.role}</p>
                      </div>
                    </div>

                    {review.isFeatured && (
                      <span className="rounded-full bg-amber-400/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-200 border border-amber-300/40">
                        ⭐ Top
                      </span>
                    )}
                  </div>

                  {/* Stars */}
                  <div className="mt-3 flex gap-0.5">
                    {[...Array(review.stars || 5)].map((_, i) => (
                      <Star key={i} className="size-3 fill-amber-300 text-amber-300" />
                    ))}
                  </div>

                  {/* Tags for Game / Rig if available */}
                  {(review.favoriteGame || review.stationRig) && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {review.favoriteGame && (
                        <span className="rounded-md bg-black/20 px-2 py-0.5 text-[10px] font-bold">
                          🎮 {review.favoriteGame}
                        </span>
                      )}
                      {review.stationRig && (
                        <span className="rounded-md bg-black/20 px-2 py-0.5 text-[10px] font-bold">
                          ⚡ {review.stationRig.split("·")[0]?.trim()}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Review Text */}
                  <p className="mt-3 text-xs leading-relaxed font-medium opacity-95">
                    "{review.text}"
                  </p>
                </div>

                <div className="mt-5 border-t border-current/15 pt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider opacity-75">
                  <span>Verified Lounge Session</span>
                  {review.createdAt && (
                    <span className="text-[9px] font-normal opacity-70">
                      {new Date(review.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Action Banner: "GAME ON. ANYTIME. ANYWHERE" (Matching Reference) */}
      <section className="relative isolate overflow-hidden border-b border-white/10 bg-gradient-to-b from-[#070B1E] via-[#0E1538] to-[#070B1E] py-16 sm:py-24 text-center">
        {/* Glow ambient */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-600/10 blur-[130px]"
        />

        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <p className="font-display text-xs font-bold uppercase tracking-widest text-[#FFB800]">
            READY FOR YOUR NEXT MATCH?
          </p>
          <h2 className="mt-3 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-5xl md:text-6xl">
            Game On. Anytime.{" "}
            <span className="bg-gradient-to-r from-[#23C8F3] via-[#A855F7] to-[#EC4899] bg-clip-text text-transparent">
              Anywhere
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Drop in with your squad or request your preferred station for 1–3 hours. 90+ games, 4K
            HDR displays, and group rates starting from just ₹100/hour.
          </p>

          {/* Chamfered Input / Action Bar */}
          <div className="mx-auto mt-8 flex max-w-md items-center rounded-full border border-white/20 bg-[#070B1E]/95 p-1.5 shadow-2xl backdrop-blur-md">
            <input
              type="text"
              placeholder="Search game or enter squad size..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent px-4 text-xs sm:text-sm text-white placeholder:text-muted-foreground focus:outline-none"
            />
            <a
              href="#book"
              className="btn-chamfer inline-flex items-center gap-1.5 bg-[#FFB800] px-5 py-2.5 font-display text-xs font-black uppercase tracking-wider text-black shadow-md shadow-amber-500/20"
            >
              Book Now
            </a>
          </div>
        </div>
      </section>

      {/* Booking Form Section */}
      <section id="book" className="scroll-mt-8 border-b border-white/10 bg-[#070B1E] py-12 sm:py-24 w-full max-w-full overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14 w-full max-w-full">
          <div className="min-w-0 w-full max-w-full">
            <p className="font-display text-xs font-bold uppercase tracking-widest text-[#FFB800]">
              YOUR NEXT SESSION
            </p>
            <h2 className="mt-2 sm:mt-3 font-display text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
              Request A Booking
            </h2>
            <p className="mt-2 sm:mt-4 max-w-2xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
              Send your preferred time and we’ll confirm station availability with you. Your request
              is not a confirmed reservation yet.
            </p>

            {/* Mobile Real-Time Price Strip (Visible only on mobile / tablets <lg) */}
            <div className="mt-6 lg:hidden flex items-center justify-between rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-[#0E1538] to-cyan-500/15 p-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FFB800] text-black font-black text-sm shadow-md">
                  ₹
                </div>
                <div className="min-w-0">
                  <span className="block font-display text-[11px] font-black uppercase tracking-wider text-[#FFB800]">
                    Estimated Rate
                  </span>
                  <span className="block text-xs text-muted-foreground truncate">
                    {partySize} {partySize === 1 ? "Player" : "Players"} · {durationHours} {durationHours === 1 ? "Hour" : "Hours"}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-display text-2xl font-black text-[#FFB800]">₹{total}</span>
                <span className="block text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Group Total</span>
              </div>
            </div>

            {/* Selected game alert banner */}
            {selectedGameTitle && (
              <div
                className={`mt-6 flex flex-col gap-2 rounded-xl border p-4 text-xs sm:text-sm w-full max-w-full break-words ${
                  selectedGameTitle.includes("Grand Theft Auto VI")
                    ? "border-fuchsia-500/50 bg-fuchsia-950/30 text-white"
                    : "border-cyan-500/40 bg-cyan-950/20 text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Sparkles
                      className={`size-4 shrink-0 ${
                        selectedGameTitle.includes("Grand Theft Auto VI")
                          ? "text-fuchsia-400"
                          : "text-cyan-400"
                      }`}
                    />
                    <span className="truncate max-w-[220px]">
                      {selectedGameTitle.includes("Grand Theft Auto VI")
                        ? "Launch Slot:"
                        : "Selected game:"}{" "}
                      <strong
                        className={
                          selectedGameTitle.includes("Grand Theft Auto VI")
                            ? "text-fuchsia-300"
                            : "text-[#FFB800]"
                        }
                      >
                        {selectedGameTitle}
                      </strong>
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedGameTitle("")}
                    className="text-xs text-muted-foreground hover:text-white shrink-0 cursor-pointer ml-2"
                    aria-label="Remove selected game"
                  >
                    Clear
                  </button>
                </div>
                {selectedGameTitle.includes("Grand Theft Auto VI") && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    🌴 <strong>GTA VI Launch Priority:</strong> Submitting this request registers
                    your contact with Friendz Arena. We will prioritize your squad for early slots and
                    launch day schedule updates!
                  </p>
                )}
              </div>
            )}

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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

              <fieldset className="space-y-2 w-full max-w-full">
                <legend className="text-xs font-bold uppercase tracking-wider text-white">
                  Preferred Way to Reach You
                </legend>
                <div className="grid grid-cols-2 gap-2 max-w-xs rounded-xl border border-white/10 bg-[#0E1538] p-1.5">
                  <button
                    type="button"
                    onClick={() => setContactMethod("whatsapp")}
                    className={`rounded-lg py-2 font-display text-xs font-bold transition-all text-center cursor-pointer ${
                      contactMethod === "whatsapp"
                        ? "bg-[#FFB800] text-black shadow"
                        : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactMethod("phone")}
                    className={`rounded-lg py-2 font-display text-xs font-bold transition-all text-center cursor-pointer ${
                      contactMethod === "phone"
                        ? "bg-[#FFB800] text-black shadow"
                        : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    Phone Call
                  </button>
                </div>
              </fieldset>

              {/* Live PS5 Slot Availability Indicator */}
              <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 sm:p-4 backdrop-blur-md w-full max-w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex size-2.5 shrink-0 rounded-full ${
                        checkingAvailability
                          ? "bg-amber-400 animate-pulse"
                          : availability?.isAvailable
                          ? "bg-emerald-400 animate-ping"
                          : "bg-red-500"
                      }`}
                    />
                    <span className="font-display text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white">
                      Live PS5 Rig & Game Availability
                    </span>
                  </div>
                  {checkingAvailability ? (
                    <span className="text-xs text-muted-foreground animate-pulse">Checking slot & game copies...</span>
                  ) : availability ? (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] sm:text-xs font-black uppercase tracking-wider leading-snug break-words ${
                        availability.available && availability.gameAvailable
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-red-500/20 text-red-300 border border-red-500/40"
                      }`}
                    >
                      {availability.available && availability.gameAvailable ? (
                        availability.isGta6 ? (
                          <span>🟢 Rig Free · GTA VI Disc ({availability.gameCopiesLeft}/2)</span>
                        ) : (
                          <span>
                            🟢 {availability.availableRigsCount} of 5 Rigs Free{" "}
                            <span className="hidden sm:inline">(PS Plus Deluxe on All Rigs)</span>
                          </span>
                        )
                      ) : availability.isGta6 && !availability.gameAvailable ? (
                        <span>⚠️ 2/2 GTA VI Discs Booked</span>
                      ) : (
                        <span>🔴 All 5 Stations Booked</span>
                      )}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {availability ? availability.message : "Checking live PS5 stations..."}
                </p>
                {selectedGameTitle && (
                  <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-[11px]">
                    <span className="text-white/80 truncate max-w-[220px]">
                      Selected Game: <strong className="text-cyan-300">{selectedGameTitle}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedGameTitle("")}
                      className="text-muted-foreground hover:text-white shrink-0 ml-2 cursor-pointer"
                    >
                      Reset selection
                    </button>
                  </div>
                )}
              </div>

              {/* Playo-Style Date Selection Strip */}
              <div className="space-y-3 w-full max-w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <CalendarIcon className="size-3.5 text-[#FFB800]" />
                    Select Date
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Custom:</span>
                    <input
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="rounded-lg border border-white/20 bg-[#0E1538] px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#FFB800]"
                    />
                  </div>
                </div>

                {/* Horizontal Date Cards Carousel (Playo Style) */}
                <div className="flex w-full max-w-full items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                  {dateOptions.map((opt) => {
                    const isSelected = visitDate === opt.iso;
                    return (
                      <button
                        key={opt.iso}
                        type="button"
                        onClick={() => setVisitDate(opt.iso)}
                        className={`shrink-0 flex min-w-[70px] sm:min-w-[76px] flex-col items-center rounded-2xl border px-2.5 sm:px-3 py-2 text-center transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#FFB800] bg-gradient-to-b from-[#FFB800]/25 to-[#FFB800]/10 text-white shadow-lg shadow-amber-500/20 scale-[1.03] ring-2 ring-[#FFB800]"
                            : "border-white/10 bg-[#0E1538] text-white/70 hover:border-white/30 hover:text-white"
                        }`}
                      >
                        <span className={`text-[10px] font-bold tracking-wider ${isSelected ? "text-[#FFB800]" : "text-muted-foreground"}`}>
                          {opt.dayName}
                        </span>
                        <span className="font-display text-lg sm:text-xl font-black text-white">{opt.dateNum}</span>
                        <span className="text-[10px] text-muted-foreground">{opt.monthStr}</span>
                      </button>
                    );
                  })}
                </div>
                <input type="hidden" name="visitDate" value={visitDate} />
              </div>

              {/* Playo-Style Time Slot Grid for Selected Date */}
              <div className="space-y-3 w-full max-w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <Clock3 className="size-3.5 text-[#23C8F3]" />
                    <span>
                      Available Slots on{" "}
                      <span className="text-[#FFB800]">
                        {new Date(visitDate + "T00:00:00").toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </span>
                  </Label>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <span className="size-2 rounded-full bg-emerald-400" /> Free
                    </span>
                    <span className="flex items-center gap-1 text-amber-400 font-medium">
                      <span className="size-2 rounded-full bg-amber-400" /> Limited
                    </span>
                    <span className="flex items-center gap-1 text-red-400 font-medium">
                      <span className="size-2 rounded-full bg-red-400" /> Full
                    </span>
                  </div>
                </div>

                {loadingSlots ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 animate-pulse py-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="h-14 rounded-xl bg-white/5 border border-white/10" />
                    ))}
                  </div>
                ) : daySlots.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 w-full max-w-full">
                    {daySlots.map((slot) => {
                      const isSelected = visitTime === slot.time;
                      const isAvailable = slot.isAvailable;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => setVisitTime(slot.time)}
                          className={`relative flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all ${
                            isSelected
                              ? "border-[#FFB800] bg-gradient-to-b from-[#FFB800]/30 to-[#FFB800]/10 text-white ring-2 ring-[#FFB800] shadow-lg shadow-amber-500/20"
                              : isAvailable
                              ? slot.isFastFilling
                                ? "border-amber-500/40 bg-amber-950/30 hover:border-amber-400 text-white cursor-pointer"
                                : "border-white/10 bg-[#0E1538] hover:border-emerald-500/60 hover:bg-emerald-950/30 text-white cursor-pointer"
                              : "border-white/5 bg-black/40 text-white/30 cursor-not-allowed opacity-40"
                          }`}
                        >
                          {isSelected && (
                            <span className="absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full bg-[#FFB800] text-black">
                              <Check className="size-2.5 stroke-[3]" />
                            </span>
                          )}
                          <span className="font-display text-xs font-black text-white">{slot.label}</span>
                          <span
                            className={`mt-0.5 text-[9px] font-bold truncate max-w-full ${
                              slot.isPast
                                ? "text-muted-foreground"
                                : slot.isFull
                                ? "text-red-400"
                                : slot.isFastFilling
                                ? "text-amber-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {slot.isPast
                              ? "Past"
                              : slot.isFull
                              ? "Full (0/5)"
                              : slot.isGta6
                              ? `${slot.gameCopiesLeft}/2 Discs`
                              : `${slot.availableRigsCount} Free`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
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
                )}
                <input type="hidden" name="visitTime" value={visitTime} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="partySize" className="text-xs font-bold uppercase tracking-wider text-white">
                    Number of People
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
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-white">
                    Session Length
                  </Label>
                  <Select
                    value={String(durationHours)}
                    onValueChange={(value) => setDurationHours(Number(value) as SessionDuration)}
                  >
                    <SelectTrigger
                      aria-label="Session length"
                      className="rounded-xl border-white/10 bg-[#0E1538] text-white"
                    >
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="gameGenre" className="text-xs font-bold uppercase tracking-wider text-white">
                  Game Genre
                </Label>
                <Select
                  name="gameGenre"
                  value={selectedGenre}
                  onValueChange={(val) => setSelectedGenre(val)}
                  required
                >
                  <SelectTrigger
                    id="gameGenre"
                    className="rounded-xl border-white/10 bg-[#0E1538] text-white"
                  >
                    <SelectValue placeholder="Choose a genre" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#0E1538] text-white">
                    <SelectItem value="any">Surprise me / Any</SelectItem>
                    <SelectItem value="sports">Sports & Cricket</SelectItem>
                    <SelectItem value="racing">Racing</SelectItem>
                    <SelectItem value="fighting">Fighting</SelectItem>
                    <SelectItem value="action-adventure">Action & Adventure</SelectItem>
                    <SelectItem value="open-world">Open World</SelectItem>
                    <SelectItem value="multiplayer">Multiplayer & Co-op</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-white">
                  Anything else or specific game title?{" "}
                  <span className="font-normal text-muted-foreground lowercase">(optional)</span>
                </Label>
                <textarea
                  id="notes"
                  name="notes"
                  maxLength={500}
                  rows={3}
                  defaultValue={selectedGameTitle ? `Interested in: ${selectedGameTitle}` : ""}
                  key={selectedGameTitle}
                  placeholder="e.g. GTA VI Day 1 launch slot, EA FC 24, Cricket 24, Tekken 8, need 2 controllers, etc."
                  className="flex w-full resize-y rounded-xl border border-white/10 bg-[#0E1538] px-3.5 py-2.5 text-sm text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FFB800]"
                />
              </div>

              {/* Honeypot */}
              <div
                aria-hidden="true"
                className="absolute -left-[10000px] top-auto size-px overflow-hidden"
              >
                <label htmlFor="website">Leave this field empty</label>
                <input id="website" name="website" tabIndex={-1} autoComplete="off" />
              </div>

              {errorMessage && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {errorMessage}
                </p>
              )}

              {submitted && (
                <div
                  role="status"
                  className="flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-sm leading-relaxed text-emerald-200"
                >
                  <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-400" />
                  <p>
                    <strong className="text-white">Request received!</strong> Friendz Arena will confirm
                    your station availability and preferred games shortly.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 w-full">
                {/* One-Tap WhatsApp Instant Booking */}
                <a
                  href={`https://wa.me/918498833389?text=${encodeURIComponent(
                    `Hello Friendz Arena! 🎮 I would like to book a PS5 gaming session:\n\n` +
                    `🕹️ Preferred Game / Genre: ${selectedGameTitle || selectedGenre}\n` +
                    `📅 Date: ${visitDate}\n` +
                    `⏰ Time: ${visitTime}\n` +
                    `👥 Players: ${partySize} (${durationHours} hr session)\n` +
                    `💰 Estimated Rate: ₹${total}\n\n` +
                    `Is a station rig available?`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950/60 px-5 py-3.5 font-display text-xs font-black uppercase tracking-wider text-emerald-300 hover:bg-emerald-900/60 transition-all shadow-lg text-center"
                >
                  <MessageCircle className="size-4 fill-current text-emerald-400" />
                  <span>One-Tap WhatsApp</span>
                </a>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-chamfer flex w-full sm:w-auto items-center justify-center gap-2 bg-[#FFB800] px-8 py-3.5 font-display text-xs font-black uppercase tracking-wider text-black shadow-xl shadow-amber-500/20 disabled:opacity-50 cursor-pointer text-center"
                >
                  {submitting ? "Sending request…" : "Send Booking Request"}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Pricing Estimate Card Sidebar */}
          <aside className="w-full max-w-full overflow-hidden h-fit rounded-2xl border border-white/10 bg-[#0E1538] p-5 sm:p-7 lg:sticky lg:top-24 shadow-2xl">
            <span className="flex size-11 items-center justify-center rounded-xl bg-[#FFB800]/15 text-[#FFB800]">
              <Clock3 className="size-5" />
            </span>
            <h3 className="mt-5 font-display text-lg font-black uppercase text-white">Your Estimate</h3>
            <p className="mt-1 text-xs text-muted-foreground">Based on your current choices</p>
            <div className="mt-6 space-y-3.5 border-t border-white/10 pt-5 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">People</span>
                <span className="font-bold text-white">{partySize}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-bold text-white">
                  {durationHours} {durationHours === 1 ? "hour" : "hours"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Group total</span>
                <span className="font-bold text-[#FFB800]">₹{total}</span>
              </div>
              {selectedGameTitle && (
                <div className="flex justify-between gap-3 border-t border-white/10 pt-2.5 text-xs">
                  <span className="text-muted-foreground">Preferred Game</span>
                  <span className="font-semibold text-cyan-400 truncate max-w-[150px]">
                    {selectedGameTitle}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-5 flex items-end justify-between border-t border-white/10 pt-5">
              <span className="text-xs uppercase font-bold text-muted-foreground">Estimated Total</span>
              <span className="font-display text-3xl font-black text-[#FFB800]">₹{total}</span>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              The shop confirms station availability and the final details with you.
            </p>
          </aside>
        </div>
      </section>

      {/* Visit & Contact Section with Interactive Maps */}
      <section id="visit" className="scroll-mt-8 border-b border-white/10 bg-[#0A0F2D] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 space-y-10">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-white/10 pb-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-950/40 px-3.5 py-1.5 font-display text-xs font-semibold text-[#FFB800]">
                <MapPin className="size-3.5 text-[#FFB800]" />
                <span>FIND YOUR LOCAL GAME SPOT</span>
              </div>
              <h2 className="mt-3 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl md:text-5xl">
                See You In Jangareddygudem
              </h2>
              <p className="mt-3 text-muted-foreground sm:text-base">
                Five pro PS5 stations, 4K 120Hz displays, low-latency controllers, and 90+ games.
                Drop by for walk-ins or reserve your slot ahead of time.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="https://wa.me/918498833389?text=Hi%20Friendz%20Arena%2C%20I%20would%20like%20to%20book%20a%20PS5%20session%20today!"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-chamfer inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba59] px-4 py-2.5 font-display text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                <MessageCircle className="size-3.5 fill-current" />
                WhatsApp Booking
              </a>
              <a
                href="mailto:friendzarena89@gmail.com"
                className="btn-chamfer inline-flex items-center gap-2 border border-white/20 bg-white/5 hover:bg-white/15 px-4 py-2.5 font-display text-xs font-black uppercase tracking-wider text-white transition-all cursor-pointer"
              >
                <Mail className="size-3.5 text-[#FFB800]" />
                friendzarena89@gmail.com
              </a>
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=17.12382,81.29596"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-chamfer inline-flex items-center gap-2 bg-[#FFB800] hover:bg-amber-400 px-4 py-2.5 font-display text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Navigation className="size-3.5" />
                Directions
              </a>
              <a
                href="https://www.google.com/maps/search/?api=1&query=17.12382,81.29596"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-chamfer inline-flex items-center gap-2 border border-white/20 bg-white/5 hover:bg-white/15 px-4 py-2.5 font-display text-xs font-black uppercase tracking-wider text-white transition-all cursor-pointer"
              >
                <ExternalLink className="size-3.5" />
                Google Maps
              </a>
            </div>
          </div>

          {/* Grid: Left Contact/Info Cards + Right Interactive Live Map */}
          <div className="grid gap-8 lg:grid-cols-12 items-stretch">
            {/* Left Info Panel (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
              {/* Venue Card */}
              <div className="rounded-3xl border border-white/15 bg-[#081348]/80 p-6 backdrop-blur-xl shadow-xl space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFB800] text-black shadow-md shadow-amber-500/20">
                    <MapPin className="size-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFB800]">
                      Lounge Location
                    </span>
                    <h3 className="font-display text-lg font-black uppercase text-white">
                      Friendz Arena PS5 Lounge
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      Main Road, Near Town Center / RTC Complex, Jangareddygudem, Eluru District, Andhra Pradesh – 534447
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 font-bold text-emerald-300">
                    🟢 Air Conditioned
                  </span>
                  <span className="rounded-lg bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-1 font-bold text-cyan-300">
                    ⚡ 5 DualSense Rigs
                  </span>
                  <span className="rounded-lg bg-purple-500/15 border border-purple-500/30 px-2.5 py-1 font-bold text-purple-300">
                    🥤 Cold Drinks & Snacks
                  </span>
                </div>

                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-2.5">
                  <a
                    href="https://wa.me/918498833389?text=Hi%20Friendz%20Arena%2C%20I%20want%20to%20know%20about%20PS5%20slots%20available%20now!"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-chamfer flex-1 bg-[#25D366] hover:bg-[#20ba59] py-2.5 text-xs font-black uppercase tracking-wider text-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    <MessageCircle className="size-4 fill-current" /> Chat on WhatsApp
                  </a>
                  <a
                    href="mailto:friendzarena89@gmail.com"
                    className="rounded-xl border border-white/20 bg-white/5 hover:bg-white/15 px-3.5 py-2.5 text-xs font-bold text-white flex items-center gap-1.5 transition-all"
                    title="Send Email to friendzarena89@gmail.com"
                  >
                    <Mail className="size-3.5 text-[#FFB800]" /> Email
                  </a>
                </div>
              </div>

              {/* 4 Quick Info Blocks */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* Phone */}
                <div className="rounded-2xl border border-white/10 bg-[#0E1538] p-4 space-y-1">
                  <p className="flex items-center gap-1.5 font-display text-xs font-bold text-cyan-300">
                    <Phone className="size-3.5 text-cyan-400" /> Phone Call
                  </p>
                  <a
                    href="tel:8498833389"
                    className="block font-mono text-sm font-bold text-white hover:text-[#FFB800] transition-colors"
                  >
                    +91 8498833389
                  </a>
                  <p className="text-[10px] text-muted-foreground">Direct Desk Line</p>
                </div>

                {/* WhatsApp */}
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1">
                  <p className="flex items-center gap-1.5 font-display text-xs font-bold text-emerald-400">
                    <MessageCircle className="size-3.5 text-emerald-400 fill-current" /> WhatsApp
                  </p>
                  <a
                    href="https://wa.me/918498833389?text=Hi%20Friendz%20Arena%2C%20I%20would%20like%20to%20know%20about%20PS5%20slot%20availability!"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block font-mono text-sm font-bold text-emerald-300 hover:text-emerald-200 transition-colors"
                  >
                    +91 8498833389
                  </a>
                  <p className="text-[10px] text-emerald-400/80">Instant Booking Action</p>
                </div>

                {/* Email */}
                <div className="rounded-2xl border border-white/10 bg-[#0E1538] p-4 space-y-1">
                  <p className="flex items-center gap-1.5 font-display text-xs font-bold text-amber-300">
                    <Mail className="size-3.5 text-[#FFB800]" /> Email
                  </p>
                  <a
                    href="mailto:friendzarena89@gmail.com"
                    className="block font-mono text-xs font-bold text-white hover:text-[#FFB800] transition-colors truncate"
                    title="friendzarena89@gmail.com"
                  >
                    friendzarena89@gmail.com
                  </a>
                  <p className="text-[10px] text-muted-foreground">Official Inquiries</p>
                </div>

                {/* Timing */}
                <div className="rounded-2xl border border-white/10 bg-[#0E1538] p-4 space-y-1">
                  <p className="flex items-center gap-1.5 font-display text-xs font-bold text-[#FFB800]">
                    <Clock3 className="size-3.5 text-[#FFB800]" /> Opening Hours
                  </p>
                  <p className="font-display text-xs font-bold text-white">10:00 AM – 11:00 PM</p>
                  <p className="text-[10px] text-emerald-400 font-semibold">Open All 7 Days</p>
                </div>
              </div>
            </div>

            {/* Right Map Panel (7 cols) */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="relative flex-1 min-h-[380px] sm:min-h-[440px] rounded-3xl border border-white/15 bg-[#081348] overflow-hidden shadow-2xl">
                {/* Embedded Map iframe */}
                <iframe
                  title="Friendz Arena PS5 Gaming Lounge Map - Jangareddygudem"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=81.275%2C17.110%2C81.315%2C17.138&layer=mapnik&marker=17.1238%2C81.2960"
                  className="size-full min-h-[380px] sm:min-h-[440px] border-0"
                  loading="lazy"
                />

                {/* Top Location Pill Badge Overlay */}
                <div className="absolute top-4 left-4 right-4 sm:right-auto flex items-center justify-between gap-3 rounded-2xl border border-white/20 bg-black/85 p-3 backdrop-blur-md shadow-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#FFB800] text-black font-black text-xs">
                      📍
                    </div>
                    <div>
                      <p className="font-display text-xs font-black uppercase text-white">
                        Friendz Arena PS5 Lounge
                      </p>
                      <p className="text-[10px] text-cyan-300 font-mono">
                        17.1238° N, 81.2960° E · Jangareddygudem
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://www.google.com/maps/dir/?api=1&destination=17.12382,81.29596"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-2.5 py-1 text-[10px] font-bold text-black flex items-center gap-1 shadow-md transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Navigation className="size-3" />
                    Navigate
                  </a>
                </div>

                {/* Bottom Action Strip Overlay */}
                <div className="absolute bottom-4 inset-x-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/15 bg-black/85 px-4 py-2.5 backdrop-blur-md">
                  <span className="text-xs text-white/90 font-medium">
                    Jangareddygudem Town Center, AP
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=17.12382,81.29596"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FFB800] hover:text-amber-300 transition-colors"
                    >
                      <span>Google Maps</span>
                      <ExternalLink className="size-3" />
                    </a>
                    <span className="text-white/20">·</span>
                    <a
                      href="https://maps.apple.com/?q=Friendz+Arena+PS5+Gaming+Lounge&ll=17.12382,81.29596"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300 hover:text-cyan-200 transition-colors"
                    >
                      <span>Apple Maps</span>
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer with Giant Watermark Typography (Matching Reference "NINJA" Watermark) */}
      <footer className="relative isolate overflow-hidden bg-[#050819] pt-16 pb-12">
        {/* Giant Watermark Typography */}
        <div
          aria-hidden="true"
          className="text-watermark pointer-events-none absolute inset-x-0 bottom-6 -z-10 text-center font-black tracking-tighter text-white/[0.04]"
        >
          ARENA
        </div>

        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 sm:px-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center border-b border-white/10 pb-8">
            <div className="flex items-center gap-3.5">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-full border-2 border-cyan-400/80 bg-[#081348] p-1 shadow-lg shadow-cyan-500/25">
                <img
                  src="/logo.png"
                  alt="Friendz Arena Mascot Logo Crest"
                  className="size-full rounded-full object-contain"
                />
              </div>
              <div>
                <span className="block font-display text-base font-extrabold uppercase tracking-tight text-white">
                  Friendz Arena
                </span>
                <span className="block text-xs font-semibold uppercase tracking-wider text-[#23C8F3]">
                  PS5 Gaming Lounge · Est. 2026
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <a href="#rates" className="hover:text-white transition-colors">
                Rates
              </a>
              <a href="#stations" className="hover:text-white transition-colors">
                Rigs
              </a>
              <Link to="/games" className="text-cyan-300 hover:text-white transition-colors">
                Games 3D
              </Link>
              <Link to="/pass-check" className="hover:text-white transition-colors">
                Check Pass
              </Link>
              <a href="#reviews" className="hover:text-white transition-colors">
                Reviews
              </a>
              <a href="#visit" className="hover:text-white transition-colors">
                Location & Hours
              </a>
              <a href="#book" className="text-[#FFB800] hover:underline">
                Book Session
              </a>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center">
            <span>© {new Date().getFullYear()} Friendz Arena. All Rights Reserved.</span>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="mailto:friendzarena89@gmail.com"
                className="flex items-center gap-1.5 text-slate-300 hover:text-[#FFB800] transition-colors"
              >
                <Mail className="size-3.5 text-[#FFB800]" />
                <span>friendzarena89@gmail.com</span>
              </a>
              <span className="text-white/20">·</span>
              <a
                href="https://wa.me/918498833389"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <MessageCircle className="size-3.5 text-emerald-400 fill-current" />
                <span>+91 8498833389</span>
              </a>
              <span className="text-white/20">·</span>
              <span>Jangareddygudem · 10 am–11 pm Daily</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Booking Confirmation Celebration Dialog / Popup */}
      <Dialog open={showBookingPopup} onOpenChange={setShowBookingPopup}>
        <DialogContent className="border border-white/20 bg-[#070B24]/95 text-white w-[calc(100vw-2rem)] max-w-md max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl backdrop-blur-2xl">
          <DialogHeader className="text-center sm:text-center space-y-3">
            <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 shadow-xl shadow-emerald-500/20 animate-pulse">
              <Check className="size-8 stroke-[3]" />
            </div>
            <DialogTitle className="font-display text-2xl font-black uppercase tracking-wide text-white">
              Booking Request Done!
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Your PS5 gaming session request has been received and registered at Friendz Arena.
            </DialogDescription>
          </DialogHeader>

          {popupBooking && (
            <div className="space-y-4 py-2">
              {/* Reference ID Pill */}
              <div className="flex items-center justify-between rounded-xl bg-black/60 border border-white/10 px-3.5 py-2 text-xs">
                <span className="text-muted-foreground font-mono">Reference Token:</span>
                <span className="font-mono font-bold text-[#FFB800]">{popupBooking.id}</span>
              </div>

              {/* Details Summary Card */}
              <div className="rounded-2xl border border-white/10 bg-[#0B1238] p-4 text-xs space-y-2.5">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-muted-foreground">Player / Squad:</span>
                  <span className="font-bold text-white">
                    {popupBooking.customerName} ({popupBooking.partySize}P)
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-muted-foreground">Scheduled Date:</span>
                  <span className="font-bold text-cyan-300">
                    {new Date(popupBooking.visitDate + "T00:00:00").toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-muted-foreground">Scheduled Slot:</span>
                  <span className="font-bold text-[#FFB800]">
                    {popupBooking.visitTime} ({popupBooking.durationHours} hr session)
                  </span>
                </div>
                {popupBooking.notes && (
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-muted-foreground">Game / Notes:</span>
                    <span className="font-bold text-white text-right max-w-[200px] truncate">
                      {popupBooking.notes}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1">
                  <span className="text-muted-foreground">Estimated Total:</span>
                  <span className="font-display text-lg font-black text-emerald-400">
                    ₹{popupBooking.estimatedTotal}
                  </span>
                </div>
              </div>

              {/* Station Safety Message */}
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-3 text-[11px] leading-relaxed text-cyan-200">
                <p>
                  🛡️ <strong>Slot Reserved for {popupBooking.visitDate}:</strong> Your reservation is saved
                  specifically for this date and time. Current ongoing lounge games today will continue uninterrupted.
                  Our staff will verify and send your confirmation!
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <a
                  href={`https://wa.me/918498833389?text=${encodeURIComponent(
                    `Hello Friendz Arena! 🎮 I submitted a PS5 booking request:\n` +
                      `• Name: ${popupBooking.customerName}\n` +
                      `• Date: ${popupBooking.visitDate}\n` +
                      `• Time: ${popupBooking.visitTime} (${popupBooking.durationHours} hr)\n` +
                      `• Squad: ${popupBooking.partySize} Player(s)\n` +
                      `• Game: ${popupBooking.notes || "Deluxe"}\n` +
                      `• Token: ${popupBooking.id}\n\n` +
                      `Please confirm my slot!`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-3 font-display text-xs font-black uppercase tracking-wider text-black flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  <MessageCircle className="size-4 fill-current" /> Confirm on WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => setShowBookingPopup(false)}
                  className="rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-5 py-3 font-display text-xs font-bold uppercase tracking-wider text-white cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Write a Review / Comment Dialog */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="border border-white/20 bg-[#070B24]/95 text-white w-[calc(100vw-2rem)] max-w-lg shadow-2xl backdrop-blur-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFB800] to-[#23C8F3] text-black shadow-lg shadow-amber-500/20">
                <MessageSquarePlus className="size-6 stroke-[2.5]" />
              </div>
              <div>
                <DialogTitle className="font-display text-xl font-black uppercase tracking-wide text-white">
                  Leave a Review
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Share your experience with 4K displays, DualSense Edge controllers, snacks, or games at Friendz Arena.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
            {/* Star Rating Picker */}
            <div className="space-y-1.5 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
              <Label className="text-xs font-bold uppercase tracking-wider text-white block mb-1">
                Your Star Rating
              </Label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (reviewHoverRating !== null ? reviewHoverRating : reviewRating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      onMouseEnter={() => setReviewHoverRating(star)}
                      onMouseLeave={() => setReviewHoverRating(null)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                      title={`${star} Star${star > 1 ? "s" : ""}`}
                    >
                      <Star
                        className={`size-8 transition-colors ${
                          active
                            ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                            : "fill-transparent text-white/30"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] font-bold text-amber-300">
                {(reviewHoverRating !== null ? reviewHoverRating : reviewRating) === 5
                  ? "⭐⭐⭐⭐⭐ 5/5 — Phenomenal Gaming Experience!"
                  : (reviewHoverRating !== null ? reviewHoverRating : reviewRating) === 4
                  ? "⭐⭐⭐⭐ 4/5 — Really Great Session!"
                  : (reviewHoverRating !== null ? reviewHoverRating : reviewRating) === 3
                  ? "⭐⭐⭐ 3/5 — Good Experience"
                  : (reviewHoverRating !== null ? reviewHoverRating : reviewRating) === 2
                  ? "⭐⭐ 2/5 — Decent, Can Improve"
                  : "⭐ 1/5 — Needs Work"}
              </p>
            </div>

            {/* Name & Role Inputs */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-white">Your Name *</Label>
                <Input
                  required
                  placeholder="e.g. Rahul Varma"
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  className="rounded-xl border-white/10 bg-[#0E1538] text-white placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-white">Gamer Tag / Role</Label>
                <Input
                  placeholder="e.g. FIFA Regular, Weekend Squad"
                  value={reviewRole}
                  onChange={(e) => setReviewRole(e.target.value)}
                  className="rounded-xl border-white/10 bg-[#0E1538] text-white placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Favorite Game & Rig */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-white">Favorite Game Played</Label>
                <Input
                  placeholder="e.g. EA FC 24, Cricket 24, GTA V"
                  value={reviewGame}
                  onChange={(e) => setReviewGame(e.target.value)}
                  className="rounded-xl border-white/10 bg-[#0E1538] text-white placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-white">Station / Rig (Optional)</Label>
                <select
                  value={reviewRig}
                  onChange={(e) => setReviewRig(e.target.value)}
                  className="w-full h-10 rounded-xl border border-white/10 bg-[#0E1538] px-3 text-xs text-white focus:outline-none"
                >
                  <option value="">Any Station Console</option>
                  <option value="Rig 01 · DualSense 1v1 Arena">Rig 01 · DualSense 1v1 Arena</option>
                  <option value="Rig 02 · Vice City Ready">Rig 02 · Vice City Ready</option>
                  <option value="Rig 03 · Fighting Colosseum">Rig 03 · Fighting Colosseum</option>
                  <option value="Rig 04 · PlayStation Exclusives">Rig 04 · PlayStation Exclusives</option>
                  <option value="Rig 05 · Co-op Squad Lounge">Rig 05 · Co-op Squad Lounge</option>
                </select>
              </div>
            </div>

            {/* Review Comment Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase text-white">Your Review *</Label>
                <span className="text-[10px] text-muted-foreground">
                  {reviewComment.length} / 600 characters
                </span>
              </div>
              <textarea
                required
                rows={4}
                maxLength={600}
                placeholder="Tell other gamers what you enjoyed: 4K 120Hz displays, DualSense Edge vibration, competitive 1v1 FIFA, squad co-op, cold Red Bull & nachos..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#0E1538] p-3 text-xs text-white placeholder:text-muted-foreground focus:border-[#FFB800] focus:outline-none transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="rounded-xl border border-white/20 bg-white/5 hover:bg-white/15 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingReview}
                className="btn-chamfer bg-gradient-to-r from-[#FFB800] to-amber-400 px-6 py-2.5 font-display text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-amber-500/20 hover:scale-105 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {submittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Floating Sticky WhatsApp Quick Action Button */}
      <aside aria-label="WhatsApp quick contact" className="fixed bottom-6 right-6 z-50 flex items-center">
        <a
          href="https://wa.me/918498833389?text=Hi%20Friendz%20Arena%2C%20I%20have%20a%20question%20about%20PS5%20slots%20and%20games!"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex items-center gap-2.5 rounded-full bg-[#25D366] px-4 py-3 font-display text-xs font-black uppercase tracking-wider text-black shadow-2xl shadow-emerald-500/50 transition-all duration-300 hover:scale-105 hover:bg-[#20ba59] hover:shadow-emerald-500/70 ring-2 ring-white/30 cursor-pointer"
        >
          {/* Subtle pulse ring */}
          <span className="absolute -inset-1 -z-10 rounded-full bg-[#25D366] opacity-40 blur-sm animate-pulse" />
          <MessageCircle className="size-5 fill-black text-black" />
          <span className="hidden sm:inline">WhatsApp Chat</span>
        </a>
      </aside>
    </main>
  );
}
