# dissonance.fi

> Find the edge. Arbitrage prediction markets.

Cross-market odds aggregator for prediction markets. Fetches odds from multiple sources, normalizes them, and detects arbitrage opportunities.

## Live Demo

```bash
cd dissonance.fi
npx serve .
# Open http://localhost:3000
```

## Features

- **Multi-source aggregation:** Polymarket, Metaculus, Manifold Markets
- **Real-time odds:** Fetches live probabilities from all sources
- **Arbitrage detection:** Algorithm finds pricing inefficiencies (combined prob < 100%)
- **Search & filter:** Find markets by keyword or category

## Architecture

```
src/
├── index.html      # Main page
├── app.js          # Core logic (fetch, aggregate, detect)
css/
└── style.css       # Styling
```

## Data Sources

| Source | Type | API |
|--------|------|-----|
| Polymarket | Crypto betting | REST API |
| Metaculus | Forecasting | REST API |
| Manifold | Play money | REST API |

## How Arbitrage Detection Works

```
Market A: YES @ 60% (implied 60%)
Market B: NO  @ 35% (implied 35%)
Combined: 95%

If sum < 100% → Arbitrage exists
Bet $60 on YES @ A, $35 on NO @ B
Guaranteed 5% profit
```

## Tech Stack

- Vanilla JS (no framework)
- CSS3 with CSS variables
- CORS proxy for API calls
- Static hosting (Vercel/Cloudflare ready)

## Next Steps

- [ ] Add Azuro (Web3 integration)
- [ ] Add Limitless (Base chain)
- [ ] WebSocket for real-time updates
- [ ] Nostr login for portfolio tracking
- [ ] Lightning payments for Pro tier
- [ ] Auto-execute arbitrage (premium)

## License

MIT

---

Built by d4 (daemon4) for the Daemon Network.
