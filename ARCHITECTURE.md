# dissonance.fi Architecture

> Prediction Arbitrage Platform
> Status: DRAFT — Ready for Build

## Vision

A Nostr-native prediction market platform focused on **arbitrage opportunities** across decentralized prediction markets. Exploit pricing inefficiencies between platforms, aggregate odds, and surface value bets.

**Tagline:** "Find the edge. Arbitrage prediction markets."

---

## Core Concept

Instead of building another prediction market (crowded: Polymarket, Azuro, Limitless), build an **aggregator + arbitrage scanner**:

1. Aggregate odds from multiple prediction markets
2. Detect pricing inefficiencies (same event, different odds)
3. Surface arbitrage opportunities to users
4. Optional: Execute arbitrage automatically for premium users

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      dissonance.fi                          │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Astro + React)                                   │
│  - Market overview                                          │
│  - Arbitrage scanner                                        │
│  - Portfolio tracker                                        │
├─────────────────────────────────────────────────────────────┤
│  API Layer (Node.js / Deno)                                 │
│  - /api/markets — aggregated odds                          │
│  - /api/arbitrage — opportunities feed                     │
│  - /api/execute — trade execution (premium)                │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  - Scrapers/fetchers for each market                       │
│  - Odds normalization engine                               │
│  - Arbitrage detection algorithm                           │
├─────────────────────────────────────────────────────────────┤
│  Integrations                                               │
│  - Polymarket API                                          │
│  - Azuro Protocol                                          │
│  - Limitless                                               │
│  - Metaculus (forecasting platform)                        │
│  - Manifold Markets                                        │
├─────────────────────────────────────────────────────────────┤
│  Identity & Auth                                            │
│  - Nostr (npub login)                                      │
│  - Optional: Web of Trust reputations                      │
├─────────────────────────────────────────────────────────────┤
│  Payments                                                   │
│  - Lightning Network (micro-subscriptions)                 │
│  - Bitcoin on-chain (larger amounts)                       │
│  - Optional: Cashu/ecash (privacy)                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Target Markets to Aggregate

### Primary (DeFi/Native)
| Platform | Chain | API | Notes |
|----------|-------|-----|-------|
| Polymarket | Polygon | ✅ Yes | Largest crypto PM, CEX-style |
| Azuro | Gnosis Chain | ✅ Yes | LMSR, multiple frontends |
| Limitless | Base | ✅ Yes | Order book, new entrant |
| SX Network | Polygon | ✅ Yes | Parimutuel + sports |

### Secondary (Fiat/Cefi)
| Platform | Type | API | Notes |
|----------|------|-----|-------|
| PredictIt | Fiat | ❌ Scraped | US political, regulatory risks |
| Kalshi | Fiat | ❌ Scraped | CFTC regulated, limited |
| Metaculus | Forecasting | ✅ Yes | Non-betting, community forecasts |

---

## Arbitrage Detection Algorithm

### Simple Cross-Market Arbitrage

```
For each event E:
  For each outcome O (Yes/No):
    Get odds from all markets: [M1, M2, M3, ...]
    
    best_yes = max(odds_for_yes)    # Highest payout for YES
    best_no = max(odds_for_no)      # Highest payout for NO
    
    implied_prob = 1/best_yes + 1/best_no
    
    if implied_prob < 1.0:
      ARBITRAGE OPPORTUNITY
      Profit margin = (1 - implied_prob) * 100%
```

### Example

- Market A: YES @ 0.60 (implied 60%)
- Market B: NO @ 0.55 (implied 55%)
- Combined implied: 60% + 55% = 115%
- **No arbitrage** (sum > 100%)

- Market A: YES @ 0.60
- Market B: NO @ 0.35
- Combined: 60% + 35% = 95%
- **Arbitrage!** Bet $60 on YES @ A, $35 on NO @ B
- Guaranteed profit: 5% ($5 on $95 total)

---

## Monetization Strategy

### Tier 1: Free
- View aggregated odds
- Basic arbitrage alerts (24h delay)
- Limited market coverage

### Tier 2: Pro — $20/mo (Lightning)
- Real-time arbitrage alerts
- Full market coverage
- Historical odds data
- Portfolio tracking

### Tier 3: Enterprise — Custom
- API access
- Automated execution
- Custom integrations
- White-label options

### Additional Revenue
- Affiliate links to markets (where available)
- Featured market placements
- Data licensing to traders

---

## Tech Stack Recommendation

### Frontend
- **Astro** (static-first, fast)
- **React** for interactive components
- **TailwindCSS** for styling
- Hosted on Vercel or Cloudflare Pages

### Backend
- **Deno** or **Bun** for scrapers (fast, modern)
- **PostgreSQL** for data storage
- **Redis** for caching real-time odds
- Hosted on Fly.io or Railway

### Identity
- **Nostr** for auth (npub login)
- Store preferences + portfolio in Nostr relays
- Optional NIP-05 verification

### Payments
- **Lightning Network** for subscriptions (Strike/Alby)
- **Bitcoin** for larger purchases
- **Cashu** for privacy-focused users

---

## MVP Scope (Phase 1)

### Must Have
- [ ] Aggregate odds from 3 markets (Polymarket, Azuro, 1 other)
- [ ] Basic arbitrage detection
- [ ] Simple web UI to display opportunities
- [ ] Nostr login
- [ ] Lightning payment for Pro tier

### Nice to Have
- [ ] Historical odds charts
- [ ] Mobile-responsive
- [ ] Push notifications (Nostr DMs)
- [ ] Auto-refresh (WebSocket)

### Not in MVP
- ❌ Automated execution
- ❌ Multiple chains (stick to Polygon/Base)
- ❌ Fiat payments

---

## Competitive Advantage

| Competitor | Weakness | Our Edge |
|------------|----------|----------|
| Polymarket | Single market, no arb tools | Cross-market aggregation |
| Azuro | Fragmented frontends | Unified view |
| PM Aggregators | Fiat-only, no crypto | Native crypto, Nostr |
| Manual arb | Time-consuming | Automated scanning |

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Markets block scrapers | Medium | Use proxies, rotate IPs |
| Odds change too fast | Medium | Real-time WebSocket, alerts |
| Regulatory issues | Low | Non-custodial, aggregation only |
| Low liquidity markets | Medium | Filter by volume, show liquidity |

---

## Domain Strategy

- **Primary:** dissonance.fi
- **Redirects:** dissonance.nostr, diss.fi (if available)
- **Subdomains:** api.dissonance.fi, docs.dissonance.fi

---

## Next Steps

1. **Validate demand:** Post concept on Nostr, gauge interest
2. **Tech spike:** Test Polymarket + Azuro API access
3. **Build MVP:** 2-week sprint for core aggregation
4. **Launch:** Soft launch to Nostr community
5. **Iterate:** Based on user feedback

---

## File Structure (Proposed)

```
dissonance.fi/
├── ARCHITECTURE.md          # This file
├── README.md                # Project overview
├── src/
│   ├── scrapers/
│   │   ├── polymarket.ts
│   │   ├── azuro.ts
│   │   └── limitless.ts
│   ├── lib/
│   │   ├── arbitrage.ts     # Detection algorithm
│   │   ├── normalize.ts     # Odds normalization
│   │   └── notify.ts        # Alert system
│   └── api/
│       ├── markets.ts
│       └── arbitrage.ts
├── frontend/
│   └── (Astro project)
└── infrastructure/
    ├── docker-compose.yml
    └── deploy.sh
```

---

*Architecture drafted: 2026-02-28*
*Status: Ready for technical review and build decision*
