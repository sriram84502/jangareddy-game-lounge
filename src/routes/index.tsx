import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDown,
  ArrowRight,
  Check,
  Clock3,
  Gamepad2,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  Users,
} from "lucide-react";

import loungeImage from "@/assets/gaming-lounge.jpg";
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
import { calculateSessionPrice } from "@/lib/pricing";
import { submitBookingRequest } from "@/lib/booking.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jangareddygudem Gaming Lounge | PS5 Sessions" },
      {
        name: "description",
        content:
          "Play popular games at a five-station PS5 gaming lounge in Jangareddygudem. View per-person hourly rates and request a session.",
      },
      { property: "og:title", content: "Jangareddygudem Gaming Lounge | PS5 Sessions" },
      {
        property: "og:description",
        content:
          "Five PS5 stations, popular game genres, and simple hourly rates in Jangareddygudem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const gameGenres = [
  { label: "Sports", detail: "Kick off with friends", icon: Sparkles },
  { label: "Racing", detail: "Take the fast lane", icon: ArrowRight },
  { label: "Fighting", detail: "Settle the score", icon: Gamepad2 },
  { label: "Action & adventure", detail: "Find your next quest", icon: ArrowDown },
  { label: "Open world", detail: "Explore at your pace", icon: MapPin },
  { label: "Multiplayer", detail: "Make it a team game", icon: Users },
];

const rates = [
  { hours: 1 as const, price: 100, label: "Quick match", note: "A great place to start" },
  { hours: 2 as const, price: 180, label: "Double session", note: "Save ₹20 per person" },
  { hours: 3 as const, price: 250, label: "Long play", note: "Save ₹50 per person", featured: true },
];

