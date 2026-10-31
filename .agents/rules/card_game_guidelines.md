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

## 3. Client Onboarding & Privacy Rules
- Clients submit files via Google Form or structured cloud folder with standard naming: `[CardNum]_[Year]_[Title].[ext]`.
- Media mapping: 52 cards arranged chronologically by year (earliest to latest).
- Privacy: Never expose one client's media to another. Use secret UUID URLs and optional 4-digit PIN protection.
- Retention: Guaranteed 3-5 years cloud hosting included in base product; full offline digital backup (ZIP) provided to client upon delivery.
- Hosting: Free via Cloudflare Pages + Cloudflare R2 (10 GB free forever, zero egress fees).
