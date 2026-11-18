import { useState, useEffect, useMemo, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "qrcode";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle,
  Clock,
  Coffee,
  Flame,
  Gamepad2,
  Headphones,
  Minus,
  Plus,
  QrCode,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Zap,
} from "lucide-react";
import { getPublicSnacksFn, submitStationOrderFn } from "@/lib/booking.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/station")({
  head: () => ({
    meta: [
      { title: "Rig In-Game Service & Snacks | Friendz Arena PS5 Lounge" },
      { name: "description", content: "Scan from your PS5 rig to order cold drinks, munchies, combos, or request extra controllers and session extensions without leaving your seat." },
    ],
  }),
  component: StationServicePage,
});

const PS5_RIGS = [
  "Rig 01 · DualSense 1v1 Arena",
  "Rig 02 · Vice City Ready",
  "Rig 03 · Fighting Colosseum",
  "Rig 04 · PlayStation Exclusives",
  "Rig 05 · Co-op Squad Lounge",
];

function StationServicePage() {
  const getSnacks = useServerFn(getPublicSnacksFn);
  const submitOrder = useServerFn(submitStationOrderFn);

  // Active Rig
  const [selectedRig, setSelectedRig] = useState(PS5_RIGS[0]);
  const [snacksMenu, setSnacksMenu] = useState<any[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);

  // Cart: item_id -> quantity
  const [cart, setCart] = useState<Record<string, number>>({});
  const [serviceType, setServiceType] = useState<"snacks" | "controller" | "extension">("snacks");
  const [controllerNote, setControllerNote] = useState("Need 2nd DualSense controller for 2-Player Co-op");
  const [extensionHours, setExtensionHours] = useState(0.5); // 30 mins or 1 hr
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi">("cash");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(null);
  const [orderQrUrl, setOrderQrUrl] = useState<string>("");
  const [orderError, setOrderError] = useState("");

  // Read URL query params on client
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const rigParam = url.searchParams.get("rig");
      if (rigParam) {
        const found = PS5_RIGS.find((r) => r.toLowerCase().includes(rigParam.toLowerCase()));
        if (found) setSelectedRig(found);
      }
    }
  }, []);

  // Fetch snacks menu
  useEffect(() => {
    async function load() {
      try {
        const items = await getSnacks();
        setSnacksMenu(items || []);
      } catch {
      } finally {
        setLoadingMenu(false);
      }
    }
    load();
  }, []);

  function handleQuantityChange(id: string, delta: number) {
    setCart((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  }

  // Calculate cart total
  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const item = snacksMenu.find((s) => s.id === id);
        if (!item) return null;
        return { ...item, qty, itemTotal: item.price * qty };
      })
      .filter(Boolean) as any[];
  }, [cart, snacksMenu]);

  const cartTotal = useMemo(() => {
    if (serviceType === "extension") {
      return extensionHours === 0.5 ? 50 : 100;
    }
    if (serviceType === "controller") {
      return 0; // free complimentary controller swap
    }
    return cartItems.reduce((acc, it) => acc + it.itemTotal, 0);
  }, [cartItems, serviceType, extensionHours]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (serviceType === "snacks" && cartItems.length === 0) {
      setOrderError("Please select at least 1 snack or beverage item.");
      return;
    }
    setSubmitting(true);
    setOrderError("");

    let itemsPayload: any[] = [];
    if (serviceType === "snacks") {
      itemsPayload = cartItems.map((c) => ({ name: c.name, qty: c.qty, price: c.price }));
    } else if (serviceType === "controller") {
      itemsPayload = [{ name: "Gear Call", detail: controllerNote }];
    } else if (serviceType === "extension") {
      itemsPayload = [{ name: `Session Extension (+${extensionHours * 60} mins)`, price: cartTotal }];
    }

    try {
      const res = await submitOrder({
        data: {
          station_rig: selectedRig,
          service_type: serviceType,
          items_json: JSON.stringify(itemsPayload),
          total_amount: cartTotal,
          customer_name: customerName || "Gamer at " + selectedRig.split("·")[0].trim(),
          notes: notes,
          payment_method: paymentMethod,
        },
      });

      if (res?.success && res.order) {
        setSubmittedOrder(res.order);
        // If UPI payment, generate UPI QR code
        if (paymentMethod === "upi" && cartTotal > 0) {
          const upiString = `upi://pay?pa=friendzarena@upi&pn=Friendz%20Arena&am=${cartTotal}&cu=INR&tn=Station%20Fuel%20Order`;
          QRCode.toDataURL(upiString, { width: 260, margin: 1 }, (err, url) => {
            if (!err && url) setOrderQrUrl(url);
          });
        }
      } else {
        setOrderError("Could not submit order. Please let the desk staff know.");
      }
    } catch (err: any) {
      setOrderError(err?.message || "Order submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050819] text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070B24]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="size-4" /> Home
          </Link>
          <div className="text-center">
            <span className="font-display text-[10px] font-black uppercase tracking-widest text-[#FFB800]">
              FRIENDZ ARENA PS5
            </span>
            <h1 className="font-display text-sm font-black uppercase text-white">In-Seat Rig Service</h1>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Desk
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 space-y-6">
        {/* Station Rig Selector Card */}
        <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-[#0c1340] to-[#070c26] p-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">YOUR GAMING STATION</span>
            <span className="text-[10px] font-mono text-cyan-300">PS5 DIGITAL / DISC RIG</span>
          </div>
          <div className="mt-2">
            <select
              value={selectedRig}
              onChange={(e) => setSelectedRig(e.target.value)}
              className="w-full rounded-2xl border border-white/20 bg-black/60 px-4 py-3 font-display text-base font-black text-[#FFB800] focus:outline-none focus:ring-2 focus:ring-[#FFB800]"
            >
              {PS5_RIGS.map((rig) => (
                <option key={rig} value={rig}>
                  {rig}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Items will be brought directly to your station while you keep gaming.
          </p>
        </div>

        {/* ORDER SUCCESS SCREEN */}
        {submittedOrder ? (
          <div className="rounded-3xl border-2 border-emerald-500/50 bg-[#081536] p-6 text-center space-y-5 shadow-2xl">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500 text-black">
              <Check className="size-9 stroke-[3]" />
            </div>

            <div>
              <span className="font-display text-[10px] font-black uppercase tracking-wider text-emerald-400">
                REQUEST DISPATCHED TO DESK!
              </span>
              <h2 className="mt-1 font-display text-2xl font-black uppercase text-white">
                {serviceType === "snacks" ? "Snack Order Confirmed" : "Service Call Received"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Delivering directly to <strong className="text-white">{submittedOrder.station_rig}</strong>
              </p>
            </div>

            {/* UPI QR Payment if selected */}
            {paymentMethod === "upi" && cartTotal > 0 && orderQrUrl && (
              <div className="rounded-2xl border border-cyan-400/30 bg-black/70 p-4 text-center space-y-2">
                <span className="font-display text-[11px] font-black uppercase text-cyan-300">
                  SCAN TO PAY ₹{cartTotal} VIA ANY UPI APP
                </span>
                <div className="flex justify-center py-2">
                  <div className="rounded-xl bg-white p-2.5 shadow-xl">
                    <img src={orderQrUrl} alt="UPI QR Code" className="size-48" />
                  </div>
                </div>
                <p className="font-mono text-xs text-white">UPI ID: friendzarena@upi</p>
                <p className="text-[10px] text-muted-foreground">Scan with GPay, PhonePe, Paytm, or BHIM</p>
              </div>
            )}

            {paymentMethod === "cash" && cartTotal > 0 && (
              <div className="rounded-2xl bg-black/40 border border-white/10 p-3 text-xs text-muted-foreground">
                💵 <strong className="text-white">Cash Payment:</strong> Please have ₹{cartTotal} ready. The desk staff will collect it upon delivery.
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-left font-mono text-xs space-y-2">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-muted-foreground font-sans">Order ID:</span>
                <span className="text-[#FFB800]">{submittedOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Station:</span>
                <span className="text-white font-bold">{submittedOrder.station_rig}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Total:</span>
                <span className="text-[#FFB800] font-bold">₹{submittedOrder.total_amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Status:</span>
                <span className="text-emerald-400 uppercase font-bold">PREPARING (EST. 2-3 MINS)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSubmittedOrder(null);
                setCart({});
                setNotes("");
              }}
              className="btn-chamfer w-full bg-[#FFB800] py-3 font-display text-xs font-black uppercase text-black"
            >
              Order More Items
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Service Type Tab Bar */}
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-black/40 p-1.5 border border-white/10">
              <button
                type="button"
                onClick={() => setServiceType("snacks")}
                className={`flex flex-col items-center justify-center rounded-xl py-2.5 text-xs font-black uppercase transition-all ${
                  serviceType === "snacks"
                    ? "bg-[#FFB800] text-black shadow-lg"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <Coffee className="size-4 mb-1" /> Gamer Fuel
              </button>
              <button
                type="button"
                onClick={() => setServiceType("controller")}
                className={`flex flex-col items-center justify-center rounded-xl py-2.5 text-xs font-black uppercase transition-all ${
                  serviceType === "controller"
                    ? "bg-[#FFB800] text-black shadow-lg"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <Gamepad2 className="size-4 mb-1" /> Gear / Assist
              </button>
              <button
                type="button"
                onClick={() => setServiceType("extension")}
                className={`flex flex-col items-center justify-center rounded-xl py-2.5 text-xs font-black uppercase transition-all ${
                  serviceType === "extension"
                    ? "bg-[#FFB800] text-black shadow-lg"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <Clock className="size-4 mb-1" /> +Time Ext.
              </button>
            </div>

            {/* TAB 1: SNACKS & BEVERAGES */}
            {serviceType === "snacks" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-black uppercase text-white">Chilled Drinks & Snacks</h3>
                  <span className="text-[11px] text-muted-foreground">Select quantity</span>
                </div>

                {loadingMenu ? (
                  <div className="p-8 text-center text-muted-foreground">Loading snacks menu...</div>
                ) : (
                  <div className="space-y-2.5">
                    {snacksMenu.map((snk) => {
                      const qty = cart[snk.id] || 0;
                      return (
                        <div
                          key={snk.id}
                          className={`flex items-center justify-between rounded-2xl border p-3.5 transition-all ${
                            qty > 0
                              ? "border-[#FFB800]/60 bg-[#FFB800]/10"
                              : "border-white/10 bg-[#081348]/60 hover:border-white/25"
                          }`}
                        >
                          <div className="flex-1 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="font-display text-sm font-bold text-white">{snk.name}</span>
                              {snk.is_combo ? (
                                <span className="rounded bg-amber-500/20 text-[#FFB800] text-[9px] font-black px-1.5 py-0.5 uppercase">
                                  COMBO
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {snk.combo_description || snk.category}
                            </p>
                            <span className="mt-1 font-display text-xs font-black text-[#FFB800]">
                              ₹{snk.price}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {qty > 0 ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(snk.id, -1)}
                                  className="flex size-8 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 active:scale-95"
                                >
                                  <Minus className="size-3.5" />
                                </button>
                                <span className="w-5 text-center font-display text-sm font-black text-white">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(snk.id, 1)}
                                  className="flex size-8 items-center justify-center rounded-xl bg-[#FFB800] text-black hover:brightness-110 active:scale-95"
                                >
                                  <Plus className="size-3.5 stroke-[3]" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(snk.id, 1)}
                                className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 font-display text-xs font-bold text-white hover:bg-[#FFB800] hover:text-black hover:border-transparent transition-all"
                              >
                                + Add
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CONTROLLER & GEAR ASSIST */}
            {serviceType === "controller" && (
              <div className="rounded-3xl border border-white/10 bg-[#081348]/70 p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Gamepad2 className="size-6 text-cyan-300" />
                  <div>
                    <h4 className="font-display text-sm font-black uppercase text-white">Need Gear or Controller Assistance?</h4>
                    <p className="text-xs text-muted-foreground">Free complimentary service while gaming.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-white">Select Assistance Type</Label>
                  <div className="grid gap-2">
                    {[
                      "Need 2nd DualSense controller for 2-Player Co-op",
                      "Controller battery low / Need charging cable",
                      "Controller stick drift / Request controller swap",
                      "Request Pulse 3D Audio Headset",
                    ].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setControllerNote(opt)}
                        className={`rounded-xl p-3 text-left text-xs font-bold transition-all border ${
                          controllerNote === opt
                            ? "border-cyan-400 bg-cyan-400/20 text-white"
                            : "border-white/10 bg-black/40 text-muted-foreground hover:border-white/20"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SESSION TIME EXTENSION */}
            {serviceType === "extension" && (
              <div className="rounded-3xl border border-white/10 bg-[#081348]/70 p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="size-6 text-[#FFB800]" />
                  <div>
                    <h4 className="font-display text-sm font-black uppercase text-white">Extend Your Gaming Time</h4>
                    <p className="text-xs text-muted-foreground">Add more play time before your current slot ends.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExtensionHours(0.5)}
                    className={`rounded-2xl p-4 text-left border transition-all ${
                      extensionHours === 0.5
                        ? "border-[#FFB800] bg-[#FFB800]/15"
                        : "border-white/10 bg-black/40"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">+30 Minutes</span>
                    <p className="font-display text-xl font-black text-white">Half Hour</p>
                    <p className="font-display text-sm font-bold text-[#FFB800]">₹50</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExtensionHours(1)}
                    className={`rounded-2xl p-4 text-left border transition-all ${
                      extensionHours === 1
                        ? "border-[#FFB800] bg-[#FFB800]/15"
                        : "border-white/10 bg-black/40"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">+60 Minutes</span>
                    <p className="font-display text-xl font-black text-white">1 Full Hour</p>
                    <p className="font-display text-sm font-bold text-[#FFB800]">₹100</p>
                  </button>
                </div>
              </div>
            )}

            {/* Player details & payment */}
            <div className="rounded-3xl border border-white/10 bg-[#081348]/70 p-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-white text-xs">Gamer Tag / Name (Optional)</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Rahul or Viper"
                    className="rounded-xl border-white/10 bg-[#050819] text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-white text-xs">Notes for Staff (Optional)</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Extra cold drink, extra peri-peri"
                    className="rounded-xl border-white/10 bg-[#050819] text-white text-xs"
                  />
                </div>
              </div>

              {cartTotal > 0 && (
                <div className="space-y-1.5 pt-2">
                  <Label className="text-white text-xs">Choose Payment Method</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cash")}
                      className={`rounded-xl py-2.5 px-3 text-xs font-bold border transition-all text-center ${
                        paymentMethod === "cash"
                          ? "border-[#FFB800] bg-[#FFB800]/15 text-[#FFB800]"
                          : "border-white/10 bg-black/30 text-muted-foreground"
                      }`}
                    >
                      💵 Cash at Station
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("upi")}
                      className={`rounded-xl py-2.5 px-3 text-xs font-bold border transition-all text-center ${
                        paymentMethod === "upi"
                          ? "border-cyan-400 bg-cyan-400/15 text-cyan-300"
                          : "border-white/10 bg-black/30 text-muted-foreground"
                      }`}
                    >
                      📱 Pay via UPI QR
                    </button>
                  </div>
                </div>
              )}
            </div>

            {orderError && (
              <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0 text-red-400" />
                <span>{orderError}</span>
              </div>
            )}

            {/* Bottom Submit Sticky Bar */}
            <div className="sticky bottom-4 z-30 rounded-2xl border border-white/20 bg-[#070B24]/95 p-4 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Bill</span>
                <p className="font-display text-2xl font-black text-[#FFB800]">
                  {cartTotal === 0 ? "FREE" : `₹${cartTotal}`}
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || (serviceType === "snacks" && cartItems.length === 0)}
                className={`btn-chamfer px-6 py-3 font-display text-xs font-black uppercase transition-all ${
                  submitting || (serviceType === "snacks" && cartItems.length === 0)
                    ? "bg-white/10 text-muted-foreground cursor-not-allowed"
                    : "bg-[#FFB800] text-black hover:brightness-110 active:scale-95 shadow-lg"
                }`}
              >
                {submitting ? "Sending..." : "Dispatch Request to Desk 🚀"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
