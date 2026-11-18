# Friendz Arena website

Update the existing gaming lounge page to use the owner-provided Friendz Arena name and logo, with the confirmed shop information and approved group pricing.

## Website updates

- Use the uploaded Friendz Arena logo in the page branding and derive the site favicon from it.
- Keep the existing gaming-focused Ocean Deep look, five PS5 stations, and popular game-genre sections.
- Show daily hours as 10 am–9 pm, link 8498833389 for both phone calls and WhatsApp, and keep the address marked “Coming soon.”
- Show the approved total group prices for 1–5 people and 1–3 hours:

| People | 1 hour | 2 hours | 3 hours |
| -----: | -----: | ------: | ------: |
|      1 |   ₹100 |    ₹180 |    ₹250 |
|      2 |   ₹150 |    ₹270 |    ₹375 |
|      3 |   ₹200 |    ₹360 |    ₹500 |
|      4 |   ₹250 |    ₹450 |    ₹625 |
|      5 |   ₹300 |    ₹540 |    ₹750 |

- Update the booking estimate and saved request amount to use the selected group-size and duration total, while preserving the request-for-confirmation flow.

## Technical details

- Keep shared price calculation in `src/lib/pricing.ts`; update its existing unit tests with concrete assertions for the approved group totals.
- Update the booking form and server-side validation/calculation together so the displayed estimate and saved amount agree. Pricing above five people is not specified; do not invent additional rates.
- Store the uploaded logo through the project asset flow, use it on the page, and create a correctly sized favicon from the same image.
- Keep the existing content page and its page-specific metadata aligned with the Friendz Arena name and supplied content.

## Not included

- The street address remains unknown and will display as “Coming soon.”
- Hours are set to 10 am–9 pm daily as confirmed; no further scheduling details were provided.
