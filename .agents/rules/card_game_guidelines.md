# CardGame Guidelines & Operations Rules

## 1. Project Separation
- `c:\Users\zehavit\OneDrive\מסמכים\37` is strictly reserved for the personal 37th anniversary project. NEVER add or modify files in `37` for generic card game development.
- `c:\Users\zehavit\OneDrive\מסמכים\CardGame` is the dedicated repository for the generic customizable 54-card deck product. All changes, features, and assets belong strictly here.

## 2. Card Deck Architecture & Assets
- Standard Poker format: 54 cards (52 ranked cards + 2 jokers).
- In regular cards (1-52), card number sits in diagonal corners (top-right and bottom-left, inverted).
- Jokers (cards 53 & 54):
  - No card numbers.
  - Symmetrical stars in both diagonal corners (top-right and bottom-left), inset cleanly within the card border.
  - Card 53: Red stars.
  - Card 54: Yellow/Gold stars.
- Card Back:
  - Royal Midnight Blue (`#0a1128`) & Antique Gold filigree (`assets/card_back_blue_gold.svg`).
  - Symmetrical circular gold medallion framing the central QR code with a white circular base.
  - Option to toggle to Classic Casino Red (`assets/card_back_red.svg`), which also features the circular medallion.

## 3. Product Architecture & Client Self-Service Model
- Physical Product: 100% generic standard 54-card deck printed in bulk from inventory. Never custom-printed per client.
- QR Codes on Cards: Generic and static (`https://[Domain]/index.html?card=[1-54]`).
- Client Onboarding: Self-service via website portal. Clients enter their unique Game Code / PIN and upload media/years directly (no manual file transmission, forms, or manual data entry for the operator).
- Device Authentication: Scanning players enter the Game Code once upon initial scan; session persists in browser LocalStorage.
- Privacy & Isolation: Each client's media is isolated by their unique Game Code / partition.
- Retention: 3-5 years cloud hosting included in base product; client can download full digital archive (ZIP) anytime.
- Hosting: Free via Cloudflare Pages + Cloudflare R2 (10 GB free forever, zero egress fees).

