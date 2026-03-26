# Share This Coin Presale Launchpad

## Current State
New project. No existing app files.

## Requested Changes (Diff)

### Add
- Full presale landing page for "Share This Coin" (THIS) — a Solana SPL token
- Header with This Coin logo image, title, tagline, animated PRESALE IS LIVE badge
- SOL Raised card: live balance fetched from Solana mainnet RPC, progress bar toward 20 SOL soft cap, auto-refreshes every 15s
- Countdown timer to presale end date (April 30, 2026 15:00 UTC)
- Presale box: shows wallet address `HS8vLZMv2XmHzBydZwF9GFErMqjVZFUMeWmmUyYuu2w6`, copy button, Connect Phantom button, Buy Tokens Now button
- Recent Transactions table: fetches last 15 incoming txs from Solana RPC, filter by All/Incoming/Large (>2 SOL), search by sender/signature, sort by newest/oldest/highest/lowest, min amount slider, clear filters
- Tokenomics pie chart using Chart.js: Liquidity 51%, Community & Rewards 20%, Marketing & Airdrops 15%, Team (Locked) 9%, Development 5%
- Win banner: 5 SOL prize giveaway promo
- Footer with community handles and disclaimer
- Backend stores presale config (address, end date, soft cap) that frontend can query

### Modify
- N/A (new project)

### Remove
- N/A

## Implementation Plan
1. Motoko backend: store presale config (address, endDate, softCap) with getter
2. Frontend: React app faithfully recreating all sections from reference HTML
   - Install/use Chart.js via npm for tokenomics pie
   - Live Solana RPC fetch calls from frontend (browser)
   - Phantom wallet connect/buy flow
   - Transaction table with client-side filter/sort
   - Use uploaded logo at /assets/uploads/img_2774-019d2be4-50f6-73bb-a907-f7111276efc1-1.jpeg