function Index() {
  const sendBookingRequest = useServerFn(submitBookingRequest);
  const [durationHours, setDurationHours] = useState<1 | 2 | 3>(1);
  const [partySize, setPartySize] = useState(1);
  const [contactMethod, setContactMethod] = useState<"phone" | "whatsapp">("whatsapp");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const total = calculateSessionPrice(partySize, durationHours);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitted(false);
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const result = await sendBookingRequest({
      data: {
        customerName: String(formData.get("customerName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        contactMethod,
        visitDate: String(formData.get("visitDate") ?? ""),
        visitTime: String(formData.get("visitTime") ?? ""),
        partySize,
        durationHours,
        gameGenre: String(formData.get("gameGenre") ?? ""),
        notes: String(formData.get("notes") ?? ""),
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

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/80">
        <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-5 px-5 py-3 sm:px-8">
          <a href="#top" className="flex min-w-0 items-center gap-3" aria-label="Gaming Lounge home">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Gamepad2 aria-hidden="true" className="size-6" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-bold sm:text-base">
                Jangareddygudem
              </span>
              <span className="block text-xs text-muted-foreground">Gaming Lounge</span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex" aria-label="Main navigation">
            <a className="transition-colors hover:text-foreground" href="#rates">Rates</a>
            <a className="transition-colors hover:text-foreground" href="#games">Games</a>
            <a className="transition-colors hover:text-foreground" href="#visit">Visit</a>
          </nav>

          <Button asChild className="shrink-0 px-3 sm:px-5">
            <a href="#book">Book a session <ArrowRight aria-hidden="true" /></a>
          </Button>
        </div>
      </header>

      <section id="top" className="relative isolate flex min-h-[34rem] items-center overflow-hidden sm:min-h-[38rem]">
        <img
          src={loungeImage}
          alt="A bright gaming lounge with five PlayStation gaming stations and friends playing together"
          width={1536}
          height={1024}
          fetchPriority="high"
          className="absolute inset-0 -z-20 size-full object-cover object-center"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-background/65" />
        <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-sm border border-primary/50 bg-background/70 px-3 py-2 font-display text-xs font-bold uppercase text-primary">
              <span className="size-2 rounded-full bg-primary" />
              PS5 gaming · Jangareddygudem
            </p>
            <h1 className="max-w-3xl font-display text-4xl font-bold leading-[1.12] sm:text-6xl">
              Jangareddygudem Gaming Lounge
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-foreground/90 sm:text-xl">
              Five PS5 stations. Popular games across sports, racing, action and more. Bring your crew and play by the hour.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <a href="#book">Request a session <ArrowRight aria-hidden="true" /></a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-foreground/50 bg-background/50">
                <a href="#rates">Explore hourly rates</a>
              </Button>
            </div>
          </div>

          <div className="mt-14 flex flex-wrap gap-x-8 gap-y-3 border-t border-foreground/30 pt-5 text-sm font-medium">
            <span className="inline-flex items-center gap-2"><Gamepad2 aria-hidden="true" className="size-4 text-primary" /> 5 PS5 stations</span>
            <span className="inline-flex items-center gap-2"><Clock3 aria-hidden="true" className="size-4 text-primary" /> From ₹100 per person / hour</span>
            <span className="inline-flex items-center gap-2"><MapPin aria-hidden="true" className="size-4 text-primary" /> Jangareddygudem</span>
          </div>
        </div>
      </section>

      <section id="rates" className="scroll-mt-8 border-b border-border/80 bg-card/50">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="font-display text-xs font-bold uppercase text-primary">Pick your play time</p>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Straight-up session rates</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">Every rate is per person. Longer sessions include a little extra play for less.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {rates.map((rate) => (
              <article key={rate.hours} className={`relative border p-6 sm:p-7 ${rate.featured ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
                {rate.featured ? <span className="absolute right-4 top-4 rounded-sm bg-primary px-2.5 py-1 font-display text-[10px] font-bold uppercase text-primary-foreground">Best rate</span> : null}
                <p className="font-display text-sm font-bold text-muted-foreground">{rate.label}</p>
                <p className="mt-5 flex items-baseline gap-2">
                  <span className="font-display text-5xl font-bold">₹{rate.price}</span>
                  <span className="text-sm text-muted-foreground">/ person</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{rate.hours} {rate.hours === 1 ? "hour" : "hours"}</p>
                <div className="mt-6 border-t border-border pt-4 text-sm text-foreground/90">{rate.note}</div>
                <a href="#book" onClick={() => setDurationHours(rate.hours)} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                  Choose this session <ArrowRight aria-hidden="true" className="size-4" />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="games" className="scroll-mt-8 border-b border-border/80">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="max-w-2xl">
            <p className="font-display text-xs font-bold uppercase text-primary">Find your kind of game</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">What are you playing today?</h2>
            <p className="mt-4 leading-7 text-muted-foreground">Choose a genre when you request a session. The shop can confirm specific titles when they get in touch.</p>
          </div>
          <div className="mt-9 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {gameGenres.map(({ label, detail, icon: Icon }) => (
              <div key={label} className="flex items-start gap-4 border-t border-border py-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-secondary text-primary"><Icon aria-hidden="true" className="size-5" /></span>
                <span><span className="block font-display text-base font-bold">{label}</span><span className="mt-1 block text-sm text-muted-foreground">{detail}</span></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="book" className="scroll-mt-6 border-b border-border/80 bg-card/50">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-16">
          <div>
            <p className="font-display text-xs font-bold uppercase text-primary">Your next session</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Request a booking</h2>
            <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">Send your preferred time and we’ll confirm it with you. Your request is not a confirmed reservation yet.</p>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Your name</Label>
                  <Input id="customerName" name="customerName" autoComplete="name" required minLength={2} maxLength={100} placeholder="Name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input id="phone" name="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={20} pattern="[+()0-9 -]{7,20}" placeholder="Your number" />
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Preferred way to reach you</legend>
                <div className="inline-flex gap-1 rounded-md border border-border bg-background p-1">
                  <Button type="button" size="sm" variant={contactMethod === "whatsapp" ? "default" : "ghost"} onClick={() => setContactMethod("whatsapp")} aria-pressed={contactMethod === "whatsapp"}>
                    <MessageCircle aria-hidden="true" /> WhatsApp
                  </Button>
                  <Button type="button" size="sm" variant={contactMethod === "phone" ? "default" : "ghost"} onClick={() => setContactMethod("phone")} aria-pressed={contactMethod === "phone"}>
                    <Phone aria-hidden="true" /> Phone call
                  </Button>
                </div>
              </fieldset>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="visitDate">Preferred date</Label>
                  <Input id="visitDate" name="visitDate" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visitTime">Preferred start time</Label>
                  <Input id="visitTime" name="visitTime" type="time" required />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="partySize">Number of people</Label>
                  <Input id="partySize" type="number" min={1} max={20} value={partySize} onChange={(event) => setPartySize(Math.min(20, Math.max(1, Number(event.target.value) || 1)))} />
                </div>
                <div className="space-y-2">
                  <Label>Session length</Label>
                  <Select value={String(durationHours)} onValueChange={(value) => setDurationHours(Number(value) as 1 | 2 | 3)}>
                    <SelectTrigger aria-label="Session length"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour · ₹100 per person</SelectItem>
                      <SelectItem value="2">2 hours · ₹180 per person</SelectItem>
                      <SelectItem value="3">3 hours · ₹250 per person</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gameGenre">Game genre</Label>
                <Select name="gameGenre" defaultValue="any" required>
                  <SelectTrigger id="gameGenre"><SelectValue placeholder="Choose a genre" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Surprise me</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="racing">Racing</SelectItem>
                    <SelectItem value="fighting">Fighting</SelectItem>
                    <SelectItem value="action-adventure">Action & adventure</SelectItem>
                    <SelectItem value="open-world">Open world</SelectItem>
                    <SelectItem value="multiplayer">Multiplayer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Anything else? <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <textarea id="notes" name="notes" maxLength={500} rows={3} placeholder="Add a note for the shop" className="flex w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>

              <div aria-hidden="true" className="absolute -left-[10000px] top-auto size-px overflow-hidden">
                <label htmlFor="website">Leave this field empty</label>
                <input id="website" name="website" tabIndex={-1} autoComplete="off" />
              </div>

              {errorMessage ? <p role="alert" className="text-sm font-medium text-destructive">{errorMessage}</p> : null}
              {submitted ? (
                <div role="status" className="flex items-start gap-3 border border-primary/50 bg-primary/10 p-4 text-sm leading-6">
                  <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                  <p><span className="font-semibold">Request received.</span> The shop will confirm your preferred session before it is booked.</p>
                </div>
              ) : null}

              <Button size="lg" type="submit" disabled={submitting}>
                {submitting ? "Sending request…" : "Send booking request"}
                <ArrowRight aria-hidden="true" />
              </Button>
            </form>
          </div>

          <aside className="h-fit border border-border bg-card p-6 sm:p-7 lg:sticky lg:top-8">
            <span className="flex size-11 items-center justify-center rounded-md bg-secondary text-primary"><Clock3 aria-hidden="true" className="size-5" /></span>
            <h3 className="mt-5 font-display text-lg font-bold">Your estimate</h3>
            <p className="mt-1 text-sm text-muted-foreground">Based on your current choices</p>
            <div className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">People</span><span>{partySize}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Time</span><span>{durationHours} {durationHours === 1 ? "hour" : "hours"}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Rate / person</span><span>₹{calculateSessionPrice(1, durationHours)}</span></div>
            </div>
            <div className="mt-5 flex items-end justify-between border-t border-border pt-5">
              <span className="text-sm text-muted-foreground">Estimated total</span>
              <span className="font-display text-3xl font-bold">₹{total}</span>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">The shop confirms availability and the final details with you.</p>
          </aside>
        </div>
      </section>

      <section id="visit" className="scroll-mt-8">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 md:grid-cols-[1fr_1fr]">
          <div>
            <p className="font-display text-xs font-bold uppercase text-primary">Find your local game spot</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">See you in Jangareddygudem</h2>
            <p className="mt-4 max-w-lg leading-7 text-muted-foreground">A neighborhood gaming lounge with five PS5 stations and popular games to play by the hour.</p>
            <div className="mt-7 flex items-start gap-3">
              <MapPin aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" />
              <div><p className="font-semibold">Jangareddygudem</p><p className="mt-1 text-sm text-muted-foreground">Exact shop address coming soon</p></div>
            </div>
          </div>
          <div className="grid gap-0 sm:grid-cols-2">
            <div className="border-t border-border py-5 sm:mr-5">
              <p className="inline-flex items-center gap-2 font-display text-sm font-bold"><Phone aria-hidden="true" className="size-4 text-primary" /> Call</p>
              <p className="mt-2 text-sm text-muted-foreground">Phone number to be added</p>
            </div>
            <div className="border-t border-border py-5">
              <p className="inline-flex items-center gap-2 font-display text-sm font-bold"><MessageCircle aria-hidden="true" className="size-4 text-primary" /> WhatsApp</p>
              <p className="mt-2 text-sm text-muted-foreground">WhatsApp number to be added</p>
            </div>
            <div className="border-t border-border py-5 sm:mr-5">
              <p className="inline-flex items-center gap-2 font-display text-sm font-bold"><Clock3 aria-hidden="true" className="size-4 text-primary" /> Opening hours</p>
              <p className="mt-2 text-sm text-muted-foreground">Hours to be added</p>
            </div>
            <div className="border-t border-border py-5">
              <p className="inline-flex items-center gap-2 font-display text-sm font-bold"><Users aria-hidden="true" className="size-4 text-primary" /> Session requests</p>
              <p className="mt-2 text-sm text-muted-foreground">Reservations are confirmed by the shop.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>Jangareddygudem Gaming Lounge</span>
          <span>PS5 gaming · Jangareddygudem</span>
        </div>
      </footer>
    </main>
  );
}
