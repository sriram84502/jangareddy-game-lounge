import { useState, useEffect, useMemo, useRef, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "qrcode";
import jsQR from "jsqr";
import {
  AlertCircle,
  Bell,
  Calendar,
  Camera,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Clock3,
  Coffee,
  Copy,
  Crown,
  DollarSign,
  Download,
  Edit,
  Eye,
  FileText,
  Flame,
  Gamepad2,
  Layers,
  LayoutGrid,
  Lock,
  LogOut,
  MessageCircle,
  Phone,
  Plus,
  QrCode,
  Receipt,
  RefreshCw,
  ScanLine,
  Search,
  ShieldAlert,
  Sparkles,
  Table,
  Tag,
  Trash2,
  TrendingUp,
  Trophy,
  Upload,
  User,
  Users,
  UtensilsCrossed,
  X,
  Zap,
} from "lucide-react";

import {
  adminLoginFn,
  adminGetBookingsFn,
  adminCreateOfflineBookingFn,
  adminUpdateBookingStatusFn,
  adminExtendBookingFn,
  adminGetGamesFn,
  adminAddGameFn,
  adminUpdateGameFn,
  adminDeleteGameFn,
  adminGetPricingFn,
  adminUpdatePricingFn,
  adminGetSnacksFn,
  adminAddSnackFn,
  adminUpdateSnackFn,
  adminDeleteSnackFn,
  adminGetGamerPassesFn,
  adminIssueGamerPassFn,
  adminDeductPassHoursFn,
  adminTopUpGamerPassFn,
  adminDeleteGamerPassFn,
  adminGetAnalyticsFn,
  adminGetStationOrdersFn,
  adminUpdateStationOrderStatusFn,
  adminAutoAssignBookingFn,
  adminGetDayScheduleFn,
  adminCheckInBookingFn,
} from "@/lib/booking.functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateSessionPrice, GROUP_SIZES, SESSION_DURATIONS, type SessionDuration } from "@/lib/pricing";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Super Admin Console | Friendz Arena PS5 Lounge" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

const PS5_STATIONS = [
  "Rig 01 · DualSense 1v1 Arena",
  "Rig 02 · Vice City Ready",
  "Rig 03 · Fighting Colosseum",
  "Rig 04 · PlayStation Exclusives",
  "Rig 05 · Co-op Squad Lounge",
];

function AdminPage() {
  const loginFn = useServerFn(adminLoginFn);
  const getBookingsFn = useServerFn(adminGetBookingsFn);
  const createBookingFn = useServerFn(adminCreateOfflineBookingFn);
  const updateStatusFn = useServerFn(adminUpdateBookingStatusFn);
  const extendBookingFn = useServerFn(adminExtendBookingFn);
  const getGamesFn = useServerFn(adminGetGamesFn);
  const addGameFn = useServerFn(adminAddGameFn);
  const updateGameFn = useServerFn(adminUpdateGameFn);
  const deleteGameFn = useServerFn(adminDeleteGameFn);
  const getPricingFn = useServerFn(adminGetPricingFn);
  const updatePricingFn = useServerFn(adminUpdatePricingFn);
  const getSnacksFn = useServerFn(adminGetSnacksFn);
  const addSnackFn = useServerFn(adminAddSnackFn);
  const updateSnackFn = useServerFn(adminUpdateSnackFn);
  const deleteSnackFn = useServerFn(adminDeleteSnackFn);
  const getPassesFn = useServerFn(adminGetGamerPassesFn);
  const issuePassFn = useServerFn(adminIssueGamerPassFn);
  const deductPassFn = useServerFn(adminDeductPassHoursFn);
  const topUpPassFn = useServerFn(adminTopUpGamerPassFn);
  const deletePassFn = useServerFn(adminDeleteGamerPassFn);
  const getAnalyticsFn = useServerFn(adminGetAnalyticsFn);
  const getStationOrdersFn = useServerFn(adminGetStationOrdersFn);
  const updateStationOrderStatusFn = useServerFn(adminUpdateStationOrderStatusFn);
  const autoAssignFn = useServerFn(adminAutoAssignBookingFn);
  const getDayScheduleFn = useServerFn(adminGetDayScheduleFn);
  const checkInBookingFn = useServerFn(adminCheckInBookingFn);

  // Auth State
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<{ username: string; role: string } | null>(null);
  const [loginUsername, setLoginUsername] = useState("admin");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [authenticating, setAuthenticating] = useState(false);

  // Active Tab
  type AdminTab = "timers" | "schedule" | "bookings" | "offline" | "games" | "pricing" | "snacks" | "passes" | "analytics";
  const [activeTab, setActiveTab] = useState<AdminTab>("timers");

  // Playo-Style Date Schedule State
  const [scheduleDate, setScheduleDate] = useState<string>(() => {
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
  const [scheduleData, setScheduleData] = useState<any | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState<boolean>(false);
  const [scheduleFilter, setScheduleFilter] = useState<string>("all");
  const [scheduleViewMode, setScheduleViewMode] = useState<"one-box" | "matrix-grid" | "hourly-cards">("one-box");
  const [oneBoxSelectedHour, setOneBoxSelectedHour] = useState<string>("all");
  const [selectedGridBooking, setSelectedGridBooking] = useState<any | null>(null);

  // Modal for booking directly from an available slot in matrix
  const [slotBookingModal, setSlotBookingModal] = useState<{
    date: string;
    time: string;
    rig: string;
    source: "offline" | "whatsapp";
  } | null>(null);
  const [slotBookingDate, setSlotBookingDate] = useState<string>("");
  const [slotBookingTime, setSlotBookingTime] = useState<string>("16:00");
  const [slotBookingRig, setSlotBookingRig] = useState<string>("auto");
  const [slotBookingSource, setSlotBookingSource] = useState<"offline" | "whatsapp">("offline");
  const [slotBookingCustomer, setSlotBookingCustomer] = useState<string>("");
  const [slotBookingPhone, setSlotBookingPhone] = useState<string>("");
  const [slotBookingParty, setSlotBookingParty] = useState<number>(1);
  const [slotBookingDuration, setSlotBookingDuration] = useState<number>(1);
  const [slotBookingNotes, setSlotBookingNotes] = useState<string>("");
  const [slotBookingSubmitting, setSlotBookingSubmitting] = useState<boolean>(false);
  const [slotBookingError, setSlotBookingError] = useState<string>("");

  function openSlotBookingModal(params: {
    date?: string;
    time?: string;
    rig?: string;
    source?: "offline" | "whatsapp";
  }) {
    const targetDate = params.date || scheduleDate || todayStr;
    const targetTime = params.time || "16:00";
    const targetRig = params.rig || "auto";
    const targetSource = params.source || "offline";

    setSlotBookingDate(targetDate);
    setSlotBookingTime(targetTime);
    setSlotBookingRig(targetRig);
    setSlotBookingSource(targetSource);
    setSlotBookingCustomer(targetSource === "whatsapp" ? "WhatsApp Guest" : "Walk-in Guest");
    setSlotBookingPhone("8498833389");
    setSlotBookingParty(1);
    setSlotBookingDuration(1);
    setSlotBookingNotes("");
    setSlotBookingError("");
    setSlotBookingModal({
      date: targetDate,
      time: targetTime,
      rig: targetRig,
      source: targetSource,
    });
  }

  // Data States
  const [bookings, setBookings] = useState<any[]>([]);
  const [managedGames, setManagedGames] = useState<any[]>([]);
  const [pricingList, setPricingList] = useState<any[]>([]);
  const [snacksList, setSnacksList] = useState<any[]>([]);
  const [passesList, setPassesList] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);

  // Filter & Search
  const [bookingFilter, setBookingFilter] = useState<string>("all");
  const [bookingSearch, setBookingSearch] = useState("");

  // Modals & Forms
  const [editingGame, setEditingGame] = useState<any | null>(null);
  const [newGameModal, setNewGameModal] = useState(false);
  const [receiptBooking, setReceiptBooking] = useState<any | null>(null);
  const [deductModal, setDeductModal] = useState<any | null>(null);
  const [deductHours, setDeductHours] = useState(1);
  const [deductResult, setDeductResult] = useState("");
  const [offlineFormSuccess, setOfflineFormSuccess] = useState<any | null>(null);
  const [offlineFormError, setOfflineFormError] = useState("");

  // Quick Walk-in Rig Modal State
  const [quickWalkInRig, setQuickWalkInRig] = useState<string | null>(null);
  const [quickWalkInTime, setQuickWalkInTime] = useState<string>("");
  const [quickWalkInDur, setQuickWalkInDur] = useState<number>(1);
  const [quickWalkInParty, setQuickWalkInParty] = useState<number>(1);
  const [quickWalkInName, setQuickWalkInName] = useState<string>("Walk-in Guest");
  const [quickWalkInNotes, setQuickWalkInNotes] = useState<string>("");
  const [quickWalkInError, setQuickWalkInError] = useState<string>("");
  const [quickWalkInSubmitting, setQuickWalkInSubmitting] = useState<boolean>(false);

  // Gamer Passes Modal & Form State
  const [newPassModal, setNewPassModal] = useState(false);
  const [newPassCreated, setNewPassCreated] = useState<any | null>(null);
  const [newPassError, setNewPassError] = useState("");
  const [passPreset, setPassPreset] = useState<"rookie" | "pro" | "elite" | "custom">("pro");
  const [passTierHours, setPassTierHours] = useState(10);
  const [passTierPrice, setPassTierPrice] = useState(850);
  const [passSearch, setPassSearch] = useState("");
  const [passStatusFilter, setPassStatusFilter] = useState("all");
  const [copiedPassCode, setCopiedPassCode] = useState<string | null>(null);

  // Top-Up Gamer Pass Modal & Form State
  const [topUpModal, setTopUpModal] = useState<any | null>(null);
  const [topUpHours, setTopUpHours] = useState<number>(10);
  const [topUpPrice, setTopUpPrice] = useState<number>(850);
  const [topUpPaymentMode, setTopUpPaymentMode] = useState<"upi" | "cash">("upi");
  const [topUpCashTendered, setTopUpCashTendered] = useState<number>(850);
  const [topUpUpiQrUrl, setTopUpUpiQrUrl] = useState<string>("");
  const [topUpResult, setTopUpResult] = useState<any | null>(null);
  const [topUpError, setTopUpError] = useState<string>("");
  const [topUpSubmitting, setTopUpSubmitting] = useState<boolean>(false);

  // Digital Bill & QR Payment State
  const [billPaymentMode, setBillPaymentMode] = useState<"upi" | "cash">("upi");
  const [billCashTendered, setBillCashTendered] = useState<number>(0);
  const [billUpiQrUrl, setBillUpiQrUrl] = useState<string>("");
  const [billUpiCopied, setBillUpiCopied] = useState<boolean>(false);

  // Enhanced Checkout & Billing State (Food / Snacks & Gamer Pass)
  const [billSnackItems, setBillSnackItems] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);
  const [billAppliedPass, setBillAppliedPass] = useState<any | null>(null);
  const [billPassDeducted, setBillPassDeducted] = useState<boolean>(false);
  const [billPassMsg, setBillPassMsg] = useState<string>("");
  const [billCustomSnackName, setBillCustomSnackName] = useState<string>("");
  const [billCustomSnackPrice, setBillCustomSnackPrice] = useState<number>(0);
  const [billSelectedSnackId, setBillSelectedSnackId] = useState<string>("");

  // Scanner State for Gamer Pass QR Check-in
  const [passScannerOpen, setPassScannerOpen] = useState<boolean>(false);
  const [scannerCameraActive, setScannerCameraActive] = useState<boolean>(false);
  const [scannerCameraError, setScannerCameraError] = useState<string>("");
  const [scannerManualCode, setScannerManualCode] = useState<string>("");
  const [scannerError, setScannerError] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Snacks & Combos Management State
  const [newSnackModal, setNewSnackModal] = useState<boolean>(false);
  const [editingSnack, setEditingSnack] = useState<any | null>(null);
  const [snackFormError, setSnackFormError] = useState<string>("");

  // Rig Station In-Game Orders State
  const [stationOrders, setStationOrders] = useState<any[]>([]);
  const [printQrModal, setPrintQrModal] = useState<boolean>(false);
  const [rigQrs, setRigQrs] = useState<Record<string, string>>({});
  const [publicDomain, setPublicDomain] = useState<string>("https://trickier-bewilderingly-edda.ngrok-free.dev");

  // Generate QR for all 5 rigs when print modal is opened
  useEffect(() => {
    if (printQrModal && typeof window !== "undefined") {
      const base = publicDomain.trim() || window.location.origin;
      PS5_STATIONS.forEach((rig) => {
        const rigCode = rig.split("·")[0].trim();
        const url = `${base}/station?rig=${encodeURIComponent(rigCode)}`;
        QRCode.toDataURL(url, { width: 180, margin: 1 }, (err, dataUrl) => {
          if (!err && dataUrl) {
            setRigQrs((prev) => ({ ...prev, [rig]: dataUrl }));
          }
        });
      });
    }
  }, [printQrModal, publicDomain]);

  // Check saved session on mount
  useEffect(() => {
    const savedToken = sessionStorage.getItem("fa_admin_token");
    const savedUser = sessionStorage.getItem("fa_admin_user");
    if (savedToken && savedUser) {
      setAuthToken(savedToken);
      try {
        setAdminUser(JSON.parse(savedUser));
      } catch {}
    }
  }, []);

  // Fetch all admin data when authenticated
  useEffect(() => {
    if (authToken) {
      refreshAll();
    }
  }, [authToken]);

  function refreshAll() {
    loadBookings();
    loadGames();
    loadPricing();
    loadSnacks();
    loadPasses();
    loadAnalytics();
    loadStationOrders();
    loadDaySchedule(scheduleDate);
  }

  async function loadDaySchedule(targetDate?: string) {
    if (!authToken) return;
    const dateToLoad = targetDate || scheduleDate;
    setLoadingSchedule(true);
    try {
      const res = await getDayScheduleFn({ data: { token: authToken, visitDate: dateToLoad } });
      if (res) {
        setScheduleData(res);
      }
    } catch (err) {
      console.error("Failed to load schedule:", err);
    } finally {
      setLoadingSchedule(false);
    }
  }

  async function handleCheckIn(bookingId: string) {
    if (!authToken) return;
    try {
      await checkInBookingFn({ data: { token: authToken, bookingId } });
      toast.success("Player checked in! Session is now live on TV.");
      loadBookings();
      loadDaySchedule(scheduleDate);
    } catch (err: any) {
      toast.error(err?.message || "Failed to check in player.");
    }
  }

  async function handleQuickSlotBookingSubmit(e: FormEvent) {
    e.preventDefault();
    if (!slotBookingModal || !authToken) return;
    setSlotBookingSubmitting(true);
    setSlotBookingError("");

    const finalDate = slotBookingDate || slotBookingModal.date;
    const finalTime = slotBookingTime || slotBookingModal.time;
    const finalRig = slotBookingRig || slotBookingModal.rig || "auto";
    const finalSource = slotBookingSource || slotBookingModal.source || "offline";

    try {
      const res = await createBookingFn({
        data: {
          token: authToken,
          customerName: slotBookingCustomer.trim() || (finalSource === "whatsapp" ? "WhatsApp Guest" : "Walk-in Guest"),
          phone: slotBookingPhone.trim() || "8498833389",
          contactMethod: finalSource === "whatsapp" ? "whatsapp" : "phone",
          visitDate: finalDate,
          visitTime: finalTime,
          partySize: slotBookingParty,
          durationHours: slotBookingDuration,
          gameGenre: "any",
          stationRig: finalRig,
          notes: slotBookingNotes.trim(),
          source: finalSource,
        },
      });

      if (res?.success) {
        const rigAssigned = res.booking?.station_rig?.split("·")[0]?.trim() || finalRig;
        toast.success(`Booking confirmed for ${rigAssigned} on ${finalDate} @ ${finalTime}!`);
        setSlotBookingModal(null);
        setSlotBookingCustomer("");
        setSlotBookingPhone("");
        setSlotBookingNotes("");
        setSlotBookingParty(1);
        setSlotBookingDuration(1);
        loadBookings();
        loadDaySchedule(finalDate);
      } else {
        setSlotBookingError((res as any)?.error || "Failed to create booking.");
      }
    } catch (err: any) {
      setSlotBookingError(err?.message || "Failed to save booking.");
    } finally {
      setSlotBookingSubmitting(false);
    }
  }

  // Populate snacks from rig station orders and reset state when receiptBooking is opened
  useEffect(() => {
    if (receiptBooking) {
      setBillPaymentMode("upi");
      setBillAppliedPass(null);
      setBillPassDeducted(false);
      setBillPassMsg("");
      setBillCustomSnackName("");
      setBillCustomSnackPrice(0);
      setBillSelectedSnackId("");

      // Collect unpaid station snack orders for this rig
      const rigClean = (receiptBooking.station_rig || "").split("·")[0].trim().toLowerCase();
      const extractedItems: { id: string; name: string; price: number; qty: number }[] = [];

      stationOrders.forEach((so) => {
        if (!so.station_rig) return;
        const soRig = so.station_rig.split("·")[0].trim().toLowerCase();
        if (soRig === rigClean && so.status !== "paid" && so.service_type === "snacks") {
          try {
            const parsed = JSON.parse(so.items_json || "[]");
            parsed.forEach((it: any) => {
              extractedItems.push({
                id: `${so.id}-${it.id || it.name}`,
                name: it.name || "Snack Item",
                price: Number(it.price) || 0,
                qty: Number(it.qty) || 1,
              });
            });
          } catch {}
        }
      });

      // If the booking had snacks_ordered notes and no items parsed yet, add note
      if (receiptBooking.snacks_ordered && extractedItems.length === 0) {
        extractedItems.push({
          id: `booking-${receiptBooking.id}`,
          name: receiptBooking.snacks_ordered,
          price: 0,
          qty: 1,
        });
      }

      setBillSnackItems(extractedItems);
    }
  }, [receiptBooking, stationOrders]);

  // Derived calculations for bill
  const billSnacksTotal = useMemo(() => {
    return billSnackItems.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.qty) || 1), 0);
  }, [billSnackItems]);

  const billGamingFee = useMemo(() => {
    if (!receiptBooking) return 0;
    if (billAppliedPass) return 0; // WAIVED by Gamer Pass!
    try {
      return calculateSessionPrice(
        Math.min(5, Math.max(1, Number(receiptBooking.party_size) || 1)),
        (Math.min(3, Math.max(1, Number(receiptBooking.duration_hours) || 1)) as SessionDuration)
      );
    } catch {
      return Number(receiptBooking.estimated_total) || 100;
    }
  }, [receiptBooking, billAppliedPass]);

  const billFinalTotal = useMemo(() => {
    return billGamingFee + billSnacksTotal;
  }, [billGamingFee, billSnacksTotal]);

  // Trigger QR generation when receipt totals or pass change
  useEffect(() => {
    if (receiptBooking) {
      setBillCashTendered(billFinalTotal);
      if (billFinalTotal > 0) {
        const upiNote = billAppliedPass
          ? `Snacks INV-${receiptBooking.id.slice(-6).toUpperCase()}`
          : `PS5 Session INV-${receiptBooking.id.slice(-6).toUpperCase()}`;
        const upiUrl = `upi://pay?pa=friendzarena@upi&pn=Friendz%20Arena&am=${billFinalTotal}&cu=INR&tn=${encodeURIComponent(upiNote)}`;
        QRCode.toDataURL(upiUrl, { width: 220, margin: 1 }, (err, url) => {
          if (!err && url) setBillUpiQrUrl(url);
        });
      } else {
        setBillUpiQrUrl("");
      }
    }
  }, [receiptBooking, billFinalTotal, billAppliedPass]);

  // Trigger QR generation when top-up modal is opened or price changes
  useEffect(() => {
    if (topUpModal && topUpPrice > 0) {
      const passCode = topUpModal.pass_code || "PASS";
      const upiUrl = `upi://pay?pa=friendzarena@upi&pn=Friendz%20Arena&am=${topUpPrice}&cu=INR&tn=Pass%20TopUp%20${passCode}`;
      QRCode.toDataURL(upiUrl, { width: 180, margin: 1 }, (err, url) => {
        if (!err && url) setTopUpUpiQrUrl(url);
      });
    }
  }, [topUpModal, topUpPrice]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setAuthenticating(true);
    setLoginError("");

    try {
      const res = await loginFn({
        data: {
          username: loginUsername,
          password: loginPassword,
        },
      });

      if (res?.success && res.token && res.user) {
        setAuthToken(res.token);
        setAdminUser(res.user);
        sessionStorage.setItem("fa_admin_token", res.token);
        sessionStorage.setItem("fa_admin_user", JSON.stringify(res.user));
      } else {
        setLoginError(res?.error || "Invalid username or password");
      }
    } catch {
      setLoginError("Could not log in. Check credentials.");
    } finally {
      setAuthenticating(false);
    }
  }

  function handleLogout() {
    setAuthToken(null);
    setAdminUser(null);
    sessionStorage.removeItem("fa_admin_token");
    sessionStorage.removeItem("fa_admin_user");
  }

  async function loadBookings() {
    if (!authToken) return;
    try {
      const res = await getBookingsFn({ data: { token: authToken } });
      if (res?.success && res.bookings) setBookings(res.bookings);
    } catch {}
  }

  async function loadGames() {
    if (!authToken) return;
    try {
      const res = await getGamesFn({ data: { token: authToken } });
      if (res?.success && res.games) setManagedGames(res.games);
    } catch {}
  }

  async function loadPricing() {
    if (!authToken) return;
    try {
      const res = await getPricingFn({ data: { token: authToken } });
      if (res?.success && res.pricing) setPricingList(res.pricing);
    } catch {}
  }

  async function loadSnacks() {
    if (!authToken) return;
    try {
      const res = await getSnacksFn({ data: { token: authToken } });
      if (res?.success && res.snacks) setSnacksList(res.snacks);
    } catch {}
  }

  async function loadPasses() {
    if (!authToken) return;
    try {
      const res = await getPassesFn({ data: { token: authToken } });
      if (res?.success && res.passes) setPassesList(res.passes);
    } catch {}
  }

  async function loadAnalytics() {
    if (!authToken) return;
    try {
      const res = await getAnalyticsFn({ data: { token: authToken } });
      if (res?.success && res.analytics) setAnalyticsData(res.analytics);
    } catch {}
  }

  async function loadStationOrders() {
    if (!authToken) return;
    try {
      const res = await getStationOrdersFn({ data: { token: authToken } });
      if (res?.success && res.orders) setStationOrders(res.orders);
    } catch {}
  }

  async function handleUpdateStationOrderStatus(id: string, status: string) {
    if (!authToken) return;
    await updateStationOrderStatusFn({
      data: { token: authToken, id, status },
    });
    loadStationOrders();
  }

  // Save new snack
  async function handleSaveNewSnack(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!authToken) return;
    setSnackFormError("");
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const category = String(fd.get("category") || "Snacks");
    const price = Number(fd.get("price")) || 50;
    const is_combo = fd.get("is_combo") === "on";
    const combo_description = String(fd.get("combo_description") || "").trim();

    try {
      const res = await addSnackFn({
        data: {
          token: authToken,
          name,
          category,
          price,
          is_combo,
          combo_description,
        },
      });
      if (res?.success) {
        setNewSnackModal(false);
        loadSnacks();
      } else {
        setSnackFormError("Failed to add snack item.");
      }
    } catch (err: any) {
      setSnackFormError(err?.message || "Failed to add snack.");
    }
  }

  // Save edited snack
  async function handleSaveEditedSnack(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!authToken || !editingSnack) return;
    setSnackFormError("");
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const category = String(fd.get("category") || "Snacks");
    const price = Number(fd.get("price")) || editingSnack.price;
    const is_combo = fd.get("is_combo") === "on";
    const combo_description = String(fd.get("combo_description") || "").trim();
    const is_available = fd.get("is_available") === "on";

    try {
      const res = await updateSnackFn({
        data: {
          token: authToken,
          id: editingSnack.id,
          name,
          category,
          price,
          is_combo,
          combo_description,
          is_available,
        },
      });
      if (res?.success) {
        setEditingSnack(null);
        loadSnacks();
      } else {
        setSnackFormError("Failed to update snack item.");
      }
    } catch (err: any) {
      setSnackFormError(err?.message || "Failed to update snack.");
    }
  }

  // Delete snack
  async function handleDeleteSnack(id: string, name: string) {
    if (!authToken) return;
    if (!confirm(`Are you sure you want to delete "${name}" from the menu?`)) return;
    await deleteSnackFn({ data: { token: authToken, id } });
    loadSnacks();
  }

  async function handleStatusChange(bookingId: string, newStatus: any, stationRig?: string) {
    if (!authToken) return;
    try {
      const res = await updateStatusFn({
        data: {
          token: authToken,
          bookingId,
          status: newStatus,
          stationRig: stationRig || "auto",
        },
      });
      if (res && !(res as any).success) {
        alert((res as any).error || "Could not update booking status.");
        return;
      }
      loadBookings();
      loadDaySchedule(scheduleDate);
    } catch (err: any) {
      alert(err?.message || "Failed to update booking status.");
    }
  }

  // 1-Click Auto-Assign for a booking
  async function handleAutoAssign(bookingId: string) {
    if (!authToken) return;
    try {
      const res = await autoAssignFn({
        data: { token: authToken, bookingId },
      });
      if (res && (res as any).success) {
        alert(`✓ ${res.message || "Rig assigned successfully!"}`);
        loadBookings();
      loadDaySchedule(scheduleDate);
      } else {
        alert((res as any)?.error || "Could not auto-assign rig.");
      }
    } catch (err: any) {
      alert(err?.message || "Auto-assign failed.");
    }
  }

  function openQuickWalkIn(rigName: string) {
    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    setQuickWalkInRig(rigName || "auto");
    setQuickWalkInTime(timeStr);
    setQuickWalkInDur(1);
    setQuickWalkInParty(1);
    setQuickWalkInName("Walk-in Guest");
    setQuickWalkInNotes("");
    setQuickWalkInError("");
  }

  async function handleQuickWalkInSubmit(e: FormEvent) {
    e.preventDefault();
    if (!authToken || !quickWalkInRig) return;
    setQuickWalkInError("");
    setQuickWalkInSubmitting(true);

    try {
      const res = await createBookingFn({
        data: {
          token: authToken,
          customerName: quickWalkInName.trim() || "Walk-in Guest",
          phone: "8498833389",
          contactMethod: "whatsapp",
          visitDate: todayStr,
          visitTime: quickWalkInTime,
          partySize: quickWalkInParty,
          durationHours: quickWalkInDur as any,
          gameGenre: "any",
          stationRig: quickWalkInRig,
          notes: quickWalkInNotes,
          source: "offline",
        },
      });

      if (res?.success) {
        setQuickWalkInRig(null);
        loadBookings();
      loadDaySchedule(scheduleDate);
      } else {
        setQuickWalkInError((res as any)?.error || "Failed to assign walk-in to rig.");
      }
    } catch (err: any) {
      setQuickWalkInError(err?.message || "Failed to assign walk-in.");
    } finally {
      setQuickWalkInSubmitting(false);
    }
  }

  // Extend active session (+30 mins or +1 hr)
  async function handleExtendSession(bookingId: string, hours: number, extraCost: number) {
    if (!authToken) return;
    await extendBookingFn({
      data: {
        token: authToken,
        bookingId,
        additionalHours: hours,
        additionalCost: extraCost,
      },
    });
    loadBookings();
  }

  // Save modified game
  async function handleSaveEditedGame(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!authToken || !editingGame) return;
    const fd = new FormData(e.currentTarget);
    await updateGameFn({
      data: {
        token: authToken,
        id: editingGame.id,
        title: String(fd.get("title")),
        genre: String(fd.get("genre")),
        genre_label: String(fd.get("genre_label")),
        players: String(fd.get("players")),
        tagline: String(fd.get("tagline")),
        badge: String(fd.get("badge") || ""),
        cover: String(fd.get("cover")),
        source: String(fd.get("source")),
        copies_count: Number(fd.get("copies_count")) || 5,
        is_new_arrival: fd.get("is_new_arrival") === "on",
        is_featured: fd.get("is_featured") === "on",
      },
    });
    setEditingGame(null);
    loadGames();
  }

  // Delete game
  async function handleDeleteGame(gameId: string) {
    if (!authToken) return;
    if (!confirm("Are you sure you want to remove this game from the library?")) return;
    await deleteGameFn({ data: { token: authToken, id: gameId } });
    loadGames();
  }

  // Pricing update
  async function handleRateChange(partySize: number, durationHours: number, newPrice: number) {
    if (!authToken) return;
    await updatePricingFn({
      data: {
        token: authToken,
        partySize,
        durationHours,
        price: newPrice,
      },
    });
    loadPricing();
  }

  // Export Bookings to CSV
  function handleExportCsv() {
    if (!bookings.length) return;
    const headers = ["ID", "Customer", "Phone", "Date", "Time", "Duration_Hours", "Party_Size", "Rig", "Game_Notes", "Total_INR", "Status", "Source"];
    const rows = bookings.map((b) => [
      b.id,
      `"${b.customer_name}"`,
      b.phone,
      b.visit_date,
      b.visit_time,
      b.duration_hours,
      b.party_size,
      `"${b.station_rig || 'Unassigned'}"`,
      `"${(b.notes || '').replace(/"/g, '""')}"`,
      b.estimated_total,
      b.status,
      b.source,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `friendz_arena_bookings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Pre-generate WhatsApp message for a booking confirmation
  function getWhatsAppConfirmUrl(b: any) {
    const cleanPhone = b.phone.replace(/[^0-9]/g, "");
    const intlPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `Hello ${b.customer_name}! 🎮 Your PS5 session at Friendz Arena (Jangareddygudem) has been CONFIRMED!\n\n` +
      `📅 Date: ${b.visit_date}\n` +
      `⏰ Time: ${b.visit_time}\n` +
      `🕹️ Station: ${b.station_rig || "Reserved PS5 Station"}\n` +
      `👥 Players: ${b.party_size} (${b.duration_hours} hr/hrs)\n` +
      `💰 Total: ₹${b.estimated_total}\n` +
      `🎮 Game: ${b.notes || "Open Game Selection"}\n` +
      (b.snacks_ordered ? `🍿 Snacks: ${b.snacks_ordered}\n` : "") +
      `\nPlease arrive 5 minutes early. See you at the arena!`
    );
    return `https://wa.me/${intlPhone}?text=${msg}`;
  }

  // Generate Digital Invoice WhatsApp URL
  function getWhatsAppInvoiceUrl(b: any) {
    const cleanPhone = b.phone.replace(/[^0-9]/g, "");
    const intlPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const change = Math.max(0, billCashTendered - billFinalTotal);
    const paymentLine =
      billPaymentMode === "cash"
        ? `Payment Mode: CASH PAID (Tendered: ₹${billCashTendered || billFinalTotal}${change > 0 ? `, Change Returned: ₹${change}` : ""})\nStatus: PAID IN CASH ✅\n`
        : `Payment Mode: UPI ONLINE (friendzarena@upi)\nStatus: PAID ONLINE ✅\n`;

    const passLine = billAppliedPass
      ? `🎮 PS5 Gaming Session: COVERED BY GAMER PASS ✅\n` +
        `   Pass: ${billAppliedPass.pass_code} (${billAppliedPass.gamer_tag})\n` +
        `   Hours: ${b.duration_hours} hr deducted (${billAppliedPass.remaining_hours} hrs balance)\n` +
        `   Gaming Charge: ₹0 (WAIVED VIA PASS)\n`
      : `🎮 PS5 Gaming Session: ₹${billGamingFee} (${b.duration_hours} hr, ${b.party_size} players)\n`;

    const snacksSection = billSnackItems.length > 0
      ? `🍿 Snacks & Refreshments:\n` +
        billSnackItems.map((s) => `   • ${s.name} x${s.qty}: ₹${s.price * s.qty}`).join("\n") +
        `\n   Food Bill Total: ₹${billSnacksTotal}\n`
      : "";

    const msg = encodeURIComponent(
      `🧾 FRIENDZ ARENA PS5 LOUNGE — OFFICIAL BILL\n` +
      `===================================\n` +
      `Invoice: INV-${b.id.slice(-6).toUpperCase()}\n` +
      `Customer: ${b.customer_name}\n` +
      `Date: ${b.visit_date} | Time: ${b.visit_time}\n` +
      `Station: ${b.station_rig || "Rig"}\n` +
      `Game: ${b.notes || "PlayStation 5"}\n` +
      `-----------------------------------\n` +
      passLine +
      snacksSection +
      `-----------------------------------\n` +
      `TOTAL PAYABLE: ₹${billFinalTotal}` +
      (billAppliedPass ? ` (Food & Refreshments Only)` : "") + `\n` +
      paymentLine +
      `-----------------------------------\n` +
      `Thank you for gaming at Friendz Arena! See you next time! 🎮🔥`
    );
    return `https://wa.me/${intlPhone}?text=${msg}`;
  }

  // QR Scanner Functions for Gamer Pass
  function startCamera() {
    setScannerCameraError("");
    setScannerCameraActive(true);
    if (!navigator?.mediaDevices?.getUserMedia) {
      setScannerCameraError("Camera not available on this browser. Please upload an image or type the code.");
      setScannerCameraActive(false);
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.play();
          animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
        }
      })
      .catch((err) => {
        console.error("Camera access error:", err);
        setScannerCameraError("Camera permission denied. You can upload an image or enter the code manually.");
        setScannerCameraActive(false);
      });
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setScannerCameraActive(false);
  }

  function scanVideoFrame() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code && code.data) {
          const passCode = extractPassCode(code.data);
          applyGamerPass(passCode);
          return;
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
  }

  function handleQrImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !canvasRef.current) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current!;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            const passCode = extractPassCode(code.data);
            applyGamerPass(passCode);
          } else {
            setScannerError("No valid QR code found in image. Please enter pass code manually.");
          }
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  function extractPassCode(raw: string): string {
    const trimmed = raw.trim();
    const matchUrl = trimmed.match(/[?&]code=([A-Za-z0-9_-]+)/i);
    if (matchUrl && matchUrl[1]) return matchUrl[1];
    const matchCode = trimmed.match(/ARENA-[A-Za-z0-9_-]+/i);
    if (matchCode) return matchCode[0];
    return trimmed;
  }

  function applyGamerPass(code: string) {
    setScannerError("");
    const cleaned = code.trim().toUpperCase();
    const found = passesList.find(
      (p) => p.pass_code?.toUpperCase() === cleaned || p.gamer_tag?.toUpperCase() === cleaned
    );

    if (!found) {
      setScannerError(`No Gamer Pass found with code "${code}".`);
      return;
    }

    if (found.remaining_hours <= 0 || found.status !== "active") {
      setScannerError(`Pass ${found.pass_code} (${found.gamer_tag}) has 0 hours remaining. Please top up first.`);
      return;
    }

    setBillAppliedPass(found);
    setBillPassDeducted(false);
    setPassScannerOpen(false);
    stopCamera();
    setBillPassMsg(`✓ Gamer Pass Applied: ${found.pass_code} (${found.gamer_tag}) · Balance: ${found.remaining_hours}h`);
  }

  // Complete session, deduct pass hours (if applied), and mark station orders paid
  async function handleCheckoutComplete() {
    if (!authToken || !receiptBooking) return;

    try {
      if (billAppliedPass && !billPassDeducted) {
        const hoursToDeduct = Math.min(billAppliedPass.remaining_hours, receiptBooking.duration_hours || 1);
        const res = await deductPassFn({
          data: {
            token: authToken,
            passCode: billAppliedPass.pass_code,
            hoursToDeduct,
          },
        });
        if (res?.success) {
          setBillPassDeducted(true);
          loadPasses();
        }
      }

      await updateStatusFn({
        data: {
          token: authToken,
          bookingId: receiptBooking.id,
          status: "completed",
        },
      });

      // Mark matching rig station orders as paid
      const rigClean = (receiptBooking.station_rig || "").split("·")[0].trim().toLowerCase();
      stationOrders.forEach(async (so) => {
        if (!so.station_rig) return;
        const soRig = so.station_rig.split("·")[0].trim().toLowerCase();
        if (soRig === rigClean && so.status !== "paid") {
          await updateStationOrderStatusFn({
            data: { token: authToken, id: so.id, status: "paid" },
          });
        }
      });

      loadBookings();
      loadDaySchedule(scheduleDate);
      loadStationOrders();
      alert(`✓ Checkout complete! ${billAppliedPass ? "Pass hours deducted and food bill marked paid." : "Payment collected and booking marked completed."}`);
    } catch (err: any) {
      alert(err?.message || "Failed to complete checkout.");
    }
  }

  // Generate Digital Gamer Pass WhatsApp URL
  function getWhatsAppPassUrl(p: any) {
    const cleanPhone = (p.phone || "").replace(/[^0-9]/g, "");
    const intlPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `🎮 FRIENDZ ARENA — ARENA PRO GAMER PASS ISSUED! 🔥\n` +
      `===================================\n` +
      `Player: ${p.customer_name} (${p.gamer_tag})\n` +
      `Pass Code: ${p.pass_code}\n` +
      `Total Hours: ${p.total_hours} Hours\n` +
      `Current Balance: ${p.remaining_hours} Hours remaining\n` +
      `Amount Paid: ₹${p.price_paid}\n` +
      `Status: ${String(p.status || "ACTIVE").toUpperCase()}\n` +
      `-----------------------------------\n` +
      `Show this code or mention your Gamer Tag at the desk on any visit to deduct hours directly without paying cash each session!\n` +
      `📍 Friendz Arena PS5 Lounge, Beside RTC Bus Stand, Jangareddygudem.`
    );
    return `https://wa.me/${intlPhone}?text=${msg}`;
  }

  function handleCopyPassCode(code: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedPassCode(code);
      setTimeout(() => setCopiedPassCode(null), 2000);
    }
  }

  // Generate Digital Top-up Receipt WhatsApp URL
  function getWhatsAppTopUpUrl(resPass: any) {
    const cleanPhone = (resPass.phone || "").replace(/[^0-9]/g, "");
    const intlPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const paymentLine =
      topUpPaymentMode === "cash"
        ? `Payment Mode: CASH PAID (₹${resPass.amount_paid || topUpPrice})\nStatus: PAID IN CASH ✅\n`
        : `Payment Mode: UPI ONLINE (friendzarena@upi)\nStatus: PAID ONLINE ✅\n`;

    const msg = encodeURIComponent(
      `⚡ FRIENDZ ARENA — GAMER PASS TOP-UP SUCCESSFUL! 🎮\n` +
      `===================================\n` +
      `Player: ${resPass.customer_name} (${resPass.gamer_tag})\n` +
      `Pass Code: ${resPass.pass_code}\n` +
      `Recharge Added: +${resPass.hours_added} Hours\n` +
      `Amount Paid: ₹${resPass.amount_paid || topUpPrice}\n` +
      paymentLine +
      `-----------------------------------\n` +
      `⚡ NEW BALANCE: ${resPass.remaining_hours} Hours remaining\n` +
      `Total Lifetime Hours: ${resPass.total_hours} Hours\n` +
      `Status: ACTIVE 🔥\n` +
      `-----------------------------------\n` +
      `Ready to game anytime! Just show your Pass Code or mention your Gamer Tag at the desk.\n` +
      `📍 Friendz Arena PS5 Lounge, Beside RTC Bus Stand, Jangareddygudem.`
    );
    return `https://wa.me/${intlPhone}?text=${msg}`;
  }

  async function handleTopUpSubmit() {
    if (!authToken || !topUpModal) return;
    setTopUpSubmitting(true);
    setTopUpError("");
    setTopUpResult(null);

    try {
      const res = await topUpPassFn({
        data: {
          token: authToken,
          passCode: topUpModal.pass_code,
          hoursToAdd: topUpHours,
          additionalPrice: topUpPrice,
        },
      });

      if (res?.success && res.pass) {
        setTopUpResult(res.pass);
        loadPasses();
      } else {
        setTopUpError((res as any)?.message || (res as any)?.error || "Failed to top up pass.");
      }
    } catch (err: any) {
      setTopUpError(err?.message || "Failed to top up gamer pass.");
    } finally {
      setTopUpSubmitting(false);
    }
  }

  // Issue New Gamer Pass
  async function handleIssuePass(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!authToken) {
      setNewPassError("Authentication expired. Please log in again.");
      return;
    }
    setNewPassError("");

    const fd = new FormData(e.currentTarget);
    const customer_name = String(fd.get("customer_name") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    const gamer_tag = String(fd.get("gamer_tag") || "").trim();
    const total_hours = Number(fd.get("total_hours")) || passTierHours;
    const price_paid = Number(fd.get("price_paid")) || passTierPrice;

    if (!customer_name) {
      setNewPassError("Please provide the customer name.");
      return;
    }
    if (!phone) {
      setNewPassError("Please provide a WhatsApp phone number.");
      return;
    }
    if (!gamer_tag) {
      setNewPassError("Please provide a gamer tag / handle.");
      return;
    }

    try {
      const res = await issuePassFn({
        data: {
          token: authToken,
          customer_name,
          phone,
          gamer_tag,
          total_hours,
          price_paid,
        },
      });

      if (res?.success && res.pass) {
        setNewPassCreated(res.pass);
        loadPasses();
      } else {
        setNewPassError((res as any)?.error || "Failed to create gamer pass.");
      }
    } catch (err: any) {
      console.error("Pass creation error:", err);
      setNewPassError(err?.message || "Failed to issue gamer pass.");
    }
  }

  // Delete Gamer Pass
  async function handleDeletePass(passId: string, passCode: string) {
    if (!authToken) return;
    if (!confirm(`Are you sure you want to permanently delete pass ${passCode}?`)) return;
    try {
      await deletePassFn({ data: { token: authToken, id: passId } });
      loadPasses();
    } catch (err: any) {
      alert(err?.message || "Failed to delete pass.");
    }
  }

  // Filtered Gamer Passes
  const filteredPasses = useMemo(() => {
    return passesList.filter((p) => {
      if (passStatusFilter !== "all" && p.status !== passStatusFilter) return false;
      if (!passSearch.trim()) return true;
      const q = passSearch.toLowerCase();
      return (
        p.pass_code?.toLowerCase().includes(q) ||
        p.gamer_tag?.toLowerCase().includes(q) ||
        p.customer_name?.toLowerCase().includes(q) ||
        p.phone?.includes(q)
      );
    });
  }, [passesList, passStatusFilter, passSearch]);

  // Gamer Passes Quick Stats
  const passStats = useMemo(() => {
    const total = passesList.length;
    const active = passesList.filter((p) => p.status === "active" && p.remaining_hours > 0).length;
    const totalHours = passesList.reduce((acc, p) => acc + (Number(p.total_hours) || 0), 0);
    const totalRevenue = passesList.reduce((acc, p) => acc + (Number(p.price_paid) || 0), 0);
    return { total, active, totalHours, totalRevenue };
  }, [passesList]);

  // Handle Offline Booking Submission
  async function handleCreateOfflineBooking(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!authToken) {
      setOfflineFormError("Admin session expired. Please log in again.");
      return;
    }
    setOfflineFormError("");
    setOfflineFormSuccess(null);

    const fd = new FormData(e.currentTarget);
    const customerName = String(fd.get("customerName") || "").trim() || "Walk-in Guest";
    const phone = String(fd.get("phone") || "").trim() || "8498833389";
    const visitDate = String(fd.get("visitDate") || todayStr);
    const visitTime = String(fd.get("visitTime") || "16:00");
    const stationRig = String(fd.get("stationRig") || "auto");
    const partySize = Math.min(5, Math.max(1, Number(fd.get("partySize")) || 1));
    const durationHours = Math.min(3, Math.max(1, Number(fd.get("durationHours")) || 1));
    const notes = String(fd.get("notes") || "");
    const snacksOrdered = String(fd.get("snacksOrdered") || "");
    const source = (fd.get("source") as any) || "offline";

    try {
      const res = await createBookingFn({
        data: {
          token: authToken,
          customerName,
          phone,
          contactMethod: "whatsapp",
          visitDate,
          visitTime,
          partySize,
          durationHours: durationHours as any,
          gameGenre: "any",
          stationRig,
          notes,
          snacksOrdered,
          source,
        },
      });

      if (res?.success) {
        setOfflineFormSuccess(res.booking);
        e.currentTarget.reset();
        loadBookings();
      loadDaySchedule(scheduleDate);
      } else {
        setOfflineFormError((res as any)?.error || "Failed to create booking.");
      }
    } catch (err: any) {
      console.error("Booking creation error:", err);
      const errMsg = err?.message || err?.error || "Failed to save booking. Check inputs.";
      setOfflineFormError(errMsg);
    }
  }

  // Compute live station occupancy for the Timers Dashboard
  const todayStr = (() => {
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
  })();

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

  const [currentTimeStr, setCurrentTimeStr] = useState<string>(() => {
    try {
      return new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  });

  useEffect(() => {
    function tick() {
      const d = new Date();
      try {
        const parts = new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "numeric",
          minute: "numeric",
          hour12: false,
        }).formatToParts(d);
        const h = Number(parts.find((p) => p.type === "hour")?.value || 0);
        const m = Number(parts.find((p) => p.type === "minute")?.value || 0);
        setCurrentMinutes(h * 60 + m);
        setCurrentTimeStr(
          d.toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      } catch {
        setCurrentMinutes(d.getHours() * 60 + d.getMinutes());
        setCurrentTimeStr(d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
    }
    const t = setInterval(tick, 2000);
    return () => clearInterval(t);
  }, []);

  const stationTimers = useMemo(() => {
    return PS5_STATIONS.map((stationName) => {
      // Find active confirmed booking on this rig strictly for today
      const activeBooking = bookings.find((b) => {
        if (!b.station_rig || !b.station_rig.toLowerCase().includes(stationName.split("·")[0]?.trim().toLowerCase())) return false;
        if (b.status !== "confirmed") return false;
        if (b.visit_date !== todayStr) return false;

        const [bh, bm] = b.visit_time.split(":").map(Number);
        const bStart = (bh || 0) * 60 + (bm || 0);
        const bEnd = bStart + (Number(b.duration_hours) || 1) * 60;

        // CRITICAL: If the booking time has NOT arrived yet, it CANNOT be live!
        // A booking at 10:00 AM or 11:00 AM cannot be active before its time!
        if (currentMinutes < bStart - 10) {
          return false;
        }

        // If session has expired well past its end time (+25 min grace), it is no longer active
        if (currentMinutes > bEnd + 25) {
          return false;
        }

        // If session_started_at is recorded, check elapsed minutes within session window
        if (b.session_started_at && b.visit_date === todayStr) {
          const elapsed = (Date.now() - new Date(b.session_started_at).getTime()) / 60000;
          const totalDur = (Number(b.duration_hours) || 1) * 60;
          if (elapsed >= 0 && elapsed <= totalDur + 30 && currentMinutes <= bEnd + 20) {
            return true;
          }
        }

        // Is it happening today around now or within active duration window?
        return currentMinutes >= bStart - 10 && currentMinutes <= bEnd + 20;
      });

      if (!activeBooking) {
        // Find if there is an upcoming reservation for later today on this station!
        const upcomingBooking = bookings.find((b) => {
          if (!b.station_rig || !b.station_rig.toLowerCase().includes(stationName.split("·")[0]?.trim().toLowerCase())) return false;
          if (b.status !== "confirmed") return false;
          if (b.visit_date !== todayStr) return false;
          const [bh, bm] = b.visit_time.split(":").map(Number);
          const bStart = (bh || 0) * 60 + (bm || 0);
          return bStart > currentMinutes;
        });

        return {
          station: stationName,
          isOccupied: false,
          booking: null,
          upcomingBooking: upcomingBooking || null,
          minutesLeft: 0,
          statusColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
        };
      }

      const [bh, bm] = activeBooking.visit_time.split(":").map(Number);
      const bStart = (bh || 0) * 60 + (bm || 0);
      const bEnd = bStart + (Number(activeBooking.duration_hours) || 1) * 60;
      const minutesLeft = bEnd - currentMinutes;

      let statusColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      if (minutesLeft <= 0) {
        statusColor = "bg-red-500/30 text-red-300 border-red-500/70 animate-pulse";
      } else if (minutesLeft <= 15) {
        statusColor = "bg-amber-500/30 text-amber-300 border-amber-500/60";
      }

      return {
        station: stationName,
        isOccupied: true,
        booking: activeBooking,
        upcomingBooking: null,
        minutesLeft,
        statusColor,
      };
    });
  }, [bookings, currentMinutes, todayStr]);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchesFilter = bookingFilter === "all" || b.status === bookingFilter;
      const matchesSearch =
        bookingSearch.trim() === "" ||
        b.customer_name.toLowerCase().includes(bookingSearch.toLowerCase()) ||
        b.phone.includes(bookingSearch) ||
        (b.station_rig && b.station_rig.toLowerCase().includes(bookingSearch.toLowerCase())) ||
        (b.notes && b.notes.toLowerCase().includes(bookingSearch.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [bookings, bookingFilter, bookingSearch]);

  // LOGIN SCREEN
  if (!authToken) {
    return (
      <main className="min-h-screen bg-[#050819] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#081348]/90 p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#FFB800] text-black shadow-lg shadow-amber-500/20">
              <Lock className="size-7" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-black uppercase text-white">
              Friendz Arena
            </h1>
            <p className="mt-1 font-display text-xs font-bold uppercase tracking-widest text-[#FFB800]">
              Admin Control Console
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-white">Username</Label>
              <Input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
                className="rounded-xl border-white/10 bg-[#050819] text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-white">Password</Label>
              <Input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                placeholder="Enter password"
                className="rounded-xl border-white/10 bg-[#050819] text-white"
              />
            </div>

            {loginError && <p className="text-xs font-bold text-red-400">{loginError}</p>}

            <button
              type="submit"
              disabled={authenticating}
              className="btn-chamfer w-full bg-[#FFB800] py-3 font-display text-xs font-black uppercase tracking-wider text-black shadow-lg disabled:opacity-50"
            >
              {authenticating ? "Verifying..." : "Login to Arena Console"}
            </button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-4 text-center">
            <Link to="/" className="text-xs text-muted-foreground hover:text-white transition-colors">
              ← Return to Lounge Homepage
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // MAIN ADMIN DASHBOARD
  return (
    <main className="min-h-screen bg-[#050819] text-foreground antialiased selection:bg-[#FFB800] selection:text-black pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050819]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="size-10 overflow-hidden rounded-full border border-cyan-400 bg-[#081348] p-1">
              <img src="/logo.png" alt="Logo" className="size-full rounded-full object-contain" />
            </div>
            <div>
              <span className="font-display text-base font-extrabold uppercase text-white">
                Friendz Arena
              </span>
              <span className="block text-[10px] font-bold text-[#FFB800] uppercase tracking-wider">
                Management Desk · {adminUser?.username}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-muted-foreground hover:text-white hover:border-cyan-400"
            >
              <Eye className="size-3.5" /> View Public Site
            </Link>

            <button
              type="button"
              onClick={refreshAll}
              className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground hover:text-white"
              title="Refresh All Data"
            >
              <RefreshCw className="size-4" />
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-900/60"
            >
              <LogOut className="size-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-8 pt-8">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("timers")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-display text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "timers"
                ? "bg-[#FFB800] text-black shadow-lg shadow-amber-500/20"
                : "border border-white/10 bg-white/5 text-muted-foreground hover:text-white"
            }`}
          >
            <Clock3 className="size-3.5" /> Live Station Timers
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("schedule");
              loadDaySchedule(scheduleDate);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-display text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "schedule"
                ? "bg-gradient-to-r from-[#FFB800] via-amber-400 to-[#23C8F3] text-black shadow-lg shadow-amber-500/20 font-black"
                : "border border-white/10 bg-white/5 text-muted-foreground hover:text-white"
            }`}
          >
            <Calendar className="size-3.5" /> Date & Slot Schedule
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("bookings")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-display text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "bookings"
                ? "bg-[#23C8F3] text-black shadow-lg shadow-cyan-500/20"
                : "border border-white/10 bg-white/5 text-muted-foreground hover:text-white"
            }`}
          >
            <Calendar className="size-3.5" /> Bookings ({bookings.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("offline")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-display text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "offline"
                ? "bg-[#10B981] text-black shadow-lg shadow-emerald-500/20"
                : "border border-white/10 bg-white/5 text-muted-foreground hover:text-white"
            }`}
          >
            <Plus className="size-3.5" /> + Walk-in / Offline
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("games")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-display text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "games"
                ? "bg-[#A855F7] text-white shadow-lg shadow-purple-500/20"
                : "border border-white/10 bg-white/5 text-muted-foreground hover:text-white"
            }`}
          >
            <Gamepad2 className="size-3.5" /> Games Library ({managedGames.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pricing")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-display text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "pricing"
                ? "bg-white text-black shadow-lg"
                : "border border-white/10 bg-white/5 text-muted-foreground hover:text-white"
            }`}
          >
            <DollarSign className="size-3.5" /> Hourly Rates
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("snacks")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-display text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "snacks"
                ? "bg-amber-400 text-black shadow-lg"
                : "border border-white/10 bg-white/5 text-muted-foreground hover:text-white"
            }`}
          >
            <Coffee className="size-3.5" /> Snacks & Combos ({snacksList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("passes")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-display text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "passes"
                ? "bg-cyan-400 text-black shadow-lg"
                : "border border-white/10 bg-white/5 text-muted-foreground hover:text-white"
            }`}
          >
            <QrCode className="size-3.5" /> Gamer Passes ({passesList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-display text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "analytics"
                ? "bg-blue-600 text-white shadow-lg"
                : "border border-white/10 bg-white/5 text-muted-foreground hover:text-white"
            }`}
          >
            <TrendingUp className="size-3.5" /> Revenue Analytics
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: LIVE STATION SESSION TIMERS & OVERSTAY ALERT (DESK DASHBOARD)      */}
        {/* ========================================================================= */}
        {activeTab === "timers" && (
          <div className="mt-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-black uppercase text-white">
                  Live PS5 Station Countdown Timers
                </h2>
                <p className="text-xs text-muted-foreground">
                  Real-time occupancy and active session remaining time across all 5 PS5 stations.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openQuickWalkIn("auto")}
                  className="btn-chamfer bg-emerald-500 hover:bg-emerald-400 px-3.5 py-1.5 font-display text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  <Plus className="size-3.5" /> + Quick Walk-in
                </button>
                <Link
                  to="/tv"
                  target="_blank"
                  className="rounded-xl border border-cyan-400/50 bg-cyan-950/40 px-3.5 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-400 hover:text-black transition-all flex items-center gap-1.5"
                >
                  <Eye className="size-3.5" /> Open TV Status Board
                </Link>
                <button
                  type="button"
                  onClick={() => setPrintQrModal(true)}
                  className="rounded-xl border border-white/20 bg-white/5 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-white/15 transition-all flex items-center gap-1.5"
                >
                  <QrCode className="size-3.5" /> Print Station QR Cards
                </button>
                <span className="rounded-full border border-white/15 bg-black/40 px-3.5 py-1 text-xs font-mono font-bold text-[#FFB800]">
                  {currentTimeStr || "10:00 AM"}
                </span>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {stationTimers.map((st, idx) => (
                <div
                  key={idx}
                  className={`rounded-3xl border p-6 shadow-2xl backdrop-blur-xl transition-all ${
                    st.isOccupied
                      ? st.minutesLeft <= 0
                        ? "border-red-500 bg-red-950/30"
                        : st.minutesLeft <= 15
                        ? "border-amber-500/70 bg-amber-950/30"
                        : "border-white/15 bg-[#081348]/80"
                      : "border-white/10 bg-[#081348]/40 opacity-80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Station #{idx + 1}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${st.statusColor}`}
                    >
                      {st.isOccupied
                        ? st.minutesLeft <= 0
                          ? "🚨 Overstay Alert"
                          : `${st.minutesLeft}m Left`
                        : st.upcomingBooking
                        ? `🟢 Free · Next @ ${st.upcomingBooking.visit_time}`
                        : "🟢 Rig Free"}
                    </span>
                  </div>

                  <h3 className="mt-3 font-display text-lg font-black text-white">{st.station}</h3>

                  {st.isOccupied && st.booking ? (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Player:</span>
                          <span className="font-bold text-white">{st.booking.customer_name}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-muted-foreground">Phone:</span>
                          <span className="font-bold text-cyan-300">{st.booking.phone}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-muted-foreground">Session:</span>
                          <span className="font-bold text-white">
                            {st.booking.visit_time} ({st.booking.duration_hours}h) · {st.booking.party_size}P
                          </span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-muted-foreground">Game:</span>
                          <span className="font-bold text-[#FFB800] truncate max-w-[150px]">
                            {st.booking.notes || "Open Game"}
                          </span>
                        </div>
                        {st.booking.snacks_ordered && (
                          <div className="flex justify-between mt-1 border-t border-white/10 pt-1 text-[11px]">
                            <span className="text-muted-foreground">Snacks:</span>
                            <span className="text-amber-300 truncate max-w-[140px]">
                              {st.booking.snacks_ordered}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Overstay Warning Banner */}
                      {st.minutesLeft <= 0 && (
                        <div className="flex items-center gap-2 rounded-xl bg-red-500/20 p-2.5 text-xs text-red-300 border border-red-500/40">
                          <AlertCircle className="size-4 shrink-0 text-red-400" />
                          <span>Session expired {Math.abs(st.minutesLeft)} mins ago! Prompt for extension or conclude.</span>
                        </div>
                      )}

                      {/* Quick Session Extensions & Actions */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleExtendSession(st.booking.id, 0.5, 50)}
                          className="rounded-xl border border-cyan-400/50 bg-cyan-950/50 py-2 text-center font-display text-xs font-bold text-cyan-300 hover:bg-cyan-900/60"
                        >
                          +30 Min (₹50)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExtendSession(st.booking.id, 1, 100)}
                          className="rounded-xl border border-amber-500/50 bg-amber-950/50 py-2 text-center font-display text-xs font-bold text-amber-300 hover:bg-amber-900/60"
                        >
                          +1 Hour (₹100)
                        </button>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setReceiptBooking(st.booking)}
                          className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2 font-display text-xs font-bold text-white hover:bg-white/10"
                        >
                          🧾 Bill / Receipt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.booking.id, "completed")}
                          className="rounded-xl bg-blue-600 px-3 py-2 font-display text-xs font-bold text-white hover:bg-blue-500"
                        >
                          Finish
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 text-center py-4 space-y-3">
                      {st.upcomingBooking ? (
                        <div className="rounded-2xl border border-amber-400/30 bg-amber-950/20 p-3 text-left text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-300">Upcoming Reservation Today</span>
                            <span className="rounded bg-amber-400/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                              {st.upcomingBooking.visit_time}
                            </span>
                          </div>
                          <p className="font-bold text-white">
                            {st.upcomingBooking.customer_name} ({st.upcomingBooking.party_size}P) · {st.upcomingBooking.duration_hours}h
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            Game: {st.upcomingBooking.notes || "Open Game"}
                          </p>
                          <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
                            <span className="text-[10px] text-emerald-400 font-bold">🟢 Free for Walk-ins Right Now</span>
                            <button
                              type="button"
                              onClick={() => handleCheckIn(st.upcomingBooking.id)}
                              className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-2.5 py-1 text-[10px] font-bold text-black cursor-pointer shadow-sm"
                            >
                              Check-In Early
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Rig is currently ready for walk-in players.</p>
                      )}
                      <button
                        type="button"
                        onClick={() => openQuickWalkIn(st.station)}
                        className="btn-chamfer bg-[#FFB800] px-4 py-2 font-display text-[11px] font-black uppercase text-black"
                      >
                        + Quick Walk-in
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Live Station Calls & Orders */}
            <div className="rounded-3xl border border-white/10 bg-[#081348]/70 p-6 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-black uppercase text-white flex items-center gap-2">
                    <Coffee className="size-4 text-[#FFB800]" /> Incoming Rig Service & Snack Orders
                    {stationOrders.filter((o) => o.status === "pending").length > 0 && (
                      <span className="rounded-full bg-red-500 text-white text-[10px] font-black px-2 py-0.5 animate-pulse">
                        {stationOrders.filter((o) => o.status === "pending").length} NEW
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground">Orders and calls dispatched directly from PS5 rigs.</p>
                </div>
                <button
                  type="button"
                  onClick={loadStationOrders}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-white flex items-center gap-1.5"
                >
                  <RefreshCw className="size-3.5" /> Refresh
                </button>
              </div>

              {stationOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-muted-foreground">
                  No active station calls. When players scan their rig QR code to order snacks or request controllers, they will appear here live.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {stationOrders.map((ord) => {
                    let items: any[] = [];
                    try {
                      items = JSON.parse(ord.items_json);
                    } catch {}
                    const isPending = ord.status === "pending";
                    return (
                      <div
                        key={ord.id}
                        className={`rounded-2xl border p-4 space-y-2.5 transition-all ${
                          isPending
                            ? "border-amber-400/60 bg-amber-950/20 shadow-lg"
                            : "border-white/10 bg-black/40 opacity-75"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display text-xs font-black uppercase text-[#FFB800]">
                            {ord.station_rig.split("·")[0]?.trim()}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase border ${
                              isPending
                                ? "bg-amber-400/20 text-amber-300 border-amber-400/40"
                                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            }`}
                          >
                            {ord.status}
                          </span>
                        </div>

                        <div className="text-xs">
                          <p className="font-bold text-white">
                            {ord.customer_name} · <span className="text-cyan-300 capitalize">{ord.service_type}</span>
                          </p>
                          <div className="mt-1 space-y-0.5 text-white/90 font-mono text-[11px]">
                            {items.map((it: any, i: number) => (
                              <div key={i} className="truncate">
                                • {it.name} {it.qty ? `(x${it.qty})` : ""} {it.detail ? `- ${it.detail}` : ""}
                              </div>
                            ))}
                          </div>
                          {ord.notes && <p className="mt-1 text-[10px] text-amber-300 italic">"{ord.notes}"</p>}
                        </div>

                        <div className="border-t border-white/10 pt-2 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-muted-foreground">Total: </span>
                            <span className="font-display font-black text-[#FFB800]">₹{ord.total_amount}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">
                              ({ord.payment_method.toUpperCase()})
                            </span>
                          </div>

                          {isPending ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateStationOrderStatus(ord.id, "delivered")}
                              className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-black hover:brightness-110 active:scale-95"
                            >
                              Mark Delivered ✓
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUpdateStationOrderStatus(ord.id, "dismissed")}
                              className="text-[10px] text-muted-foreground hover:text-white"
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: DATE & SLOT SCHEDULE MATRIX (PLAYO-STYLE VENUE DASHBOARD)            */}
        {/* ========================================================================= */}
        {activeTab === "schedule" && (
          <div className="mt-8 space-y-6">
            {/* Header & Date Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-3xl border border-white/10 bg-[#081348]/60 p-6 backdrop-blur-xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gradient-to-r from-[#FFB800] to-[#23C8F3] px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                    Playo-Style Manager
                  </span>
                  <span className="text-xs text-muted-foreground">5 Pro Stations · 10:00 AM – 11:00 PM</span>
                </div>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">
                  Date & Slot Schedule
                </h2>
                <p className="text-xs text-muted-foreground">
                  View online vs store vs WhatsApp occupancy for any date. Book walk-ins directly into free slots.
                </p>
              </div>

              {/* Date Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black/40 px-3 py-1.5">
                  <Calendar className="size-4 text-[#FFB800]" />
                  <span className="text-xs font-bold text-white">Selected Date:</span>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => {
                      const newD = e.target.value;
                      setScheduleDate(newD);
                      loadDaySchedule(newD);
                    }}
                    className="rounded-lg border border-white/20 bg-[#0E1538] px-2 py-1 text-xs text-white focus:outline-none focus:border-[#FFB800]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => loadDaySchedule(scheduleDate)}
                  disabled={loadingSchedule}
                  className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/15 px-3 py-2 text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`size-3.5 ${loadingSchedule ? "animate-spin text-[#FFB800]" : ""}`} />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openSlotBookingModal({
                      date: scheduleDate,
                      time: "16:00",
                      rig: "auto",
                      source: "offline",
                    })
                  }
                  className="btn-chamfer bg-emerald-500 hover:bg-emerald-400 px-3.5 py-2 font-display text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <Plus className="size-3.5" /> + Store Booking
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openSlotBookingModal({
                      date: scheduleDate,
                      time: "16:00",
                      rig: "auto",
                      source: "whatsapp",
                    })
                  }
                  className="btn-chamfer bg-[#23C8F3] hover:bg-cyan-300 px-3.5 py-2 font-display text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  <MessageCircle className="size-3.5" /> + WhatsApp Booking
                </button>
              </div>
            </div>

            {/* Quick 7-Day Switcher Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {(() => {
                const list = [];
                const now = new Date();
                const istOffset = 5.5 * 60;
                const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
                const istNow = new Date(utcTime + istOffset * 60000);

                for (let i = 0; i < 8; i++) {
                  const d = new Date(istNow);
                  d.setDate(istNow.getDate() + i);
                  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                  const dayName = i === 0 ? "TODAY" : i === 1 ? "TOMORROW" : d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
                  const dateNum = d.getDate();
                  const monthStr = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
                  list.push({ iso, dayName, dateNum, monthStr, isToday: i === 0 });
                }
                return list.map((opt) => {
                  const isSelected = scheduleDate === opt.iso;
                  return (
                    <button
                      key={opt.iso}
                      type="button"
                      onClick={() => {
                        setScheduleDate(opt.iso);
                        loadDaySchedule(opt.iso);
                      }}
                      className={`flex min-w-[85px] flex-col items-center rounded-2xl border px-3 py-2 text-center transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#FFB800] bg-gradient-to-b from-[#FFB800]/30 to-[#FFB800]/10 text-white shadow-lg shadow-amber-500/20 scale-[1.03] ring-2 ring-[#FFB800]"
                          : "border-white/10 bg-[#0E1538] text-white/70 hover:border-white/30 hover:text-white"
                      }`}
                    >
                      <span className={`text-[10px] font-bold tracking-wider ${isSelected ? "text-[#FFB800]" : "text-muted-foreground"}`}>
                        {opt.dayName}
                      </span>
                      <span className="font-display text-lg font-black text-white">{opt.dateNum}</span>
                      <span className="text-[10px] text-muted-foreground">{opt.monthStr}</span>
                    </button>
                  );
                });
              })()}
            </div>

            {/* Occupancy Summary Cards Breakdown for Selected Date */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {/* Total Bookings */}
              <div className="rounded-2xl border border-white/10 bg-[#0B1238] p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">TOTAL BOOKINGS</span>
                <p className="mt-1 font-display text-2xl font-black text-white">
                  {scheduleData?.metrics?.totalBookings ?? 0}
                </p>
                <span className="text-[11px] text-white/60">Scheduled for Date</span>
              </div>

              {/* Online Bookings (Cyan) */}
              <div className="rounded-2xl border border-cyan-500/40 bg-cyan-950/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">ONLINE BOOKINGS</span>
                  <span className="size-2 rounded-full bg-cyan-400" />
                </div>
                <p className="mt-1 font-display text-2xl font-black text-cyan-300">
                  {scheduleData?.metrics?.onlineBookings ?? 0}
                </p>
                <span className="text-[11px] text-cyan-200/70">From Website</span>
              </div>

              {/* Store Bookings (Emerald) */}
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">STORE WALK-IN</span>
                  <span className="size-2 rounded-full bg-emerald-400" />
                </div>
                <p className="mt-1 font-display text-2xl font-black text-emerald-300">
                  {scheduleData?.metrics?.storeBookings ?? 0}
                </p>
                <span className="text-[11px] text-emerald-200/70">Desk Bookings</span>
              </div>

              {/* WhatsApp Bookings (Amber) */}
              <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">WHATSAPP</span>
                  <span className="size-2 rounded-full bg-amber-400" />
                </div>
                <p className="mt-1 font-display text-2xl font-black text-amber-300">
                  {scheduleData?.metrics?.whatsappBookings ?? 0}
                </p>
                <span className="text-[11px] text-amber-200/70">Chat Reservations</span>
              </div>

              {/* Rig Hours Booked */}
              <div className="rounded-2xl border border-purple-500/40 bg-purple-950/20 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">HOURS OCCUPIED</span>
                <p className="mt-1 font-display text-2xl font-black text-purple-300">
                  {scheduleData?.metrics?.totalOccupiedRigHours ?? 0} <span className="text-xs font-normal text-muted-foreground">/ 65 hrs</span>
                </p>
                <span className="text-[11px] text-purple-200/70">
                  {scheduleData?.metrics?.capacityPercentage ?? 0}% Lounge Capacity
                </span>
              </div>

              {/* Available Capacity */}
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">AVAILABLE RIGS</span>
                <p className="mt-1 font-display text-2xl font-black text-emerald-400">
                  {scheduleData?.metrics?.totalAvailableRigHours ?? 0} <span className="text-xs font-normal text-muted-foreground">free hrs</span>
                </p>
                <span className="text-[11px] text-emerald-300">Ready for Walk-ins</span>
              </div>
            </div>

            {/* View Switcher & Filters Header */}
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="font-display text-lg font-black uppercase text-white flex items-center gap-2">
                  <span>Slot Schedule & Rig Occupancy</span>
                  <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 font-bold uppercase">
                    5 Stations
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  View booked vs available stations for {scheduleDate}. Instant walk-in and WhatsApp booking.
                </p>
              </div>

              {/* View Switcher & Source Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* 3 View Tabs */}
                <div className="inline-flex rounded-2xl border border-white/15 bg-black/60 p-1 backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => setScheduleViewMode("one-box")}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      scheduleViewMode === "one-box"
                        ? "bg-gradient-to-r from-[#FFB800] to-amber-400 text-black shadow-md font-black"
                        : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    <LayoutGrid className="size-3.5" />
                    One-Box Booked & Available
                  </button>

                  <button
                    type="button"
                    onClick={() => setScheduleViewMode("matrix-grid")}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      scheduleViewMode === "matrix-grid"
                        ? "bg-gradient-to-r from-[#23C8F3] to-cyan-400 text-black shadow-md font-black"
                        : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    <Table className="size-3.5" />
                    Timetable Grid Box
                  </button>

                  <button
                    type="button"
                    onClick={() => setScheduleViewMode("hourly-cards")}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      scheduleViewMode === "hourly-cards"
                        ? "bg-white text-black shadow-md font-black"
                        : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    <Layers className="size-3.5" />
                    Detailed Hourly Cards
                  </button>
                </div>

                {/* Source Filters */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: "all", label: "All Sources" },
                    { id: "online", label: `🌐 Online (${scheduleData?.metrics?.onlineBookings || 0})` },
                    { id: "store", label: `🏬 Store (${scheduleData?.metrics?.storeBookings || 0})` },
                    { id: "whatsapp", label: `💬 WhatsApp (${scheduleData?.metrics?.whatsappBookings || 0})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setScheduleFilter(f.id)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                        scheduleFilter === f.id
                          ? "bg-[#FFB800] text-black shadow"
                          : "border border-white/10 bg-white/5 text-muted-foreground hover:text-white"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Schedule View Container */}
            {loadingSchedule ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 rounded-3xl bg-white/5 border border-white/10" />
                ))}
              </div>
            ) : !scheduleData?.slots || scheduleData.slots.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center text-sm text-muted-foreground">
                No schedule data loaded for this date. Click refresh or choose another date.
              </div>
            ) : scheduleViewMode === "one-box" ? (
              /* ========================================================================= */
              /* VIEW 1: ONE-BOX BOOKED VS AVAILABLE VIEW                                  */
              /* ========================================================================= */
              <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-[#0B154D]/90 via-[#070D30]/90 to-[#03061A]/95 p-6 shadow-2xl backdrop-blur-2xl space-y-6">
                {/* Header inside this one box */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-white/10 pb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-gradient-to-r from-[#FFB800] to-[#23C8F3] px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                        One-Box Venue Console
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {scheduleDate} · Friendz Arena Jangareddygudem
                      </span>
                    </div>
                    <h3 className="mt-1.5 font-display text-xl font-black uppercase text-white">
                      Booked vs Available Stations
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Side-by-side occupancy breakdown. Click any hour to inspect or view all-day summary below.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-xs">
                      <span className="flex items-center gap-1.5 font-bold text-red-400">
                        <span className="size-2 rounded-full bg-red-400" />
                        {scheduleData?.metrics?.totalBookings || 0} Booked ({scheduleData?.metrics?.totalOccupiedRigHours || 0}h)
                      </span>
                      <span className="text-white/20">|</span>
                      <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                        <span className="size-2 rounded-full bg-emerald-400" />
                        {scheduleData?.metrics?.totalAvailableRigHours || 0}h Available
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        openSlotBookingModal({
                          date: scheduleDate,
                          time: oneBoxSelectedHour !== "all" ? oneBoxSelectedHour : "16:00",
                          rig: "auto",
                          source: "offline",
                        })
                      }
                      className="btn-chamfer bg-emerald-500 hover:bg-emerald-400 px-3 py-2 text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      <Plus className="size-3.5" /> + Store Walk-in
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openSlotBookingModal({
                          date: scheduleDate,
                          time: oneBoxSelectedHour !== "all" ? oneBoxSelectedHour : "16:00",
                          rig: "auto",
                          source: "whatsapp",
                        })
                      }
                      className="btn-chamfer bg-[#23C8F3] hover:bg-cyan-300 px-3 py-2 text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
                    >
                      <MessageCircle className="size-3.5" /> + WhatsApp
                    </button>
                  </div>
                </div>

                {/* Hour Scrubber Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Select Time Slot to Inspect (10:00 AM – 11:00 PM):
                    </span>
                    <span className="text-[11px] text-[#FFB800] font-semibold">
                      {oneBoxSelectedHour === "all" ? "Viewing All 13 Hours" : `Showing Slot: ${scheduleData.slots.find((s: any) => s.time === oneBoxSelectedHour)?.label || oneBoxSelectedHour}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    <button
                      type="button"
                      onClick={() => setOneBoxSelectedHour("all")}
                      className={`flex min-w-[100px] flex-col items-center rounded-2xl border px-3 py-2 text-center transition-all cursor-pointer ${
                        oneBoxSelectedHour === "all"
                          ? "border-[#FFB800] bg-gradient-to-b from-[#FFB800]/30 to-[#FFB800]/10 text-white shadow-lg shadow-amber-500/20 scale-[1.03] ring-2 ring-[#FFB800]"
                          : "border-white/10 bg-[#0E1538] text-white/70 hover:border-white/30 hover:text-white"
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider">All Day</span>
                      <span className="font-display text-sm font-black text-white">Full Board</span>
                      <span className="text-[10px] text-emerald-400 font-bold">13 Slots</span>
                    </button>

                    {scheduleData.slots.map((slot: any) => {
                      const isSelected = oneBoxSelectedHour === slot.time;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => setOneBoxSelectedHour(slot.time)}
                          className={`flex min-w-[95px] flex-col items-center rounded-2xl border px-3 py-2 text-center transition-all cursor-pointer ${
                            isSelected
                              ? "border-[#23C8F3] bg-gradient-to-b from-[#23C8F3]/30 to-[#23C8F3]/10 text-white shadow-lg shadow-cyan-500/20 scale-[1.03] ring-2 ring-[#23C8F3]"
                              : "border-white/10 bg-[#0E1538] text-white/70 hover:border-white/30 hover:text-white"
                          }`}
                        >
                          <span className="text-[10px] font-bold tracking-wider">{slot.label}</span>
                          <span
                            className={`mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold ${
                              slot.isFull
                                ? "text-red-400"
                                : slot.occupiedCount > 0
                                ? "text-amber-400"
                                : "text-emerald-400"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                slot.isFull
                                  ? "bg-red-400"
                                  : slot.occupiedCount > 0
                                  ? "bg-amber-400"
                                  : "bg-emerald-400"
                              }`}
                            />
                            {slot.isFull
                              ? "Full (5/5)"
                              : slot.occupiedCount > 0
                              ? `${slot.occupiedCount}B · ${slot.availableCount}F`
                              : "5 Free"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Content: Selected Single Hour Deep-Dive */}
                {oneBoxSelectedHour !== "all" ? (
                  (() => {
                    const currentSlot =
                      scheduleData.slots.find((s: any) => s.time === oneBoxSelectedHour) ||
                      scheduleData.slots[0];
                    const occupiedRigs = (currentSlot?.rigs || []).filter((r: any) => {
                      if (!r.isOccupied) return false;
                      if (scheduleFilter === "online") return r.source === "online";
                      if (scheduleFilter === "store") return r.source === "offline" || r.source === "store";
                      if (scheduleFilter === "whatsapp") return r.source === "whatsapp";
                      return true;
                    });
                    const freeRigs = (currentSlot?.rigs || []).filter((r: any) => !r.isOccupied);

                    const currentIndex = scheduleData.slots.findIndex((s: any) => s.time === currentSlot.time);
                    const prevSlot = currentIndex > 0 ? scheduleData.slots[currentIndex - 1] : null;
                    const nextSlot =
                      currentIndex < scheduleData.slots.length - 1 ? scheduleData.slots[currentIndex + 1] : null;

                    return (
                      <div className="space-y-4">
                        {/* Slot Navigation Bar */}
                        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-2.5">
                          <button
                            type="button"
                            disabled={!prevSlot}
                            onClick={() => prevSlot && setOneBoxSelectedHour(prevSlot.time)}
                            className="flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="size-4 text-[#FFB800]" />
                            {prevSlot ? `Prev (${prevSlot.label})` : "Start of Day"}
                          </button>

                          <div className="flex items-center gap-2">
                            <span className="font-display text-base font-black text-white">
                              {currentSlot.label}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                                currentSlot.isFull
                                  ? "bg-red-500/20 text-red-300 border-red-500/50"
                                  : currentSlot.occupiedCount > 0
                                  ? "bg-amber-400/20 text-amber-300 border-amber-400/50"
                                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                              }`}
                            >
                              {currentSlot.isFull
                                ? "🔴 Fully Booked (5/5)"
                                : currentSlot.occupiedCount > 0
                                ? `🟡 ${currentSlot.occupiedCount} Occupied · ${currentSlot.availableCount} Available`
                                : "🟢 All 5 Consoles Free"}
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={!nextSlot}
                            onClick={() => nextSlot && setOneBoxSelectedHour(nextSlot.time)}
                            className="flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                          >
                            {nextSlot ? `Next (${nextSlot.label})` : "End of Day"}
                            <ChevronRight className="size-4 text-[#FFB800]" />
                          </button>
                        </div>

                        {/* Side-by-side Split Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                          {/* Left: Booked Stations */}
                          <div className="rounded-2xl border border-red-500/20 bg-red-950/10 p-5 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between border-b border-red-500/20 pb-3">
                                <div className="flex items-center gap-2">
                                  <span className="size-2.5 rounded-full bg-red-400 animate-pulse" />
                                  <h4 className="font-display text-sm font-black uppercase text-red-300">
                                    Booked Consoles ({currentSlot.occupiedCount} / 5)
                                  </h4>
                                </div>
                                <span className="text-xs text-muted-foreground">{currentSlot.label}</span>
                              </div>

                              {occupiedRigs.length > 0 ? (
                                <div className="mt-4 space-y-3">
                                  {occupiedRigs.map((r: any) => (
                                    <div
                                      key={r.rig}
                                      className="rounded-xl border border-white/10 bg-black/50 p-4 space-y-2.5 hover:border-white/20 transition-all"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-display text-xs font-black uppercase text-white truncate max-w-[200px]">
                                          {r.rig}
                                        </span>
                                        <span
                                          className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                                            r.source === "online"
                                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                                              : r.source === "whatsapp"
                                              ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                                              : "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                          }`}
                                        >
                                          {r.source === "online"
                                            ? "🌐 Online Booking"
                                            : r.source === "whatsapp"
                                            ? "💬 WhatsApp"
                                            : "🏬 Store Walk-in"}
                                        </span>
                                      </div>

                                      <div className="flex flex-wrap items-center justify-between text-xs gap-1">
                                        <div>
                                          <p className="font-bold text-white">{r.customerName}</p>
                                          <p className="text-[11px] text-muted-foreground">{r.phone}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-cyan-300 font-semibold">
                                            {r.partySize}P · {r.durationHours}h ({r.bookedRange || currentSlot.time})
                                          </p>
                                          <span
                                            className={`inline-block text-[10px] font-bold uppercase rounded px-1.5 py-0.5 ${
                                              r.status === "confirmed"
                                                ? "bg-emerald-500/20 text-emerald-300"
                                                : "bg-amber-400/20 text-amber-300"
                                            }`}
                                          >
                                            {r.status}
                                          </span>
                                        </div>
                                      </div>

                                      {r.notes && (
                                        <p className="text-[11px] text-white/70 italic border-l-2 border-white/20 pl-2">
                                          Note: {r.notes}
                                        </p>
                                      )}

                                      <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                                        {r.status === "pending" && (
                                          <button
                                            type="button"
                                            onClick={() => handleStatusChange(r.bookingId, "confirmed", r.rig)}
                                            className="flex-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 py-1.5 text-xs font-bold text-black cursor-pointer text-center"
                                          >
                                            Confirm Booking
                                          </button>
                                        )}
                                        {scheduleData.isToday && r.status === "confirmed" && (
                                          <button
                                            type="button"
                                            onClick={() => handleCheckIn(r.bookingId)}
                                            className="flex-1 rounded-lg bg-cyan-400 hover:bg-cyan-300 py-1.5 text-xs font-bold text-black cursor-pointer text-center"
                                          >
                                            Check In (TV Live)
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleStatusChange(r.bookingId, "cancelled")}
                                          className="rounded-lg bg-red-950 hover:bg-red-900 border border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-300 cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                        {r.phone && (
                                          <a
                                            href={`https://wa.me/91${r.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                              `Hi ${r.customerName}, regarding your PS5 booking at Friendz Arena for ${r.rig} at ${currentSlot.label}...`
                                            )}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold text-emerald-300 flex items-center gap-1.5"
                                            title="Chat with Customer on WhatsApp"
                                          >
                                            <MessageCircle className="size-3.5" />
                                            Chat
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="my-8 text-center space-y-2 p-8 rounded-2xl border border-dashed border-white/10 bg-black/20">
                                  <span className="text-3xl">🎉</span>
                                  <p className="font-display text-sm font-bold text-white">No Booked Consoles</p>
                                  <p className="text-xs text-muted-foreground">
                                    All 5 stations are 100% available at {currentSlot.label}.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: Available Stations */}
                          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-5 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
                                <div className="flex items-center gap-2">
                                  <span className="size-2.5 rounded-full bg-emerald-400" />
                                  <h4 className="font-display text-sm font-black uppercase text-emerald-300">
                                    Available Consoles ({currentSlot.availableCount} / 5)
                                  </h4>
                                </div>
                                <span className="text-xs text-emerald-300/80 font-bold">
                                  Open for Walk-in / WhatsApp
                                </span>
                              </div>

                              {freeRigs.length > 0 ? (
                                <div className="mt-4 space-y-3">
                                  {freeRigs.map((r: any) => (
                                    <div
                                      key={r.rig}
                                      className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-400/60 transition-all"
                                    >
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-display text-xs font-black uppercase text-white">
                                            {r.rig}
                                          </span>
                                          <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-500/40">
                                            🟢 100% FREE
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-1">
                                          DualSense Edge · 4K 120Hz OLED · 90+ Games Installed
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openSlotBookingModal({
                                              date: scheduleDate,
                                              time: currentSlot.time,
                                              rig: r.rig,
                                              source: "offline",
                                            })
                                          }
                                          className="btn-chamfer bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-xs font-black text-black flex items-center gap-1 cursor-pointer shadow-md shadow-emerald-500/20"
                                        >
                                          <Plus className="size-3" /> + Store
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openSlotBookingModal({
                                              date: scheduleDate,
                                              time: currentSlot.time,
                                              rig: r.rig,
                                              source: "whatsapp",
                                            })
                                          }
                                          className="btn-chamfer bg-[#23C8F3] hover:bg-cyan-300 px-3 py-1.5 text-xs font-black text-black flex items-center gap-1 cursor-pointer shadow-md shadow-cyan-500/20"
                                        >
                                          <MessageCircle className="size-3" /> + WhatsApp
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="my-8 text-center space-y-2 p-8 rounded-2xl border border-dashed border-red-500/30 bg-red-950/20">
                                  <span className="text-3xl">🔴</span>
                                  <p className="font-display text-sm font-bold text-red-300">Slot Fully Booked</p>
                                  <p className="text-xs text-muted-foreground">
                                    All 5 consoles are occupied at {currentSlot.label}.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  /* Content: All 13 Hours Consolidated Master Table inside the Box */
                  <div className="space-y-6">
                    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/5 font-display text-[11px] font-black uppercase text-muted-foreground">
                            <th className="py-3 px-4">Time Slot</th>
                            <th className="py-3 px-4">Status & Occupancy</th>
                            <th className="py-3 px-4">🔴 Booked Consoles</th>
                            <th className="py-3 px-4">🟢 Available Consoles</th>
                            <th className="py-3 px-4 text-right">Quick Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {scheduleData.slots.map((s: any) => {
                            const occupied = s.rigs.filter((r: any) => r.isOccupied);
                            const available = s.rigs.filter((r: any) => !r.isOccupied);

                            return (
                              <tr
                                key={s.time}
                                className={`hover:bg-white/5 transition-colors ${
                                  s.isFull ? "bg-red-950/15" : s.occupiedCount > 0 ? "bg-amber-950/10" : ""
                                }`}
                              >
                                {/* Time Slot */}
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <span className="font-display text-xs font-black text-white">
                                      {s.label}
                                    </span>
                                    {s.isPast && (
                                      <span className="rounded bg-white/10 px-1.5 py-0.2 text-[9px] text-muted-foreground">
                                        Past
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Status */}
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                                      s.isFull
                                        ? "bg-red-500/20 text-red-300 border-red-500/50"
                                        : s.occupiedCount > 0
                                        ? "bg-amber-400/20 text-amber-300 border-amber-400/50"
                                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                                    }`}
                                  >
                                    <span
                                      className={`size-1.5 rounded-full ${
                                        s.isFull
                                          ? "bg-red-400"
                                          : s.occupiedCount > 0
                                          ? "bg-amber-400"
                                          : "bg-emerald-400"
                                      }`}
                                    />
                                    {s.isFull
                                      ? "🔴 Full (5/5)"
                                      : s.occupiedCount > 0
                                      ? `🟡 ${s.occupiedCount} Booked · ${s.availableCount} Free`
                                      : "🟢 All 5 Free"}
                                  </span>
                                </td>

                                {/* Booked Consoles */}
                                <td className="py-3.5 px-4">
                                  {occupied.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {occupied.map((r: any) => (
                                        <span
                                          key={r.rig}
                                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold border ${
                                            r.source === "online"
                                              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                                              : r.source === "whatsapp"
                                              ? "bg-amber-400/20 text-amber-300 border-amber-400/40"
                                              : "bg-purple-500/20 text-purple-300 border-purple-500/40"
                                          }`}
                                        >
                                          <span>{r.source === "online" ? "🌐" : r.source === "whatsapp" ? "💬" : "🏬"}</span>
                                          <span className="font-black">{r.rig.split("·")[0]?.trim()}:</span>
                                          <span>{r.customerName}</span>
                                          <span className="opacity-70">({r.partySize}P)</span>
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-emerald-400/80 font-medium">
                                      None booked (0/5)
                                    </span>
                                  )}
                                </td>

                                {/* Available Consoles */}
                                <td className="py-3.5 px-4">
                                  {available.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {available.map((r: any) => (
                                        <span
                                          key={r.rig}
                                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300"
                                        >
                                          🟢 {r.rig.split("·")[0]?.trim()}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-red-400 font-bold">
                                      0 Free (Full)
                                    </span>
                                  )}
                                </td>

                                {/* Fast Actions */}
                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setOneBoxSelectedHour(s.time)}
                                      className="rounded-lg border border-white/15 bg-white/5 hover:bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white transition-all cursor-pointer"
                                    >
                                      Inspect Hour
                                    </button>

                                    {available.length > 0 && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openSlotBookingModal({
                                              date: scheduleDate,
                                              time: s.time,
                                              rig: available[0]?.rig || "auto",
                                              source: "offline",
                                            })
                                          }
                                          className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-2 py-1 text-[10px] font-bold text-black cursor-pointer"
                                        >
                                          + Store
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openSlotBookingModal({
                                              date: scheduleDate,
                                              time: s.time,
                                              rig: available[0]?.rig || "auto",
                                              source: "whatsapp",
                                            })
                                          }
                                          className="rounded-lg bg-[#23C8F3] hover:bg-cyan-300 px-2 py-1 text-[10px] font-bold text-black cursor-pointer"
                                        >
                                          + WA
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : scheduleViewMode === "matrix-grid" ? (
              /* ========================================================================= */
              /* VIEW 2: FULL TIMETABLE GRID BOX (5 RIGS X 13 TIME SLOTS)                   */
              /* ========================================================================= */
              <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-[#0B154D]/90 via-[#070D30]/90 to-[#03061A]/95 p-6 shadow-2xl backdrop-blur-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="font-display text-base font-black uppercase text-white flex items-center gap-2">
                      <Table className="size-4 text-[#23C8F3]" />
                      <span>Station Timetable Matrix (5 Rigs × 13 Hourly Slots)</span>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Click any green cell to book instantly. Click any occupied cell to view customer & take action.
                    </p>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="flex items-center gap-1 font-bold text-emerald-400">
                      <span className="size-2 rounded-full bg-emerald-400" /> 🟢 Free (Click to Book)
                    </span>
                    <span className="flex items-center gap-1 font-bold text-cyan-300">
                      <span className="size-2 rounded-full bg-cyan-400" /> 🌐 Online
                    </span>
                    <span className="flex items-center gap-1 font-bold text-purple-300">
                      <span className="size-2 rounded-full bg-purple-400" /> 🏬 Store
                    </span>
                    <span className="flex items-center gap-1 font-bold text-amber-300">
                      <span className="size-2 rounded-full bg-amber-400" /> 💬 WhatsApp
                    </span>
                  </div>
                </div>

                {/* 2D Grid Table */}
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5 font-display text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        <th className="py-3 px-3.5 sticky left-0 z-20 bg-[#070D30] border-r border-white/10 min-w-[150px]">
                          Station Rig
                        </th>
                        {scheduleData.slots.map((s: any) => (
                          <th key={s.time} className="py-3 px-2 text-center min-w-[90px] whitespace-nowrap">
                            {s.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {PS5_STATIONS.map((stationName) => {
                        const shortRig = stationName.split("·")[0]?.trim();
                        const subRig = stationName.split("·")[1]?.trim();

                        return (
                          <tr key={stationName} className="hover:bg-white/[0.02]">
                            {/* Sticky Left Rig Label */}
                            <td className="py-3 px-3.5 sticky left-0 z-10 bg-[#070D30] border-r border-white/10 whitespace-nowrap">
                              <span className="font-display text-xs font-black text-white">{shortRig}</span>
                              <span className="block text-[10px] text-muted-foreground truncate max-w-[130px]">
                                {subRig}
                              </span>
                            </td>

                            {/* 13 Hourly Slot Cells */}
                            {scheduleData.slots.map((slot: any) => {
                              const rigSlot = slot.rigs.find((r: any) => r.rig === stationName);
                              const isOccupied = rigSlot?.isOccupied;

                              if (isOccupied) {
                                const src = rigSlot.source || "online";
                                return (
                                  <td key={slot.time} className="p-1.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelectedGridBooking({
                                          ...rigSlot,
                                          slotLabel: slot.label,
                                          slotTime: slot.time,
                                          date: scheduleDate,
                                        })
                                      }
                                      className={`w-full rounded-xl border p-2 text-center transition-all cursor-pointer ${
                                        src === "online"
                                          ? "border-cyan-500/50 bg-cyan-950/40 text-cyan-200 hover:border-cyan-400"
                                          : src === "whatsapp"
                                          ? "border-amber-500/50 bg-amber-950/40 text-amber-200 hover:border-amber-400"
                                          : "border-purple-500/50 bg-purple-950/40 text-purple-200 hover:border-purple-400"
                                      }`}
                                    >
                                      <span className="block text-[9px] font-black uppercase">
                                        {src === "online" ? "🌐 Online" : src === "whatsapp" ? "💬 WA" : "🏬 Store"}
                                      </span>
                                      <span className="block font-bold text-[11px] truncate text-white">
                                        {rigSlot.customerName}
                                      </span>
                                      <span className="block text-[9px] opacity-75">
                                        {rigSlot.partySize}P · {rigSlot.durationHours}h
                                      </span>
                                    </button>
                                  </td>
                                );
                              }

                              return (
                                <td key={slot.time} className="p-1.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openSlotBookingModal({
                                        date: scheduleDate,
                                        time: slot.time,
                                        rig: stationName,
                                        source: "offline",
                                      })
                                    }
                                    className="w-full rounded-xl border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-500/30 hover:border-emerald-400/80 p-2 text-center transition-all cursor-pointer group"
                                  >
                                    <span className="block text-[10px] font-black text-emerald-400 group-hover:scale-105 transition-transform">
                                      🟢 Free
                                    </span>
                                    <span className="block text-[9px] text-emerald-300/70">
                                      + Book
                                    </span>
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* ========================================================================= */
              /* VIEW 3: DETAILED HOURLY SLOTS CARDS (ORIGINAL EXPANDED LIST)              */
              /* ========================================================================= */
              <div className="space-y-4">
                {scheduleData.slots.map((slot: any) => {
                  return (
                    <div
                      key={slot.time}
                      className={`rounded-3xl border p-5 backdrop-blur-xl transition-all ${
                        slot.isFull
                          ? "border-red-500/30 bg-red-950/15"
                          : slot.occupiedCount > 0
                          ? "border-amber-500/30 bg-[#070D30]"
                          : "border-white/10 bg-[#070D30]/60"
                      }`}
                    >
                      {/* Slot Header Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-display text-base font-black text-white">
                            {slot.label}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                              slot.isFull
                                ? "bg-red-500/20 text-red-300 border-red-500/50"
                                : slot.occupiedCount > 0
                                ? "bg-amber-400/20 text-amber-300 border-amber-400/50"
                                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                            }`}
                          >
                            {slot.isFull
                              ? "🔴 Fully Booked (5/5)"
                              : slot.occupiedCount > 0
                              ? `🟡 ${slot.occupiedCount} Occupied · ${slot.availableCount} Available`
                              : `🟢 All 5 Rigs Free`}
                          </span>

                          {slot.isPast && (
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-muted-foreground font-mono">
                              Past Slot
                            </span>
                          )}
                        </div>

                        {/* Quick counts */}
                        <div className="flex items-center gap-3 text-xs">
                          {slot.onlineCount > 0 && (
                            <span className="flex items-center gap-1 font-bold text-cyan-300">
                              🌐 {slot.onlineCount} Online
                            </span>
                          )}
                          {slot.storeCount > 0 && (
                            <span className="flex items-center gap-1 font-bold text-emerald-400">
                              🏬 {slot.storeCount} Store
                            </span>
                          )}
                          {slot.whatsappCount > 0 && (
                            <span className="flex items-center gap-1 font-bold text-amber-400">
                              💬 {slot.whatsappCount} WhatsApp
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 5 Rigs Row / Cards Grid */}
                      <div className="mt-3.5 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                        {slot.rigs.map((r: any) => {
                          const isOccupied = r.isOccupied;
                          const matchesFilter =
                            scheduleFilter === "all" ||
                            (scheduleFilter === "online" && r.source === "online") ||
                            (scheduleFilter === "store" && (r.source === "offline" || r.source === "store")) ||
                            (scheduleFilter === "whatsapp" && r.source === "whatsapp") ||
                            (!isOccupied && scheduleFilter === "all");

                          if (!matchesFilter && isOccupied) {
                            return null;
                          }

                          return (
                            <div
                              key={r.rig}
                              className={`rounded-2xl border p-3.5 flex flex-col justify-between transition-all ${
                                isOccupied
                                  ? r.source === "online"
                                    ? "border-cyan-500/50 bg-cyan-950/30 text-white"
                                    : r.source === "whatsapp"
                                    ? "border-amber-500/50 bg-amber-950/30 text-white"
                                    : "border-purple-500/50 bg-purple-950/30 text-white"
                                  : "border-emerald-500/30 bg-emerald-950/15 text-white hover:border-emerald-400/60"
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between">
                                  <span className="font-display text-xs font-black uppercase text-white truncate max-w-[120px]">
                                    {r.rig.split("·")[0]?.trim()}
                                  </span>
                                  {isOccupied ? (
                                    <span
                                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                        r.source === "online"
                                          ? "bg-cyan-400/20 text-cyan-300"
                                          : r.source === "whatsapp"
                                          ? "bg-amber-400/20 text-amber-300"
                                          : "bg-purple-400/20 text-purple-300"
                                      }`}
                                    >
                                      {r.source === "online" ? "🌐 Online" : r.source === "whatsapp" ? "💬 WA" : "🏬 Store"}
                                    </span>
                                  ) : (
                                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">
                                      🟢 Free
                                    </span>
                                  )}
                                </div>

                                {isOccupied ? (
                                  <div className="mt-2 text-xs space-y-1">
                                    <p className="font-bold text-white truncate">{r.customerName}</p>
                                    <p className="text-[11px] text-muted-foreground truncate">{r.phone}</p>
                                    <p className="text-[11px] text-cyan-300 truncate">
                                      {r.notes || r.gameGenre || "PS5 Deluxe"} ({r.partySize}P · {r.durationHours}h)
                                    </p>
                                    <span
                                      className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                        r.status === "confirmed"
                                          ? "bg-emerald-500/20 text-emerald-400"
                                          : "bg-amber-400/20 text-amber-300"
                                      }`}
                                    >
                                      {r.status}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="mt-2 text-xs space-y-1">
                                    <p className="text-emerald-400 font-bold text-xs">Ready to Play</p>
                                    <p className="text-[11px] text-muted-foreground">90+ Games installed</p>
                                  </div>
                                )}
                              </div>

                              {/* Slot Card Actions */}
                              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-1.5">
                                {isOccupied ? (
                                  <div className="flex items-center gap-1 w-full">
                                    {r.status === "pending" && (
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(r.bookingId, "confirmed", r.rig)}
                                        className="flex-1 rounded bg-emerald-500 hover:bg-emerald-400 py-1 text-[10px] font-bold text-black text-center cursor-pointer"
                                      >
                                        Confirm
                                      </button>
                                    )}
                                    {scheduleData.isToday && r.status === "confirmed" && (
                                      <button
                                        type="button"
                                        onClick={() => handleCheckIn(r.bookingId)}
                                        className="flex-1 rounded bg-cyan-400 hover:bg-cyan-300 py-1 text-[10px] font-bold text-black text-center cursor-pointer"
                                      >
                                        Check In
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(r.bookingId, "cancelled")}
                                      className="rounded bg-red-950 hover:bg-red-900 border border-red-500/30 px-2 py-1 text-[10px] font-bold text-red-300 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 w-full">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openSlotBookingModal({
                                          date: scheduleDate,
                                          time: slot.time,
                                          rig: r.rig,
                                          source: "offline",
                                        })
                                      }
                                      className="flex-1 rounded bg-emerald-500/20 hover:bg-emerald-500 hover:text-black border border-emerald-500/40 py-1 text-[10px] font-bold text-emerald-300 text-center transition-all cursor-pointer"
                                    >
                                      + Store
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openSlotBookingModal({
                                          date: scheduleDate,
                                          time: slot.time,
                                          rig: r.rig,
                                          source: "whatsapp",
                                        })
                                      }
                                      className="flex-1 rounded bg-amber-400/20 hover:bg-amber-400 hover:text-black border border-amber-400/40 py-1 text-[10px] font-bold text-amber-300 text-center transition-all cursor-pointer"
                                    >
                                      + WhatsApp
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal: Selected Grid Booking Details */}
            {selectedGridBooking && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="w-full max-w-md rounded-3xl border border-white/20 bg-[#0E1538] p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFB800]">
                        Booking Details
                      </span>
                      <h4 className="font-display text-base font-black text-white">
                        {selectedGridBooking.rig}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedGridBooking(null)}
                      className="rounded-lg p-1 text-muted-foreground hover:bg-white/10 hover:text-white"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-muted-foreground">Date & Slot:</span>
                      <span className="font-bold text-white">
                        {selectedGridBooking.date} @ {selectedGridBooking.slotLabel} ({selectedGridBooking.durationHours}h)
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-muted-foreground">Player Name:</span>
                      <span className="font-bold text-white">{selectedGridBooking.customerName}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-muted-foreground">Phone Number:</span>
                      <span className="font-mono text-cyan-300">{selectedGridBooking.phone}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-muted-foreground">Booking Channel:</span>
                      <span className="font-bold uppercase text-amber-400">
                        {selectedGridBooking.source === "online"
                          ? "🌐 Online"
                          : selectedGridBooking.source === "whatsapp"
                          ? "💬 WhatsApp"
                          : "🏬 Store Walk-in"}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-muted-foreground">Status:</span>
                      <span
                        className={`font-bold uppercase px-2 py-0.5 rounded text-[10px] ${
                          selectedGridBooking.status === "confirmed"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-amber-400/20 text-amber-300"
                        }`}
                      >
                        {selectedGridBooking.status}
                      </span>
                    </div>

                    {selectedGridBooking.notes && (
                      <div className="py-1">
                        <span className="text-muted-foreground block text-[11px]">Notes:</span>
                        <p className="text-white italic">{selectedGridBooking.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
                    {selectedGridBooking.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => {
                          handleStatusChange(selectedGridBooking.bookingId, "confirmed", selectedGridBooking.rig);
                          setSelectedGridBooking(null);
                        }}
                        className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-2 text-xs font-bold text-black"
                      >
                        Confirm Booking
                      </button>
                    )}

                    {scheduleData.isToday && selectedGridBooking.status === "confirmed" && (
                      <button
                        type="button"
                        onClick={() => {
                          handleCheckIn(selectedGridBooking.bookingId);
                          setSelectedGridBooking(null);
                        }}
                        className="flex-1 rounded-xl bg-cyan-400 hover:bg-cyan-300 py-2 text-xs font-bold text-black"
                      >
                        Check In (TV Live)
                      </button>
                    )}

                    {selectedGridBooking.phone && (
                      <a
                        href={`https://wa.me/91${selectedGridBooking.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                          `Hi ${selectedGridBooking.customerName}, regarding your booking at Friendz Arena for ${selectedGridBooking.rig} at ${selectedGridBooking.slotLabel}...`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 px-3 py-2 text-xs font-bold text-emerald-300 flex items-center gap-1.5"
                      >
                        <MessageCircle className="size-3.5" />
                        Chat
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        handleStatusChange(selectedGridBooking.bookingId, "cancelled");
                        setSelectedGridBooking(null);
                      }}
                      className="rounded-xl bg-red-950 hover:bg-red-900 border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300"
                    >
                      Cancel Booking
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: BOOKINGS MANAGER & WHATSAPP CONFIRMATION                           */}
        {/* ========================================================================= */}
        {activeTab === "bookings" && (
          <div className="mt-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-black uppercase text-white">Bookings Queue</h2>
                <p className="text-xs text-muted-foreground">Confirm sessions, assign rigs, and send WhatsApp messages.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search name, phone, rig..."
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    className="h-9 w-60 rounded-xl border-white/10 bg-[#0E1538] pl-9 text-xs text-white"
                  />
                </div>

                <select
                  value={bookingFilter}
                  onChange={(e) => setBookingFilter(e.target.value)}
                  className="h-9 rounded-xl border border-white/10 bg-[#0E1538] px-3 text-xs text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white hover:bg-white/10"
                >
                  <Download className="size-3.5" /> CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-white/10 bg-[#081348]/60 backdrop-blur-xl">
              <table className="w-full text-left text-sm text-muted-foreground">
                <thead className="border-b border-white/10 bg-black/40 font-display text-[10px] font-black uppercase tracking-wider text-white">
                  <tr>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Slot</th>
                    <th className="px-5 py-4">Rig & Game</th>
                    <th className="px-5 py-4">Party & Bill</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-xs">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-4">
                        <p className="font-display font-bold text-white">{b.customer_name}</p>
                        <p className="text-muted-foreground">{b.phone}</p>
                        <span className="text-[10px] text-cyan-400 capitalize">{b.source}</span>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-display font-semibold text-white">{b.visit_date}</p>
                        <p className="text-cyan-300">{b.visit_time} ({b.duration_hours}h)</p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-block rounded-md border border-cyan-400/40 bg-cyan-950/40 px-2 py-0.5 font-display text-[10px] font-bold text-cyan-300">
                          {b.station_rig || "Unassigned Rig"}
                        </span>
                        <p className="text-white/90 truncate max-w-xs mt-1">
                          {b.notes || "Any game"}
                        </p>
                        {b.snacks_ordered && (
                          <p className="text-[10px] text-amber-300 truncate max-w-xs">
                            🍿 {b.snacks_ordered}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-bold text-white">{b.party_size} Players</p>
                        <p className="font-display font-black text-[#FFB800]">₹{b.estimated_total}</p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            b.status === "confirmed"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : b.status === "pending"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : b.status === "completed"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                              : "bg-red-500/20 text-red-300 border border-red-500/40"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Send WhatsApp Confirmation */}
                          <a
                            href={getWhatsAppConfirmUrl(b)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-950/50 px-2.5 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-900/60"
                            title="Send WhatsApp confirmation"
                          >
                            <MessageCircle className="size-3.5 fill-current" />
                            <span>WhatsApp</span>
                          </a>

                          {/* Digital Receipt */}
                          <button
                            type="button"
                            onClick={() => setReceiptBooking(b)}
                            className="rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 text-xs font-bold text-white hover:bg-white/10"
                            title="View / Send Receipt"
                          >
                            <Receipt className="size-3.5" />
                          </button>

                          {/* Status Actions */}
                          {b.status === "pending" && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleStatusChange(b.id, "confirmed", b.station_rig || "auto")}
                                className="rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-bold text-black hover:bg-emerald-400"
                                title="Confirm booking and verify rig availability"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAutoAssign(b.id)}
                                className="rounded-lg border border-cyan-400/40 bg-cyan-950/40 px-2.5 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-900/50"
                                title="Auto-Assign Next Available Rig"
                              >
                                ⚡ Auto-Assign
                              </button>
                            </div>
                          )}

                          {b.status === "confirmed" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(b.id, "completed")}
                              className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-blue-500"
                            >
                              Complete
                            </button>
                          )}

                          {b.status !== "cancelled" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(b.id, "cancelled")}
                              className="rounded-lg border border-red-500/30 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/20"
                              title="Cancel booking"
                            >
                              <X className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CREATE OFFLINE / WALK-IN / WHATSAPP BOOKING                        */}
        {/* ========================================================================= */}
        {activeTab === "offline" && (
          <div className="mt-8 max-w-3xl mx-auto rounded-3xl border border-white/10 bg-[#081348]/80 p-8 shadow-2xl backdrop-blur-xl">
            <h2 className="font-display text-xl font-black uppercase text-white">
              Create Offline / Walk-in / WhatsApp Booking
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Register customer at desk with instant station rig assignment and optional snack add-ons.
            </p>

            {offlineFormSuccess && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-xs text-emerald-200">
                <CheckCircle className="size-5 text-emerald-400 shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-white">Booking Saved to Rig!</p>
                  <p>Customer: {offlineFormSuccess.customer_name} · Rig: {offlineFormSuccess.station_rig}</p>
                  <a
                    href={getWhatsAppConfirmUrl(offlineFormSuccess)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1 font-bold text-black"
                  >
                    <MessageCircle className="size-3.5 fill-current" /> Send WhatsApp Confirmation
                  </a>
                </div>
              </div>
            )}

            {offlineFormError && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/50 bg-red-950/40 p-4 text-xs text-red-200">
                <AlertCircle className="size-5 text-red-400 shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-white">Rig Occupancy / Conflict Warning</p>
                  <p className="mt-1">{offlineFormError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateOfflineBooking} className="mt-6 space-y-4 text-xs">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-white">Customer Name</Label>
                  <Input name="customerName" required placeholder="e.g. Suresh Kumar" className="rounded-xl border-white/10 bg-[#050819] text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white">Phone Number</Label>
                  <Input name="phone" required placeholder="e.g. 9848012345" className="rounded-xl border-white/10 bg-[#050819] text-white" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-white">Station Rig</Label>
                  <select name="stationRig" defaultValue="auto" className="w-full h-10 rounded-xl border border-white/10 bg-[#050819] px-3 text-white">
                    <option value="auto">✨ Auto-Assign Next Available Rig (Recommended)</option>
                    {PS5_STATIONS.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white">Date</Label>
                  <Input name="visitDate" type="date" defaultValue={todayStr} required className="rounded-xl border-white/10 bg-[#050819] text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white">Start Time</Label>
                  <Input name="visitTime" type="time" defaultValue="16:00" required className="rounded-xl border-white/10 bg-[#050819] text-white" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-white">Players</Label>
                  <select name="partySize" defaultValue="1" className="w-full h-10 rounded-xl border border-white/10 bg-[#050819] px-3 text-white">
                    <option value="1">1 Player</option>
                    <option value="2">2 Players</option>
                    <option value="3">3 Players</option>
                    <option value="4">4 Players</option>
                    <option value="5">5 Players</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white">Duration</Label>
                  <select name="durationHours" defaultValue="1" className="w-full h-10 rounded-xl border border-white/10 bg-[#050819] px-3 text-white">
                    <option value="1">1 Hour</option>
                    <option value="2">2 Hours</option>
                    <option value="3">3 Hours</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white">Booking Source</Label>
                  <select name="source" defaultValue="offline" className="w-full h-10 rounded-xl border border-white/10 bg-[#050819] px-3 text-white">
                    <option value="offline">Walk-in Customer</option>
                    <option value="whatsapp">WhatsApp Request</option>
                    <option value="online">Phone Call</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-white">Game Title / Notes (e.g. GTA VI Day 1, EA FC 24)</Label>
                <Input name="notes" placeholder="e.g. EA FC 24 local derby, 2 DualSense controllers" className="rounded-xl border-white/10 bg-[#050819] text-white" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-white">Snacks & Beverages Ordered (Optional)</Label>
                <Input name="snacksOrdered" placeholder="e.g. 2x Red Bull, 1x Peri Peri Fries" className="rounded-xl border-white/10 bg-[#050819] text-white" />
              </div>

              <button
                type="submit"
                className="btn-chamfer w-full bg-[#FFB800] py-3.5 font-display text-xs font-black uppercase tracking-wider text-black shadow-lg"
              >
                Confirm & Lock Station
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: GAMES LIBRARY (EDIT EXISTING GAMES, COPIES COUNT, DELETE)          */}
        {/* ========================================================================= */}
        {activeTab === "games" && (
          <div className="mt-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-black uppercase text-white">
                  Managed Games Library & New Arrivals
                </h2>
                <p className="text-xs text-muted-foreground">
                  Modify existing games, edit GTA VI (2 physical discs) vs Deluxe Edition digital copies, and toggle new arrivals.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setNewGameModal(true)}
                className="btn-chamfer bg-[#FFB800] px-4 py-2 font-display text-xs font-black uppercase tracking-wider text-black"
              >
                + Add New Game
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {managedGames.map((g) => (
                <div
                  key={g.id}
                  className="rounded-3xl border border-white/10 bg-[#081348]/70 p-5 shadow-xl backdrop-blur-md flex flex-col justify-between"
                >
                  <div className="flex gap-4">
                    <img
                      src={g.cover}
                      alt={g.title}
                      className="size-20 rounded-xl object-cover shrink-0 border border-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-cyan-950/60 border border-cyan-400/40 px-2 py-0.5 text-[9px] font-bold text-cyan-300 uppercase">
                          {g.source === "disc" ? `💿 Disc (${g.copies_count || 2} Copies)` : `⚡ Deluxe (5 Rigs)`}
                        </span>
                        {g.is_new_arrival === 1 && (
                          <span className="rounded bg-fuchsia-950/60 border border-fuchsia-400/40 px-1.5 py-0.5 text-[9px] font-bold text-fuchsia-300">
                            New Arrival
                          </span>
                        )}
                      </div>
                      <h4 className="mt-2 font-display text-base font-bold text-white truncate">{g.title}</h4>
                      <p className="text-xs text-muted-foreground">{g.genre_label} · {g.players}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-white/80 line-clamp-2">{g.tagline}</p>

                  <div className="mt-4 border-t border-white/10 pt-3 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      Copies: <strong className="text-white">{g.copies_count || 5}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingGame(g)}
                        className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10"
                      >
                        <Edit className="size-3" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGame(g.id)}
                        className="rounded-lg border border-red-500/30 p-1.5 text-red-400 hover:bg-red-500/20"
                        title="Delete game"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: COSTS & HOURLY RATES MATRIX                                        */}
        {/* ========================================================================= */}
        {activeTab === "pricing" && (
          <div className="mt-8 max-w-4xl mx-auto rounded-3xl border border-white/10 bg-[#081348]/80 p-8 shadow-2xl backdrop-blur-xl">
            <h2 className="font-display text-xl font-black uppercase text-white">
              Hourly Session Pricing Configuration
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Modify rates per party size (1–5 players) and session length. Changes take effect across booking estimates immediately.
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 bg-black/40 font-display text-[10px] font-black uppercase text-white">
                  <tr>
                    <th className="px-5 py-3">Party Size</th>
                    <th className="px-5 py-3">1 Hour Rate</th>
                    <th className="px-5 py-3">2 Hours Rate</th>
                    <th className="px-5 py-3">3 Hours Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {GROUP_SIZES.map((size) => (
                    <tr key={size} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-4 font-bold text-white">
                        {size} {size === 1 ? "Player (Solo)" : "Players (Group)"}
                      </td>
                      {SESSION_DURATIONS.map((dur) => {
                        const current = pricingList.find((p) => p.party_size === size && p.duration_hours === dur)?.price || calculateSessionPrice(size, dur);
                        return (
                          <td key={dur} className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">₹</span>
                              <input
                                type="number"
                                defaultValue={current}
                                onBlur={(e) => {
                                  const val = Number(e.target.value);
                                  if (val > 0 && val !== current) {
                                    handleRateChange(size, dur, val);
                                  }
                                }}
                                className="w-20 rounded-lg border border-white/10 bg-[#050819] px-2 py-1 text-white font-display font-black text-sm"
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: SNACKS & COMBOS MENU MANAGER                                       */}
        {/* ========================================================================= */}
        {activeTab === "snacks" && (
          <div className="mt-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-black uppercase text-white flex items-center gap-2">
                  <Coffee className="size-5 text-[#FFB800]" /> Snacks, Beverages & Gaming Combos
                </h2>
                <p className="text-xs text-muted-foreground">
                  Add new items, modify prices, update combo descriptions, and manage stock.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSnackFormError("");
                  setNewSnackModal(true);
                }}
                className="btn-chamfer inline-flex items-center gap-2 bg-[#FFB800] px-5 py-2.5 font-display text-xs font-black uppercase text-black shadow-lg hover:brightness-110 active:scale-95"
              >
                <Plus className="size-4" /> + Add New Snack / Combo
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {snacksList.map((snk) => (
                <div
                  key={snk.id}
                  className="rounded-3xl border border-white/10 bg-[#081348]/70 p-5 shadow-xl backdrop-blur-md flex flex-col justify-between transition-all hover:border-white/25"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-amber-950/60 border border-amber-400/40 px-2 py-0.5 text-[9px] font-bold text-amber-300 uppercase">
                        {snk.category}
                      </span>
                      <span className="font-display text-xl font-black text-[#FFB800]">₹{snk.price}</span>
                    </div>

                    <h4 className="mt-3 font-display text-base font-bold text-white">{snk.name}</h4>
                    {snk.combo_description && (
                      <p className="mt-1 text-xs text-muted-foreground">{snk.combo_description}</p>
                    )}
                  </div>

                  <div className="mt-5 border-t border-white/10 pt-3 flex items-center justify-between text-xs">
                    <span
                      className={`font-bold ${
                        snk.is_available ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {snk.is_available ? "In Stock" : "Out of Stock"}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSnackFormError("");
                          setEditingSnack(snk);
                        }}
                        className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-2.5 py-1 text-xs font-bold text-white hover:bg-white/15"
                      >
                        <Edit className="size-3" /> Edit
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          await updateSnackFn({
                            data: {
                              token: authToken,
                              id: snk.id,
                              name: snk.name,
                              category: snk.category,
                              price: snk.price,
                              is_combo: Boolean(snk.is_combo),
                              combo_description: snk.combo_description,
                              is_available: !snk.is_available,
                            },
                          });
                          loadSnacks();
                        }}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-muted-foreground hover:text-white"
                        title="Toggle availability"
                      >
                        Stock
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSnack(snk.id, snk.name)}
                        className="rounded-lg border border-red-500/20 bg-red-500/10 p-1 text-red-400 hover:bg-red-500 hover:text-white"
                        title="Delete item"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: GAMER PASSES & DIGITAL LOYALTY                                     */}
        {/* ========================================================================= */}
        {activeTab === "passes" && (
          <div className="mt-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-black uppercase text-white flex items-center gap-2">
                  <Crown className="size-5 text-[#FFB800]" /> Arena Pro Gamer Passes & Loyalty Hours
                </h2>
                <p className="text-xs text-muted-foreground">Issue prepaid hour packs, check balances, and deduct hours during sessions.</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setNewPassCreated(null);
                  setNewPassError("");
                  setPassPreset("pro");
                  setPassTierHours(10);
                  setPassTierPrice(850);
                  setNewPassModal(true);
                }}
                className="btn-chamfer inline-flex items-center gap-2 bg-[#FFB800] px-5 py-2.5 font-display text-xs font-black uppercase text-black shadow-lg hover:brightness-110 active:scale-95 transition-all"
              >
                <Plus className="size-4" /> Issue New Gamer Pass
              </button>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-[#081348]/60 p-4 backdrop-blur-md">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Passes</span>
                <p className="mt-1 font-display text-2xl font-black text-white">{passStats.total}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#081348]/60 p-4 backdrop-blur-md">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Active Passes</span>
                <p className="mt-1 font-display text-2xl font-black text-emerald-400">{passStats.active}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#081348]/60 p-4 backdrop-blur-md">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Hours Loaded</span>
                <p className="mt-1 font-display text-2xl font-black text-cyan-300">{passStats.totalHours} hrs</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#081348]/60 p-4 backdrop-blur-md">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Passes Revenue</span>
                <p className="mt-1 font-display text-2xl font-black text-[#FFB800]">₹{passStats.totalRevenue}</p>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by gamer tag, name, phone, or ARENA code..."
                  value={passSearch}
                  onChange={(e) => setPassSearch(e.target.value)}
                  className="pl-9 rounded-xl border-white/10 bg-[#050819] text-white text-xs h-10"
                />
              </div>

              <div className="flex gap-2">
                {["all", "active", "exhausted"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setPassStatusFilter(st)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold uppercase transition-all ${
                      passStatusFilter === st
                        ? "bg-[#FFB800] text-black shadow-md"
                        : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Passes Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPasses.length === 0 ? (
                <div className="col-span-full rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
                  <Crown className="mx-auto size-10 text-muted-foreground/50" />
                  <p className="mt-3 font-display text-sm font-bold uppercase text-white">No Gamer Passes Found</p>
                  <p className="mt-1 text-xs text-muted-foreground">Click "+ Issue New Gamer Pass" above to register a player's prepaid hours.</p>
                </div>
              ) : (
                filteredPasses.map((pass) => {
                  const percentLeft = Math.round((pass.remaining_hours / pass.total_hours) * 100);
                  const isExhausted = pass.remaining_hours <= 0 || pass.status === "exhausted";
                  return (
                    <div
                      key={pass.id}
                      className="group relative overflow-hidden rounded-3xl border border-white/15 bg-[#081348]/80 p-5 shadow-xl backdrop-blur-md transition-all hover:border-[#FFB800]/50 hover:shadow-2xl"
                    >
                      {/* Top Bar: Pass Code & Status */}
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleCopyPassCode(pass.pass_code)}
                          title="Click to copy code"
                          className="flex items-center gap-1.5 font-mono text-xs font-black tracking-wider text-cyan-300 hover:text-[#FFB800] transition-colors"
                        >
                          {pass.pass_code}
                          {copiedPassCode === pass.pass_code ? (
                            <Check className="size-3 text-emerald-400" />
                          ) : (
                            <Copy className="size-3 opacity-60 group-hover:opacity-100" />
                          )}
                        </button>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${
                            isExhausted
                              ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                              : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          }`}
                        >
                          {isExhausted ? "EXHAUSTED" : pass.status}
                        </span>
                      </div>

                      {/* Gamer Info */}
                      <div className="mt-3">
                        <div className="flex items-center gap-2">
                          <Crown className="size-4 text-[#FFB800]" />
                          <h4 className="font-display text-base font-black text-white truncate">{pass.gamer_tag}</h4>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">
                          {pass.customer_name} · <span className="font-mono">{pass.phone}</span>
                        </p>
                      </div>

                      {/* Hours Meter & Progress Bar */}
                      <div className="mt-4 rounded-2xl bg-black/50 p-3.5 border border-white/5 space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] text-muted-foreground">Hours Balance</span>
                          <span className="font-display text-lg font-black text-[#FFB800]">
                            {pass.remaining_hours} <span className="text-xs text-muted-foreground">/ {pass.total_hours} hrs</span>
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full transition-all duration-500 ${
                              percentLeft > 40
                                ? "bg-gradient-to-r from-emerald-500 to-cyan-400"
                                : percentLeft > 15
                                ? "bg-amber-400"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${Math.max(0, Math.min(100, percentLeft))}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
                          <span>Paid: ₹{pass.price_paid}</span>
                          <span>{percentLeft}% remaining</span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="mt-4 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isExhausted}
                          onClick={() => {
                            setDeductModal(pass);
                            setDeductResult("");
                          }}
                          className={`flex-1 rounded-xl py-2 font-display text-xs font-black uppercase transition-all ${
                            isExhausted
                              ? "bg-white/5 text-muted-foreground cursor-not-allowed opacity-50"
                              : "bg-[#FFB800] text-black hover:brightness-110 active:scale-95"
                          }`}
                        >
                          Deduct
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setTopUpModal(pass);
                            setTopUpHours(10);
                            setTopUpPrice(850);
                            setTopUpPaymentMode("upi");
                            setTopUpCashTendered(850);
                            setTopUpResult(null);
                            setTopUpError("");
                          }}
                          title="Top Up Hours"
                          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-display text-xs font-black uppercase hover:bg-cyan-500 hover:text-black transition-all active:scale-95 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                        >
                          <Zap className="size-3.5" />
                          <span>Top-up</span>
                        </button>

                        <a
                          href={getWhatsAppPassUrl(pass)}
                          target="_blank"
                          rel="noreferrer"
                          title="Share Pass on WhatsApp"
                          className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black transition-all"
                        >
                          <MessageCircle className="size-4" />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleDeletePass(pass.id, pass.pass_code)}
                          title="Delete Pass"
                          className="flex size-9 items-center justify-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 9: REVENUE & RIG UTILIZATION ANALYTICS                                */}
        {/* ========================================================================= */}
        {activeTab === "analytics" && (
          <div className="mt-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-black uppercase text-white">
                  Business Performance & Rig Utilization
                </h2>
                <p className="text-xs text-muted-foreground">Daily earnings, total gaming hours logged, and station popularity.</p>
              </div>

              <button
                type="button"
                onClick={handleExportCsv}
                className="btn-chamfer inline-flex items-center gap-1.5 bg-[#FFB800] px-4 py-2 font-display text-xs font-black uppercase text-black"
              >
                <Download className="size-3.5" /> Export Bookings CSV
              </button>
            </div>

            {analyticsData && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-3xl border border-white/10 bg-[#081348]/70 p-6 backdrop-blur-xl">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Today's Revenue</span>
                  <p className="mt-2 font-display text-3xl font-black text-[#FFB800]">₹{analyticsData.todayRevenue}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-[#081348]/70 p-6 backdrop-blur-xl">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Revenue</span>
                  <p className="mt-2 font-display text-3xl font-black text-white">₹{analyticsData.totalRevenue}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-[#081348]/70 p-6 backdrop-blur-xl">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hours Logged</span>
                  <p className="mt-2 font-display text-3xl font-black text-cyan-300">{analyticsData.totalHours} hrs</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-[#081348]/70 p-6 backdrop-blur-xl">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Sessions</span>
                  <p className="mt-2 font-display text-3xl font-black text-emerald-400">{analyticsData.totalBookings}</p>
                </div>
              </div>
            )}

            {/* Station Rig Breakdown */}
            <div className="rounded-3xl border border-white/10 bg-[#081348]/60 p-6 backdrop-blur-xl">
              <h3 className="font-display text-base font-bold uppercase text-white mb-4">Rig Utilization Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5">PS5 Station Rig</th>
                      <th className="py-2.5">Total Sessions</th>
                      <th className="py-2.5">Total Generated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {(analyticsData?.rigStats || []).map((rg: any, i: number) => (
                      <tr key={i}>
                        <td className="py-3 font-bold text-white">{rg.rig}</td>
                        <td className="py-3 text-cyan-300">{rg.bookingsCount} sessions</td>
                        <td className="py-3 font-display font-black text-[#FFB800]">₹{rg.totalRevenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT EXISTING GAME MODAL (Modify Games & Copies Count)           */}
      {/* ========================================================================= */}
      {editingGame && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          onClick={() => setEditingGame(null)}
        >
          <div
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/20 bg-[#081348] p-6 sm:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="font-display text-[10px] font-black uppercase text-[#FFB800]">MODIFY GAME</span>
                <h3 className="font-display text-lg font-black uppercase text-white truncate max-w-xs">{editingGame.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingGame(null)}
                className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedGame} className="mt-6 space-y-4 text-xs">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-white">Title</Label>
                  <Input name="title" defaultValue={editingGame.title} required className="rounded-xl border-white/10 bg-[#050819] text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-white">Genre Key</Label>
                  <Input name="genre" defaultValue={editingGame.genre} required className="rounded-xl border-white/10 bg-[#050819] text-white" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-white">Genre Label</Label>
                  <Input name="genre_label" defaultValue={editingGame.genre_label} required className="rounded-xl border-white/10 bg-[#050819] text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-white">Players (e.g. 1-4 Players)</Label>
                  <Input name="players" defaultValue={editingGame.players} required className="rounded-xl border-white/10 bg-[#050819] text-white" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-white">Source Type</Label>
                  <select name="source" defaultValue={editingGame.source || "ps-plus"} className="w-full h-10 rounded-xl border border-white/10 bg-[#050819] px-3 text-white">
                    <option value="ps-plus">PlayStation Plus Deluxe (Digital)</option>
                    <option value="disc">Physical Game Disc</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-white">Copies Count (GTA VI = 2 Discs, Deluxe = 5)</Label>
                  <Input name="copies_count" type="number" min={1} max={5} defaultValue={editingGame.copies_count || 5} required className="rounded-xl border-white/10 bg-[#050819] text-white" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-white">Tagline</Label>
                <Input name="tagline" defaultValue={editingGame.tagline} required className="rounded-xl border-white/10 bg-[#050819] text-white" />
              </div>

              <div className="space-y-1">
                <Label className="text-white">Cover Image Path</Label>
                <Input name="cover" defaultValue={editingGame.cover} required className="rounded-xl border-white/10 bg-[#050819] text-white" />
              </div>

              <div className="space-y-1">
                <Label className="text-white">Badge (Optional, e.g. 🔥 Day 1 on PS5)</Label>
                <Input name="badge" defaultValue={editingGame.badge || ""} className="rounded-xl border-white/10 bg-[#050819] text-white" />
              </div>

              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input type="checkbox" name="is_new_arrival" defaultChecked={Boolean(editingGame.is_new_arrival)} className="size-4" />
                  <span>Mark as New Arrival</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input type="checkbox" name="is_featured" defaultChecked={Boolean(editingGame.is_featured)} className="size-4" />
                  <span>Featured Game</span>
                </label>
              </div>

              <div className="border-t border-white/10 pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingGame(null)}
                  className="rounded-xl border border-white/20 px-4 py-2 text-muted-foreground hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-chamfer bg-[#FFB800] px-6 py-2.5 font-display text-xs font-black uppercase text-black"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DIRECT SLOT BOOKING (STORE WALK-IN OR WHATSAPP FROM MATRIX)         */}
      {/* ========================================================================= */}
      {slotBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-3xl border border-amber-400/40 bg-[#081348] p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setSlotBookingModal(null)}
              className="absolute top-4 right-4 rounded-full border border-white/10 p-2 text-muted-foreground hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center gap-3">
              <div
                className={`flex size-10 items-center justify-center rounded-xl ${
                  slotBookingSource === "whatsapp"
                    ? "bg-amber-400/20 text-amber-400"
                    : "bg-emerald-400/20 text-emerald-400"
                }`}
              >
                {slotBookingSource === "whatsapp" ? (
                  <MessageCircle className="size-5" />
                ) : (
                  <Zap className="size-5" />
                )}
              </div>
              <div>
                <h3 className="font-display text-lg font-black uppercase text-white">
                  {slotBookingSource === "whatsapp" ? "Book via WhatsApp" : "Store / Walk-in Booking"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Reserving for {slotBookingDate || slotBookingModal.date} @ {slotBookingTime}
                </p>
              </div>
            </div>

            <form onSubmit={handleQuickSlotBookingSubmit} className="mt-5 space-y-4">
              {/* Interactive Booking Config: Date, Time, Console, Channel */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-white">Booking Date</Label>
                  <Input
                    type="date"
                    required
                    value={slotBookingDate}
                    onChange={(e) => setSlotBookingDate(e.target.value)}
                    className="rounded-xl border-white/10 bg-[#0E1538] text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-white">Time Slot</Label>
                  <select
                    value={slotBookingTime}
                    onChange={(e) => setSlotBookingTime(e.target.value)}
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#0E1538] px-3 text-xs text-white focus:outline-none"
                  >
                    {[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map((h) => {
                      const timeStr = `${String(h).padStart(2, "0")}:00`;
                      const label = `${h > 12 ? h - 12 : h === 0 ? 12 : h}:00 ${h >= 12 ? "PM" : "AM"}`;
                      return (
                        <option key={timeStr} value={timeStr}>
                          {label} ({timeStr})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-white">Assign Station Console</Label>
                  <select
                    value={slotBookingRig}
                    onChange={(e) => setSlotBookingRig(e.target.value)}
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#0E1538] px-3 text-xs text-white focus:outline-none"
                  >
                    <option value="auto">✨ Auto-Assign Next Available Rig for this Date & Time</option>
                    {PS5_STATIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-white">Booking Channel</Label>
                  <select
                    value={slotBookingSource}
                    onChange={(e) => setSlotBookingSource(e.target.value as "offline" | "whatsapp")}
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#0E1538] px-3 text-xs text-white focus:outline-none"
                  >
                    <option value="offline">🏬 Store Walk-in / Desk Booking</option>
                    <option value="whatsapp">💬 WhatsApp Request</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-white">Customer / Gamer Name</Label>
                <Input
                  required
                  placeholder={slotBookingModal.source === "whatsapp" ? "e.g. WhatsApp Gamer" : "e.g. Walk-in Player"}
                  value={slotBookingCustomer}
                  onChange={(e) => setSlotBookingCustomer(e.target.value)}
                  className="rounded-xl border-white/10 bg-[#0E1538] text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-white">Phone Number</Label>
                <Input
                  required
                  placeholder="e.g. 9848012345"
                  value={slotBookingPhone}
                  onChange={(e) => setSlotBookingPhone(e.target.value)}
                  className="rounded-xl border-white/10 bg-[#0E1538] text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-white">Squad Size</Label>
                  <select
                    value={slotBookingParty}
                    onChange={(e) => setSlotBookingParty(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-[#0E1538] px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} Player{n > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-white">Session Length</Label>
                  <select
                    value={slotBookingDuration}
                    onChange={(e) => setSlotBookingDuration(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-[#0E1538] px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    {[1, 2, 3].map((h) => (
                      <option key={h} value={h}>
                        {h} Hour{h > 1 ? "s" : ""} (₹{calculateSessionPrice(slotBookingParty as any, h as any)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-white">Game Title / Notes (Optional)</Label>
                <Input
                  placeholder="e.g. EA SPORTS FC 24, TEKKEN 8, GTA VI"
                  value={slotBookingNotes}
                  onChange={(e) => setSlotBookingNotes(e.target.value)}
                  className="rounded-xl border-white/10 bg-[#0E1538] text-white"
                />
              </div>

              {slotBookingError && (
                <p className="text-xs font-medium text-destructive">{slotBookingError}</p>
              )}

              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                <div>
                  <span className="text-[11px] text-muted-foreground">Session Total:</span>
                  <p className="font-display text-xl font-black text-emerald-400">
                    ₹{calculateSessionPrice(slotBookingParty as any, slotBookingDuration as any)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSlotBookingModal(null)}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/15 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={slotBookingSubmitting}
                    className="btn-chamfer bg-[#FFB800] px-5 py-2 font-display text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {slotBookingSubmitting ? "Confirming…" : "Confirm & Save"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 0: QUICK WALK-IN RIG LAUNCHER (AUTO-ASSIGN / TIME CONFLICT PROTECTED)*/}
      {/* ========================================================================= */}
      {quickWalkInRig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-3xl border border-amber-400/40 bg-[#081348] p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setQuickWalkInRig(null)}
              className="absolute top-4 right-4 rounded-full border border-white/10 p-2 text-muted-foreground hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-400/20 text-amber-400">
                <Zap className="size-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-black uppercase text-white">
                  Quick Walk-in Rig Launcher
                </h3>
                <p className="text-xs text-muted-foreground">
                  Lock station immediately for an in-person walk-in player with conflict protection.
                </p>
              </div>
            </div>

            {quickWalkInError && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-500/50 bg-red-950/60 p-3 text-xs text-red-200">
                <AlertCircle className="size-4 text-red-400 shrink-0 mt-0.5" />
                <span>{quickWalkInError}</span>
              </div>
            )}

            <form onSubmit={handleQuickWalkInSubmit} className="mt-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-white">Assigned Station Rig</Label>
                <select
                  value={quickWalkInRig}
                  onChange={(e) => setQuickWalkInRig(e.target.value)}
                  className="w-full h-10 rounded-xl border border-white/10 bg-[#050819] px-3 font-display text-xs text-white"
                >
                  <option value="auto">✨ Auto-Assign Next Available Rig (Recommended)</option>
                  {PS5_STATIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-white">Player / Tag Name</Label>
                  <Input
                    value={quickWalkInName}
                    onChange={(e) => setQuickWalkInName(e.target.value)}
                    required
                    placeholder="Walk-in Guest"
                    className="rounded-xl border-white/10 bg-[#050819] text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white">Start Time</Label>
                  <Input
                    type="time"
                    value={quickWalkInTime}
                    onChange={(e) => setQuickWalkInTime(e.target.value)}
                    required
                    className="rounded-xl border-white/10 bg-[#050819] text-white"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-white">Duration</Label>
                  <select
                    value={quickWalkInDur}
                    onChange={(e) => setQuickWalkInDur(Number(e.target.value))}
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#050819] px-3 text-white"
                  >
                    <option value="1">1 Hour (₹100)</option>
                    <option value="2">2 Hours (₹180)</option>
                    <option value="3">3 Hours (₹250)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white">Party Size</Label>
                  <select
                    value={quickWalkInParty}
                    onChange={(e) => setQuickWalkInParty(Number(e.target.value))}
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#050819] px-3 text-white"
                  >
                    <option value="1">1 Player (Solo)</option>
                    <option value="2">2 Players (Duo)</option>
                    <option value="3">3 Players (Trio)</option>
                    <option value="4">4 Players (Squad)</option>
                    <option value="5">5 Players</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-white">Game Title / Notes (Optional)</Label>
                <Input
                  value={quickWalkInNotes}
                  onChange={(e) => setQuickWalkInNotes(e.target.value)}
                  placeholder="e.g. EA FC 24, TEKKEN 8, GTA VI Disc"
                  className="rounded-xl border-white/10 bg-[#050819] text-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickWalkInRig(null)}
                  className="flex-1 rounded-xl border border-white/15 py-2.5 font-display text-xs font-bold uppercase text-white hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickWalkInSubmitting}
                  className="btn-chamfer flex-1 bg-[#FFB800] py-2.5 font-display text-xs font-black uppercase text-black"
                >
                  {quickWalkInSubmitting ? "Starting..." : "🚀 Start Match Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DIGITAL RECEIPT & WHATSAPP BILL INVOICE (UPI QR & CASH)          */}
      {/* ========================================================================= */}
      {receiptBooking && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          onClick={() => {
            setReceiptBooking(null);
            stopCamera();
            setPassScannerOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-white/20 bg-[#081348] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="font-display text-xs font-black uppercase text-[#FFB800]">
                  SESSION CHECKOUT & DIGITAL BILL
                </span>
                <p className="text-[10px] text-muted-foreground">Review session time, add food/snacks, or scan Gamer Pass</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReceiptBooking(null);
                  stopCamera();
                  setPassScannerOpen(false);
                }}
                className="flex size-7 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Gamer Pass Deduction Card / Scanner CTA */}
            {billAppliedPass ? (
              <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-950/30 p-3.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="size-4 text-emerald-400" />
                    <span className="font-display text-xs font-black uppercase text-emerald-300">
                      Gamer Pass Applied: {billAppliedPass.gamer_tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-white font-mono">
                    {billAppliedPass.pass_code} · {billAppliedPass.remaining_hours}h available
                  </p>
                  <p className="text-[10px] text-emerald-200">
                    🎮 Gaming fee WAIVED (₹0). <strong className="text-white">Only food/snack bill payable!</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBillAppliedPass(null);
                    setBillPassMsg("");
                  }}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500 hover:text-white"
                >
                  Remove Pass
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-3 flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ScanLine className="size-3.5 text-cyan-300" /> Has a Gamer Pass?
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Scan pass QR to deduct hours & collect <strong className="text-cyan-300">only food bill!</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPassScannerOpen(true);
                    startCamera();
                  }}
                  className="btn-chamfer bg-gradient-to-r from-cyan-400 to-[#FFB800] px-3.5 py-2 font-display text-[11px] font-black uppercase text-black hover:brightness-110 active:scale-95 shadow-md flex items-center gap-1.5 shrink-0"
                >
                  <Camera className="size-3.5" />
                  <span>Scan Pass QR</span>
                </button>
              </div>
            )}

            {/* Bill Receipt Body */}
            <div className="rounded-2xl border border-white/10 bg-black/50 p-4 font-mono text-xs text-white/90 space-y-3">
              <div className="text-center pb-2 border-b border-white/10 font-sans">
                <h4 className="font-display text-base font-black text-white">FRIENDZ ARENA</h4>
                <p className="text-[10px] text-muted-foreground">PS5 GAMING LOUNGE · JANGAREDDYGUDEM</p>
                <p className="text-[10px] text-cyan-300 font-mono">INV-{receiptBooking.id.slice(-6).toUpperCase()}</p>
              </div>

              {/* Customer & Rig Metadata */}
              <div className="space-y-1 text-[11px] font-sans">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-bold">{receiptBooking.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span>{receiptBooking.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rig & Time:</span>
                  <span className="text-cyan-300 font-bold">
                    {receiptBooking.station_rig || "Rig"} · {receiptBooking.visit_date} @ {receiptBooking.visit_time}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Game:</span>
                  <span className="text-[#FFB800] truncate max-w-[180px]">{receiptBooking.notes || "PlayStation 5"}</span>
                </div>
              </div>

              {/* SECTION: GAMING SESSION CHARGE */}
              <div className="border-t border-white/10 pt-2.5 font-sans space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1">
                    <Gamepad2 className="size-3.5 text-cyan-300" /> PS5 Session ({receiptBooking.duration_hours}h · {receiptBooking.party_size}P)
                  </span>
                  {billAppliedPass ? (
                    <div className="text-right">
                      <span className="text-[10px] line-through text-muted-foreground mr-1.5">
                        ₹{calculateSessionPrice(receiptBooking.party_size || 1, receiptBooking.duration_hours || 1)}
                      </span>
                      <span className="font-bold text-emerald-400">₹0 (PASS)</span>
                    </div>
                  ) : (
                    <span className="font-bold text-white">₹{billGamingFee}</span>
                  )}
                </div>
              </div>

              {/* SECTION: SNACKS & REFRESHMENTS */}
              <div className="border-t border-white/10 pt-2.5 font-sans space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white flex items-center gap-1">
                    <UtensilsCrossed className="size-3.5 text-[#FFB800]" /> Food & Snacks ({billSnackItems.length})
                  </span>
                  <span className="font-bold text-xs text-[#FFB800]">₹{billSnacksTotal}</span>
                </div>

                {/* Items List */}
                {billSnackItems.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {billSnackItems.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between bg-black/40 rounded-xl px-2.5 py-1.5 text-[11px] border border-white/5"
                      >
                        <div className="flex items-center gap-1.5 truncate mr-2">
                          <span className="text-white font-medium truncate">{item.name}</span>
                          <span className="text-muted-foreground text-[10px]">x{item.qty}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-amber-300">₹{item.price * item.qty}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setBillSnackItems((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="text-muted-foreground hover:text-red-400"
                            title="Remove item"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">No snacks ordered for this session.</p>
                )}

                {/* Add Snacks Dropdown / Quick Adder */}
                <div className="flex items-center gap-1.5 pt-1">
                  <select
                    value={billSelectedSnackId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setBillSelectedSnackId(id);
                      const found = snacksList.find((s) => s.id === id);
                      if (found) {
                        setBillSnackItems((prev) => [
                          ...prev,
                          {
                            id: `snack-${Date.now()}-${found.id}`,
                            name: found.name,
                            price: Number(found.price) || 0,
                            qty: 1,
                          },
                        ]);
                        setBillSelectedSnackId("");
                      }
                    }}
                    className="flex-1 h-7 rounded-lg border border-white/10 bg-[#050819] px-2 text-[11px] text-white"
                  >
                    <option value="">+ Add snack from menu...</option>
                    {snacksList.map((snk) => (
                      <option key={snk.id} value={snk.id}>
                        {snk.name} (₹{snk.price})
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1">
                    <Input
                      placeholder="Custom snack"
                      value={billCustomSnackName}
                      onChange={(e) => setBillCustomSnackName(e.target.value)}
                      className="h-7 w-24 bg-[#050819] border-white/10 text-[10px] text-white"
                    />
                    <Input
                      type="number"
                      placeholder="₹"
                      value={billCustomSnackPrice || ""}
                      onChange={(e) => setBillCustomSnackPrice(Number(e.target.value) || 0)}
                      className="h-7 w-14 bg-[#050819] border-white/10 text-[10px] text-white"
                    />
                    <button
                      type="button"
                      disabled={!billCustomSnackName || billCustomSnackPrice <= 0}
                      onClick={() => {
                        if (billCustomSnackName && billCustomSnackPrice > 0) {
                          setBillSnackItems((prev) => [
                            ...prev,
                            {
                              id: `custom-${Date.now()}`,
                              name: billCustomSnackName.trim(),
                              price: billCustomSnackPrice,
                              qty: 1,
                            },
                          ]);
                          setBillCustomSnackName("");
                          setBillCustomSnackPrice(0);
                        }
                      }}
                      className="h-7 px-2 rounded-lg bg-white/10 text-[10px] font-bold text-white hover:bg-white/20 disabled:opacity-30"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* TOTAL DUE ROW */}
              <div className="border-t-2 border-dashed border-white/20 pt-3 flex items-baseline justify-between font-sans">
                <div>
                  <span className="font-bold uppercase text-xs">
                    {billAppliedPass ? "Total Due (Food Only):" : "Final Total Due:"}
                  </span>
                  {billAppliedPass && (
                    <p className="text-[10px] text-emerald-400 font-bold">Gaming Covered by Gamer Pass</p>
                  )}
                </div>
                <span className="font-display text-2xl font-black text-[#FFB800]">
                  ₹{billFinalTotal}
                </span>
              </div>

              {/* PAYMENT MODE SELECTOR */}
              <div className="border-t border-white/10 pt-3 font-sans">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setBillPaymentMode("upi")}
                    className={`rounded-xl py-1.5 px-3 text-xs font-bold border transition-all text-center ${
                      billPaymentMode === "upi"
                        ? "border-cyan-400 bg-cyan-400/20 text-cyan-300 shadow-md"
                        : "border-white/10 bg-black/40 text-muted-foreground hover:text-white"
                    }`}
                  >
                    📱 UPI (Scan QR)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillPaymentMode("cash")}
                    className={`rounded-xl py-1.5 px-3 text-xs font-bold border transition-all text-center ${
                      billPaymentMode === "cash"
                        ? "border-[#FFB800] bg-[#FFB800]/20 text-[#FFB800] shadow-md"
                        : "border-white/10 bg-black/40 text-muted-foreground hover:text-white"
                    }`}
                  >
                    💵 Cash Payment
                  </button>
                </div>

                {/* UPI MODE */}
                {billPaymentMode === "upi" ? (
                  <div className="text-center space-y-2">
                    {billFinalTotal > 0 ? (
                      <>
                        <span className="text-[10px] uppercase font-bold text-cyan-300">
                          Scan to Pay ₹{billFinalTotal} with any UPI App
                        </span>
                        <div className="flex justify-center py-1">
                          {billUpiQrUrl ? (
                            <div className="rounded-xl bg-white p-2 shadow-lg">
                              <img src={billUpiQrUrl} alt="UPI Payment QR" className="size-36" />
                            </div>
                          ) : (
                            <div className="size-36 rounded-xl bg-white/10 flex items-center justify-center text-xs">
                              Generating QR...
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-1.5 font-mono text-[11px] text-white">
                          <span>friendzarena@upi</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof navigator !== "undefined" && navigator.clipboard) {
                                navigator.clipboard.writeText("friendzarena@upi");
                                setBillUpiCopied(true);
                                setTimeout(() => setBillUpiCopied(false), 2000);
                              }
                            }}
                            className="text-cyan-300 hover:text-white"
                            title="Copy UPI ID"
                          >
                            {billUpiCopied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/40 p-4 text-center space-y-1">
                        <CheckCircle className="size-8 text-emerald-400 mx-auto" />
                        <p className="font-display text-sm font-black text-white">₹0 Due — Pass Covered</p>
                        <p className="text-[11px] text-emerald-300">Session covered by pass and no snacks ordered.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* CASH MODE */
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground uppercase font-bold">
                        Cash Received from Customer (₹)
                      </Label>
                      <Input
                        type="number"
                        value={billCashTendered}
                        onChange={(e) => setBillCashTendered(Number(e.target.value) || 0)}
                        className="rounded-xl border-white/10 bg-[#050819] text-white text-sm font-bold"
                      />
                    </div>

                    {billCashTendered >= billFinalTotal ? (
                      <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/40 p-2.5 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-300">Change Due to Customer:</span>
                        <span className="font-display text-lg font-black text-emerald-400">
                          ₹{Math.max(0, billCashTendered - billFinalTotal)}
                        </span>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-red-950/40 border border-red-500/40 p-2 text-[11px] text-red-300 text-center">
                        Remaining due: ₹{billFinalTotal - billCashTendered}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* CHECKOUT COMPLETION & RECEIPT BUTTONS */}
            <div className="space-y-2 pt-1 font-sans">
              <button
                type="button"
                onClick={handleCheckoutComplete}
                className="btn-chamfer w-full bg-emerald-500 py-3 font-display text-xs font-black uppercase text-black hover:brightness-110 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-1.5"
              >
                <Check className="size-4 stroke-[3]" />
                <span>
                  {billAppliedPass
                    ? `Deduct Pass (${receiptBooking.duration_hours}h) & Complete Session`
                    : "Complete Session & Mark Paid"}
                </span>
              </button>

              <div className="flex gap-2">
                <a
                  href={getWhatsAppInvoiceUrl(receiptBooking)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2.5 text-center font-display text-xs font-black uppercase text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="size-4" /> Send Bill on WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl border border-white/20 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10"
                >
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2B: GAMER PASS QR SCANNER MODAL                                     */}
      {/* ========================================================================= */}
      {passScannerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          onClick={() => {
            setPassScannerOpen(false);
            stopCamera();
          }}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl border border-cyan-500/30 bg-[#081348] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-cyan-400 text-black">
                  <ScanLine className="size-4" />
                </span>
                <div>
                  <h3 className="font-display text-sm font-black uppercase text-white">Scan Gamer Pass QR</h3>
                  <p className="text-[10px] text-cyan-300">Point camera at customer's phone QR</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPassScannerOpen(false);
                  stopCamera();
                }}
                className="flex size-7 items-center justify-center rounded-full bg-white/10 text-white"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Video Viewfinder with targeting reticle */}
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black border border-cyan-500/30 flex items-center justify-center">
              <video
                ref={videoRef}
                className={`size-full object-cover ${scannerCameraActive ? "block" : "hidden"}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {!scannerCameraActive && (
                <div className="text-center p-4 space-y-2">
                  <Camera className="size-10 text-cyan-400 mx-auto opacity-70" />
                  <p className="text-xs text-white font-bold">Camera is paused</p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="btn-chamfer bg-cyan-400 px-4 py-2 font-display text-xs font-black uppercase text-black"
                  >
                    Start Camera
                  </button>
                </div>
              )}

              {/* Viewfinder Overlay Targeting Reticle */}
              {scannerCameraActive && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative size-44 border-2 border-cyan-400 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                    <div className="absolute top-0 left-0 size-4 border-t-4 border-l-4 border-[#FFB800]" />
                    <div className="absolute top-0 right-0 size-4 border-t-4 border-r-4 border-[#FFB800]" />
                    <div className="absolute bottom-0 left-0 size-4 border-b-4 border-l-4 border-[#FFB800]" />
                    <div className="absolute bottom-0 right-0 size-4 border-b-4 border-r-4 border-[#FFB800]" />
                    <div className="absolute inset-x-2 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
                  </div>
                </div>
              )}
            </div>

            {scannerCameraError && (
              <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5">
                {scannerCameraError}
              </p>
            )}

            {scannerError && (
              <p className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-2.5">
                {scannerError}
              </p>
            )}

            {/* Fallback 1: Upload QR image screenshot */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer text-cyan-300 hover:text-white font-bold">
                <Upload className="size-3.5" /> Upload QR Screenshot
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrImageUpload}
                  className="hidden"
                />
              </label>

              {scannerCameraActive && (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="text-muted-foreground hover:text-white text-[11px]"
                >
                  Turn Camera Off
                </button>
              )}
            </div>

            {/* Fallback 2: Manual Pass Code Entry */}
            <div className="border-t border-white/10 pt-3 space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                Or Type / Select Pass Code
              </Label>
              <div className="flex gap-1.5">
                <Input
                  placeholder="ARENA-XXXX-NNN or Gamer Tag"
                  value={scannerManualCode}
                  onChange={(e) => setScannerManualCode(e.target.value)}
                  className="h-8 bg-black/50 border-white/10 text-white font-mono text-xs"
                />
                <button
                  type="button"
                  disabled={!scannerManualCode.trim()}
                  onClick={() => applyGamerPass(scannerManualCode)}
                  className="h-8 px-3 rounded-xl bg-[#FFB800] text-black font-display text-xs font-black uppercase hover:brightness-110 disabled:opacity-40"
                >
                  Apply
                </button>
              </div>

              {/* Quick Pick from Active Passes */}
              {passesList.filter((p) => p.status === "active" && p.remaining_hours > 0).length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground">Active Passes Quick-Pick:</span>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {passesList
                      .filter((p) => p.status === "active" && p.remaining_hours > 0)
                      .slice(0, 6)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => applyGamerPass(p.pass_code)}
                          className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-cyan-300 hover:border-cyan-400 hover:bg-cyan-500/20"
                        >
                          {p.gamer_tag} ({p.remaining_hours}h)
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DEDUCT HOURS FROM GAMER PASS                                     */}
      {/* ========================================================================= */}
      {deductModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          onClick={() => setDeductModal(null)}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl border border-white/20 bg-[#081348] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="font-display text-xs font-black uppercase text-[#FFB800]">REDEEM GAMER PASS</span>
              <button
                type="button"
                onClick={() => setDeductModal(null)}
                className="flex size-7 items-center justify-center rounded-full bg-white/10 text-white"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <p className="font-bold text-white">{deductModal.gamer_tag} ({deductModal.customer_name})</p>
              <p className="text-cyan-300 font-mono">Pass Code: {deductModal.pass_code}</p>
              <p className="text-muted-foreground">Current Balance: <strong className="text-white">{deductModal.remaining_hours} hours</strong></p>
            </div>

            <div className="mt-4 space-y-2">
              <Label className="text-white text-xs">Hours to Deduct for This Session</Label>
              <select
                value={deductHours}
                onChange={(e) => setDeductHours(Number(e.target.value))}
                className="w-full h-10 rounded-xl border border-white/10 bg-[#050819] px-3 text-white text-xs"
              >
                <option value={1}>1 Hour</option>
                <option value={2}>2 Hours</option>
                <option value={3}>3 Hours</option>
              </select>
            </div>

            {deductResult && (
              <p className="mt-3 text-xs font-bold text-emerald-400">{deductResult}</p>
            )}

            <button
              type="button"
              onClick={async () => {
                if (!authToken) return;
                const res = await deductPassFn({
                  data: {
                    token: authToken,
                    passCode: deductModal.pass_code,
                    hoursToDeduct: deductHours,
                  },
                });
                if (res?.success) {
                  setDeductResult(res.message);
                  loadPasses();
                } else {
                  setDeductResult(res?.message || "Failed.");
                }
              }}
              className="btn-chamfer mt-5 w-full bg-[#FFB800] py-3 font-display text-xs font-black uppercase text-black"
            >
              Confirm Deduction
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3B: TOP UP HOURS ON GAMER PASS                                      */}
      {/* ========================================================================= */}
      {topUpModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          onClick={() => setTopUpModal(null)}
        >
          <div
            className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl border border-cyan-500/30 bg-[#081348] p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-cyan-400 text-black">
                  <Zap className="size-4" />
                </span>
                <div>
                  <h3 className="font-display text-sm font-black uppercase text-white">Top Up Gamer Pass</h3>
                  <p className="text-[10px] text-cyan-300">Recharge hours & reactivate pass</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTopUpModal(null)}
                className="flex size-7 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Pass Member Info */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">
                  {topUpModal.customer_name} <span className="text-[#FFB800]">({topUpModal.gamer_tag})</span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                    topUpModal.remaining_hours > 0
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                  }`}
                >
                  {topUpModal.remaining_hours > 0 ? "Active" : "Exhausted"}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground pt-1">
                <span>Pass Code: <strong className="text-cyan-300 font-mono">{topUpModal.pass_code}</strong></span>
                <span>Current Balance: <strong className="text-white">{topUpModal.remaining_hours} hrs</strong></span>
              </div>
            </div>

            {topUpResult ? (
              /* Success State */
              <div className="space-y-4 py-2">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-2">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <CheckCircle className="size-7" />
                  </div>
                  <h4 className="font-display text-base font-black uppercase text-white">Top-Up Successful!</h4>
                  <p className="text-xs text-emerald-300">
                    Added <strong>+{topUpResult.hours_added} Hours</strong> for <strong>₹{topUpResult.amount_paid || topUpPrice}</strong>
                  </p>
                  <p className="text-sm font-bold text-white">
                    New Balance: <span className="text-[#FFB800] font-black text-lg">{topUpResult.remaining_hours} Hours</span>
                  </p>
                </div>

                <div className="flex flex-col gap-2.5">
                  <a
                    href={getWhatsAppTopUpUrl(topUpResult)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-display text-xs font-black uppercase text-black hover:brightness-110 active:scale-95 transition-all shadow-lg"
                  >
                    <MessageCircle className="size-4" /> Send WhatsApp Confirmation
                  </a>
                  <button
                    type="button"
                    onClick={() => setTopUpModal(null)}
                    className="w-full rounded-xl border border-white/20 bg-white/5 py-2.5 font-display text-xs font-bold uppercase text-white hover:bg-white/10"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            ) : (
              /* Recharge Options Form */
              <div className="space-y-4">
                {/* Preset Options */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Select Top-Up Package</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTopUpHours(5);
                        setTopUpPrice(450);
                        setTopUpCashTendered(450);
                      }}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2.5 transition-all ${
                        topUpHours === 5 && topUpPrice === 450
                          ? "border-cyan-400 bg-cyan-500/20 shadow-md"
                          : "border-white/10 bg-black/40 hover:border-white/30"
                      }`}
                    >
                      <span className="font-display text-sm font-black text-white">+5 Hours</span>
                      <span className="text-[11px] font-bold text-[#FFB800]">₹450</span>
                      <span className="text-[9px] text-muted-foreground">₹90/hr</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTopUpHours(10);
                        setTopUpPrice(850);
                        setTopUpCashTendered(850);
                      }}
                      className={`relative flex flex-col items-center justify-center rounded-xl border p-2.5 transition-all ${
                        topUpHours === 10 && topUpPrice === 850
                          ? "border-cyan-400 bg-cyan-500/20 shadow-md ring-1 ring-cyan-400"
                          : "border-white/10 bg-black/40 hover:border-white/30"
                      }`}
                    >
                      <span className="absolute -top-2 rounded-full bg-[#FFB800] px-1.5 py-0.2 text-[8px] font-black uppercase text-black">
                        Popular
                      </span>
                      <span className="font-display text-sm font-black text-white">+10 Hours</span>
                      <span className="text-[11px] font-bold text-[#FFB800]">₹850</span>
                      <span className="text-[9px] text-muted-foreground">₹85/hr</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTopUpHours(20);
                        setTopUpPrice(1600);
                        setTopUpCashTendered(1600);
                      }}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2.5 transition-all ${
                        topUpHours === 20 && topUpPrice === 1600
                          ? "border-cyan-400 bg-cyan-500/20 shadow-md"
                          : "border-white/10 bg-black/40 hover:border-white/30"
                      }`}
                    >
                      <span className="font-display text-sm font-black text-white">+20 Hours</span>
                      <span className="text-[11px] font-bold text-[#FFB800]">₹1,600</span>
                      <span className="text-[9px] text-muted-foreground">₹80/hr</span>
                    </button>
                  </div>
                </div>

                {/* Custom Hours & Price Adjustment */}
                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Hours to Add</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={topUpHours}
                      onChange={(e) => {
                        const h = Math.max(1, Number(e.target.value) || 1);
                        setTopUpHours(h);
                        const p = h * 85;
                        setTopUpPrice(p);
                        setTopUpCashTendered(p);
                      }}
                      className="h-9 bg-black/50 border-white/10 text-white font-bold text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Amount to Charge (₹)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={topUpPrice}
                      onChange={(e) => {
                        const p = Math.max(0, Number(e.target.value) || 0);
                        setTopUpPrice(p);
                        setTopUpCashTendered(p);
                      }}
                      className="h-9 bg-black/50 border-white/10 text-[#FFB800] font-bold text-center"
                    />
                  </div>
                </div>

                {/* Payment Mode Selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Payment Method</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTopUpPaymentMode("upi")}
                      className={`flex items-center justify-center gap-2 rounded-xl border py-2 text-xs font-bold transition-all ${
                        topUpPaymentMode === "upi"
                          ? "border-[#FFB800] bg-[#FFB800]/15 text-[#FFB800]"
                          : "border-white/10 bg-black/30 text-muted-foreground hover:text-white"
                      }`}
                    >
                      <QrCode className="size-3.5" /> UPI QR Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setTopUpPaymentMode("cash")}
                      className={`flex items-center justify-center gap-2 rounded-xl border py-2 text-xs font-bold transition-all ${
                        topUpPaymentMode === "cash"
                          ? "border-[#FFB800] bg-[#FFB800]/15 text-[#FFB800]"
                          : "border-white/10 bg-black/30 text-muted-foreground hover:text-white"
                      }`}
                    >
                      <DollarSign className="size-3.5" /> Cash at Desk
                    </button>
                  </div>
                </div>

                {/* Payment Detail: UPI or Cash */}
                {topUpPaymentMode === "upi" ? (
                  <div className="flex items-center gap-4 rounded-2xl border border-cyan-500/20 bg-[#050819] p-3">
                    {topUpUpiQrUrl ? (
                      <img
                        src={topUpUpiQrUrl}
                        alt="Top-up UPI QR"
                        className="size-24 rounded-lg bg-white p-1 shrink-0"
                      />
                    ) : (
                      <div className="size-24 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                        <QrCode className="size-8 text-muted-foreground animate-pulse" />
                      </div>
                    )}
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-white">Scan to Pay with Any UPI App</p>
                      <p className="font-mono text-cyan-300 text-[11px]">friendzarena@upi</p>
                      <p className="text-[10px] text-muted-foreground">GPay · PhonePe · Paytm</p>
                      <p className="text-xs font-black text-[#FFB800]">Amount: ₹{topUpPrice}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-[#050819] p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Total Due:</span>
                      <span className="font-bold text-[#FFB800]">₹{topUpPrice}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-white shrink-0">Cash Tendered (₹):</Label>
                      <Input
                        type="number"
                        min={topUpPrice}
                        value={topUpCashTendered}
                        onChange={(e) => setTopUpCashTendered(Number(e.target.value) || 0)}
                        className="h-8 bg-black/50 border-white/10 text-white font-bold"
                      />
                    </div>
                    {topUpCashTendered >= topUpPrice && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                        <span className="text-muted-foreground">Change to Return:</span>
                        <span className="font-bold text-emerald-400">
                          ₹{Math.max(0, topUpCashTendered - topUpPrice)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {topUpError && (
                  <p className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-2.5">
                    {topUpError}
                  </p>
                )}

                {/* Submit Button */}
                <button
                  type="button"
                  disabled={topUpSubmitting}
                  onClick={handleTopUpSubmit}
                  className="btn-chamfer w-full bg-gradient-to-r from-cyan-400 to-[#FFB800] py-3 font-display text-xs font-black uppercase text-black hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shadow-lg"
                >
                  {topUpSubmitting
                    ? "Processing Top-Up..."
                    : `Confirm Top-Up (+${topUpHours} hrs · ₹${topUpPrice})`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ISSUE ARENA PRO GAMER PASS                                       */}
      {/* ========================================================================= */}
      {newPassModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          onClick={() => setNewPassModal(false)}
        >
          <div
            className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-white/20 bg-[#081348] p-6 sm:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="font-display text-[10px] font-black uppercase tracking-wider text-[#FFB800]">
                  DESK TICKETING · PREPAID MEMBERSHIP
                </span>
                <h3 className="font-display text-xl font-black uppercase text-white flex items-center gap-2">
                  <Crown className="size-5 text-[#FFB800]" /> Issue Arena Pro Gamer Pass
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNewPassModal(false)}
                className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X className="size-4" />
              </button>
            </div>

            {newPassCreated ? (
              <div className="mt-6 space-y-6">
                <div className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-950/40 p-6 text-center space-y-3">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500 text-black">
                    <Check className="size-8 stroke-[3]" />
                  </div>
                  <h4 className="font-display text-xl font-black uppercase text-white">Gamer Pass Created!</h4>
                  <p className="text-xs text-muted-foreground">Digital pass is generated and saved in the database.</p>

                  <div className="rounded-xl border border-white/15 bg-black/60 p-4 text-left font-mono text-xs space-y-2">
                    <div className="flex justify-between items-center pb-2 border-b border-white/10">
                      <span className="text-muted-foreground font-sans">Pass Code:</span>
                      <button
                        type="button"
                        onClick={() => handleCopyPassCode(newPassCreated.pass_code)}
                        className="flex items-center gap-1.5 text-base font-black text-[#FFB800] hover:text-white"
                      >
                        {newPassCreated.pass_code}
                        {copiedPassCode === newPassCreated.pass_code ? (
                          <Check className="size-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="size-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-sans">Gamer Tag:</span>
                      <span className="text-white font-bold">{newPassCreated.gamer_tag}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-sans">Player:</span>
                      <span className="text-white">{newPassCreated.customer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-sans">Hours Loaded:</span>
                      <span className="text-cyan-300 font-bold">{newPassCreated.total_hours} Hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-sans">Amount Paid:</span>
                      <span className="text-emerald-400 font-bold">₹{newPassCreated.price_paid}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={getWhatsAppPassUrl(newPassCreated)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-chamfer flex-1 bg-emerald-500 py-3 text-center font-display text-xs font-black uppercase text-black shadow-lg hover:brightness-110 flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="size-4" /> Send Pass to Player on WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setNewPassCreated(null);
                      setNewPassModal(false);
                    }}
                    className="rounded-xl border border-white/20 px-6 py-3 font-display text-xs font-bold uppercase text-white hover:bg-white/10"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleIssuePass} className="mt-6 space-y-5 text-xs">
                {newPassError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-red-300 flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0 text-red-400" />
                    <span>{newPassError}</span>
                  </div>
                )}

                {/* Tier Presets */}
                <div className="space-y-2">
                  <Label className="text-white font-bold text-xs">Choose Pass Package</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPassPreset("rookie");
                        setPassTierHours(5);
                        setPassTierPrice(450);
                      }}
                      className={`rounded-2xl p-3 text-left border transition-all ${
                        passPreset === "rookie"
                          ? "border-[#FFB800] bg-[#FFB800]/15 shadow-md"
                          : "border-white/10 bg-black/30 hover:border-white/30"
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">⚡ Rookie</span>
                      <p className="font-display text-base font-black text-white">5 Hours</p>
                      <p className="font-display text-xs font-bold text-[#FFB800]">₹450</p>
                      <span className="text-[9px] text-emerald-400">Save ₹50</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPassPreset("pro");
                        setPassTierHours(10);
                        setPassTierPrice(850);
                      }}
                      className={`rounded-2xl p-3 text-left border transition-all ${
                        passPreset === "pro"
                          ? "border-cyan-400 bg-cyan-400/15 shadow-md ring-1 ring-cyan-400"
                          : "border-white/10 bg-black/30 hover:border-white/30"
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold text-cyan-300">🔥 Pro Gamer</span>
                      <p className="font-display text-base font-black text-white">10 Hours</p>
                      <p className="font-display text-xs font-bold text-[#FFB800]">₹850</p>
                      <span className="text-[9px] text-emerald-400">Save ₹150</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPassPreset("elite");
                        setPassTierHours(20);
                        setPassTierPrice(1600);
                      }}
                      className={`rounded-2xl p-3 text-left border transition-all ${
                        passPreset === "elite"
                          ? "border-purple-400 bg-purple-400/15 shadow-md"
                          : "border-white/10 bg-black/30 hover:border-white/30"
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold text-purple-300">👑 Elite VIP</span>
                      <p className="font-display text-base font-black text-white">20 Hours</p>
                      <p className="font-display text-xs font-bold text-[#FFB800]">₹1,600</p>
                      <span className="text-[9px] text-emerald-400">Save ₹400</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPassPreset("custom");
                      }}
                      className={`rounded-2xl p-3 text-left border transition-all ${
                        passPreset === "custom"
                          ? "border-[#FFB800] bg-[#FFB800]/15 shadow-md"
                          : "border-white/10 bg-black/30 hover:border-white/30"
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">⚙️ Custom</span>
                      <p className="font-display text-base font-black text-white">Custom</p>
                      <p className="font-display text-xs font-bold text-muted-foreground">Any Hours</p>
                      <span className="text-[9px] text-muted-foreground">Flexible</span>
                    </button>
                  </div>
                </div>

                {/* Gamer details */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-white">Customer Full Name *</Label>
                    <Input
                      name="customer_name"
                      placeholder="e.g. Sriram Varma"
                      required
                      className="rounded-xl border-white/10 bg-[#050819] text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white">WhatsApp Phone *</Label>
                    <Input
                      name="phone"
                      placeholder="e.g. 9848012345"
                      required
                      className="rounded-xl border-white/10 bg-[#050819] text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white">Gamer Tag / Handle *</Label>
                  <Input
                    name="gamer_tag"
                    placeholder="e.g. Kratos_Warrior or Striker99"
                    required
                    className="rounded-xl border-white/10 bg-[#050819] text-white font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">The gamer will use this tag to identify themselves at the desk.</p>
                </div>

                {/* Hours & Price inputs */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-white">Total Hours to Load</Label>
                    <Input
                      type="number"
                      name="total_hours"
                      min={1}
                      max={100}
                      value={passTierHours}
                      onChange={(e) => setPassTierHours(Number(e.target.value))}
                      required
                      className="rounded-xl border-white/10 bg-[#050819] text-white font-display font-bold text-base"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white">Amount Collected (₹)</Label>
                    <Input
                      type="number"
                      name="price_paid"
                      min={0}
                      value={passTierPrice}
                      onChange={(e) => setPassTierPrice(Number(e.target.value))}
                      required
                      className="rounded-xl border-white/10 bg-[#050819] text-[#FFB800] font-display font-bold text-base"
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-black/40 border border-white/5 p-3 text-[11px] text-muted-foreground">
                  💡 <strong className="text-white">How it works:</strong> System assigns a unique <span className="text-cyan-300 font-mono">ARENA-XXXX-NNN</span> code. Hours are deducted in 1h, 2h, or 3h increments on future visits.
                </div>

                <div className="border-t border-white/10 pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setNewPassModal(false)}
                    className="rounded-xl border border-white/20 px-5 py-2.5 text-xs text-muted-foreground hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-chamfer bg-[#FFB800] px-6 py-2.5 font-display text-xs font-black uppercase text-black hover:brightness-110 active:scale-95"
                  >
                    Generate & Issue Pass
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: ADD NEW SNACK / COMBO                                            */}
      {/* ========================================================================= */}
      {newSnackModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          onClick={() => setNewSnackModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl border border-white/20 bg-[#081348] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="font-display text-xs font-black uppercase text-[#FFB800] flex items-center gap-1.5">
                <Coffee className="size-4" /> Add Menu Item / Combo
              </span>
              <button
                type="button"
                onClick={() => setNewSnackModal(false)}
                className="flex size-7 items-center justify-center rounded-full bg-white/10 text-white"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {snackFormError && (
              <p className="mt-3 text-xs font-bold text-red-400">{snackFormError}</p>
            )}

            <form onSubmit={handleSaveNewSnack} className="mt-4 space-y-4 text-xs">
              <div className="space-y-1">
                <Label className="text-white">Item Name *</Label>
                <Input
                  name="name"
                  required
                  placeholder="e.g. Red Bull Energy 250ml or Peri Peri Fries"
                  className="rounded-xl border-white/10 bg-[#050819] text-white"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-white">Category</Label>
                  <select
                    name="category"
                    defaultValue="Beverage"
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#050819] px-3 text-white text-xs"
                  >
                    <option value="Beverage">Beverage / Cold Drink</option>
                    <option value="Snacks">Crunchies / Fries</option>
                    <option value="Combos">Combos & Platters</option>
                    <option value="Hot Food">Hot Food / Maggi</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-white">Price (₹) *</Label>
                  <Input
                    name="price"
                    type="number"
                    min={10}
                    defaultValue={120}
                    required
                    className="rounded-xl border-white/10 bg-[#050819] text-[#FFB800] font-display font-bold text-base"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-white">Combo Description / Details (Optional)</Label>
                <Input
                  name="combo_description"
                  placeholder="e.g. 1x Red Bull + 1x Nachos Supreme (Save ₹20)"
                  className="rounded-xl border-white/10 bg-[#050819] text-white"
                />
              </div>

              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input type="checkbox" name="is_combo" className="size-4" />
                  <span>Is Gaming Combo Pack</span>
                </label>
              </div>

              <div className="border-t border-white/10 pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setNewSnackModal(false)}
                  className="rounded-xl border border-white/20 px-4 py-2 text-muted-foreground hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-chamfer bg-[#FFB800] px-6 py-2.5 font-display text-xs font-black uppercase text-black"
                >
                  Add Item to Menu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: EDIT / MODIFY SNACK & PRICE                                      */}
      {/* ========================================================================= */}
      {editingSnack && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          onClick={() => setEditingSnack(null)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl border border-white/20 bg-[#081348] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="font-display text-[10px] font-black uppercase text-[#FFB800]">MODIFY ITEM</span>
                <h3 className="font-display text-base font-black uppercase text-white truncate max-w-xs">
                  {editingSnack.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSnack(null)}
                className="flex size-7 items-center justify-center rounded-full bg-white/10 text-white"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {snackFormError && (
              <p className="mt-3 text-xs font-bold text-red-400">{snackFormError}</p>
            )}

            <form onSubmit={handleSaveEditedSnack} className="mt-4 space-y-4 text-xs">
              <div className="space-y-1">
                <Label className="text-white">Item Name</Label>
                <Input
                  name="name"
                  defaultValue={editingSnack.name}
                  required
                  className="rounded-xl border-white/10 bg-[#050819] text-white"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-white">Category</Label>
                  <select
                    name="category"
                    defaultValue={editingSnack.category}
                    className="w-full h-10 rounded-xl border border-white/10 bg-[#050819] px-3 text-white text-xs"
                  >
                    <option value="Beverage">Beverage / Cold Drink</option>
                    <option value="Snacks">Crunchies / Fries</option>
                    <option value="Combos">Combos & Platters</option>
                    <option value="Hot Food">Hot Food / Maggi</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-white">Price (₹)</Label>
                  <Input
                    name="price"
                    type="number"
                    min={10}
                    defaultValue={editingSnack.price}
                    required
                    className="rounded-xl border-white/10 bg-[#050819] text-[#FFB800] font-display font-bold text-base"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-white">Combo Description / Details</Label>
                <Input
                  name="combo_description"
                  defaultValue={editingSnack.combo_description || ""}
                  className="rounded-xl border-white/10 bg-[#050819] text-white"
                />
              </div>

              <div className="flex gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input
                    type="checkbox"
                    name="is_combo"
                    defaultChecked={Boolean(editingSnack.is_combo)}
                    className="size-4"
                  />
                  <span>Is Gaming Combo Pack</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input
                    type="checkbox"
                    name="is_available"
                    defaultChecked={Boolean(editingSnack.is_available)}
                    className="size-4"
                  />
                  <span>In Stock</span>
                </label>
              </div>

              <div className="border-t border-white/10 pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingSnack(null)}
                  className="rounded-xl border border-white/20 px-4 py-2 text-muted-foreground hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-chamfer bg-[#FFB800] px-6 py-2.5 font-display text-xs font-black uppercase text-black"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: PRINTABLE PS5 RIG QR STAND CARDS (RIG 01 - RIG 05)                */}
      {/* ========================================================================= */}
      {printQrModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          onClick={() => setPrintQrModal(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border border-white/20 bg-[#081348] p-6 sm:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="font-display text-[10px] font-black uppercase text-[#FFB800]">
                  DESK & STATION HARDWARE
                </span>
                <h3 className="font-display text-xl font-black uppercase text-white flex items-center gap-2">
                  <QrCode className="size-5 text-cyan-300" /> Printable PS5 Station QR Stand Cards
                </h3>
                <p className="text-xs text-muted-foreground">
                  Print and place these tent cards on each of the 5 PS5 stations. Players scan with their phone to order food & call desk.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn-chamfer bg-[#FFB800] px-5 py-2 font-display text-xs font-black uppercase text-black shadow-lg"
                >
                  Print All Cards
                </button>
                <button
                  type="button"
                  onClick={() => setPrintQrModal(false)}
                  className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Public Domain for Rig QR Codes */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-black/40 border border-white/10 p-3.5 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-white uppercase text-[10px] tracking-wider text-cyan-300">
                  Station Public Domain (Ngrok / Live URL):
                </span>
                <p className="text-muted-foreground text-[11px]">
                  Scanned by players on their smartphones to open in-station snack & service menu.
                </p>
              </div>
              <div className="max-w-md w-full">
                <Input
                  value={publicDomain}
                  onChange={(e) => setPublicDomain(e.target.value)}
                  placeholder="https://trickier-bewilderingly-edda.ngrok-free.dev"
                  className="h-8 bg-black/60 border-cyan-500/30 text-cyan-300 font-mono text-xs"
                />
              </div>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {PS5_STATIONS.map((rig) => {
                const qrUrl = rigQrs[rig];
                const rigCode = rig.split("·")[0].trim();
                const rigName = rig.split("·")[1]?.trim();
                return (
                  <div
                    key={rig}
                    className="rounded-3xl border-2 border-white/20 bg-gradient-to-b from-[#0e174d] to-[#040614] p-6 text-center space-y-3 shadow-xl"
                  >
                    <span className="font-display text-[10px] font-black tracking-widest text-[#FFB800] uppercase">
                      FRIENDZ ARENA PS5
                    </span>
                    <h4 className="font-display text-xl font-black uppercase text-white">{rigCode}</h4>
                    <p className="text-xs text-cyan-300 font-bold">{rigName}</p>

                    <div className="flex justify-center py-2">
                      <div className="rounded-2xl bg-white p-3 shadow-xl">
                        {qrUrl ? (
                          <img src={qrUrl} alt={rig} className="size-36" />
                        ) : (
                          <div className="size-36 flex items-center justify-center text-xs text-black">
                            Generating...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="font-display text-xs font-black uppercase text-white">
                        SCAN TO ORDER GAMER FUEL
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Order drinks & snacks · Request controllers · Add session time
                      </p>
                    </div>

                    <div className="border-t border-white/10 pt-2 text-[9px] font-mono text-muted-foreground">
                      friendzarena.in/station?rig={rigCode}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
