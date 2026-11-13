import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { calculateSessionPrice } from "@/lib/pricing";

const bookingRequestSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(20).regex(/^[+()\d\s-]+$/),
  contactMethod: z.enum(["phone", "whatsapp"]),
  visitDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => {
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    }),
  visitTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  partySize: z.number().int().min(1).max(20),
  durationHours: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  gameGenre: z.enum([
    "sports",
    "racing",
    "fighting",
    "action-adventure",
    "open-world",
    "multiplayer",
    "any",
  ]),
  notes: z.string().max(500),
  website: z.string().max(0),
});

export const submitBookingRequest = createServerFn({ method: "POST" })
  .inputValidator((input) => bookingRequestSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.website.length > 0) return { success: true };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const estimatedTotal = calculateSessionPrice(data.partySize, data.durationHours);
    const { error } = await supabaseAdmin.from("booking_requests").insert({
      customer_name: data.customerName,
      phone: data.phone,
      contact_method: data.contactMethod,
      visit_date: data.visitDate,
      visit_time: data.visitTime,
      party_size: data.partySize,
      duration_hours: data.durationHours,
      game_genre: data.gameGenre,
      notes: data.notes,
      estimated_total: estimatedTotal,
    });

    if (error) {
      console.error("[booking] Could not save request", error.code);
      throw new Error("Unable to save booking request");
    }

    return { success: true };
  });