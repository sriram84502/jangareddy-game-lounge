import { describe, it, expect } from "vitest";
import {
  sqlGetPublicTestimonials,
  sqlGetAllTestimonialsAdmin,
  sqlAddTestimonial,
  sqlUpdateTestimonialStatus,
  sqlToggleTestimonialFeatured,
  sqlDeleteTestimonial,
} from "../lib/db.server";

describe("Customer Testimonials & Admin Moderation", () => {
  it("should retrieve seeded public testimonials that are approved", async () => {
    const publicTestimonials = await sqlGetPublicTestimonials();
    expect(Array.isArray(publicTestimonials)).toBe(true);
    expect(publicTestimonials.length).toBeGreaterThanOrEqual(1);

    for (const t of publicTestimonials) {
      expect(t.status).toBe("approved");
      expect(t.customer_name).toBeTruthy();
      expect(t.comment).toBeTruthy();
      expect(t.rating).toBeGreaterThanOrEqual(1);
      expect(t.rating).toBeLessThanOrEqual(5);
    }
  });

  it("should allow a customer to submit a new review with pending status", async () => {
    const newReview = await sqlAddTestimonial({
      customer_name: "Rahul Varma",
      role: "Mortal Kombat Champion",
      rating: 5,
      comment: "Best gaming lounge in Jangareddygudem! The 120Hz screens are ultra smooth.",
      favorite_game: "Mortal Kombat 1",
      station_rig: "Rig 03 · OLED Pro Station",
      status: "pending",
    });

    expect(newReview).toBeDefined();
    expect(newReview.id).toBeTruthy();
    expect(newReview.status).toBe("pending");
    expect(newReview.customer_name).toBe("Rahul Varma");

    // Pending review should NOT appear in public testimonials yet
    const publicList = await sqlGetPublicTestimonials();
    const foundInPublic = publicList.find((t) => t.id === newReview.id);
    expect(foundInPublic).toBeUndefined();

    // But should appear in Admin testimonials
    const adminList = await sqlGetAllTestimonialsAdmin();
    const foundInAdmin = adminList.find((t) => t.id === newReview.id);
    expect(foundInAdmin).toBeDefined();
    expect(foundInAdmin?.status).toBe("pending");
  });

  it("should allow admin to approve a review so it shows on public website", async () => {
    const newReview = await sqlAddTestimonial({
      customer_name: "Suresh Babu",
      role: "FIFA Regular",
      rating: 5,
      comment: "Great controllers and very chilled AC lounge.",
      favorite_game: "EA Sports FC 25",
      station_rig: "Rig 01 · Pro Esports Cockpit",
      status: "pending",
    });

    // Approve the review
    const updated = await sqlUpdateTestimonialStatus(newReview.id, "approved");
    expect(updated?.status).toBe("approved");

    // Now it MUST appear in public testimonials
    const publicList = await sqlGetPublicTestimonials();
    const foundInPublic = publicList.find((t) => t.id === newReview.id);
    expect(foundInPublic).toBeDefined();
    expect(foundInPublic?.customer_name).toBe("Suresh Babu");
  });

  it("should allow admin to pin a featured review to the top", async () => {
    const adminList = await sqlGetAllTestimonialsAdmin();
    const target = adminList[0];
    expect(target).toBeDefined();

    const toggled = await sqlToggleTestimonialFeatured(target.id, 1);
    expect(toggled?.is_featured).toBe(1);

    const publicList = await sqlGetPublicTestimonials();
    // Featured reviews are sorted first
    expect(publicList[0].id).toBe(target.id);
  });

  it("should allow admin to delete a review", async () => {
    const created = await sqlAddTestimonial({
      customer_name: "Spam Bot",
      role: "Tester",
      rating: 1,
      comment: "Spam comment to be deleted",
    });

    const deleted = await sqlDeleteTestimonial(created.id);
    expect(deleted).toBe(true);

    const adminList = await sqlGetAllTestimonialsAdmin();
    const found = adminList.find((t) => t.id === created.id);
    expect(found).toBeUndefined();
  });
});
