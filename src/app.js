/**
 * dissonance.fi — Cross-Market Odds Aggregator
 * Fetches odds from multiple prediction markets and detects arbitrage opportunities
 */

// Configuration
const CONFIG = {
    CORS_PROXY: 'https://corsproxy.io/?',
    REFRESH_INTERVAL: 60000, // 1 minute
    ARB_THRESHOLD: 0.98, // Alert if combined probability < 98%
};

// Data sources
const SOURCES = {
    POLYMARKET: {
        name: 'Polymarket',
        color: '#ff4d4d',
        api: 'https://clob.polymarket.com/markets',
    },
    METACULUS: {
        name: 'Metaculus',
        color: '#4d94ff',
        api: 'https://www.metaculus.com/api2/questions/',
    },
    // Stub sources for demo (real APIs require more complex auth)
    AZURO: {
        name: 'Azuro',
        color: '#994dff',
        api: null, // Requires Web3
    },
    MANIFOLD: {
        name: 'Manifold',
        color: '#11b981',
        api: 'https://api.manifold.markets/v0/markets',
    },
};

// State
let allMarkets = [];
let arbitrageOpportunities = [];

// DOM Elements
const elements = {
    loading: document.getElementById('loading'),
    marketsContainer: document.getElementById('markets-container'),
    arbitrageContainer: document.getElementById('arbitrage-container'),
    searchInput: document.getElementById('search'),
    categoryFilter: document.getElementById('category-filter'),
    refreshBtn: document.getElementById('refresh-btn'),
    marketCount: document.getElementById('market-count'),
    arbCount: document.getElementById('arb-count'),
    bestEdge: document.getElementById('best-edge'),
};

// Utility functions
function formatProbability(prob) {
    return `${(prob * 100).toFixed(1)}%`;
}

function categorizeQuestion(question) {
    const q = question.toLowerCase();
    if (q.includes('trump') || q.includes('biden') || q.includes('election') || q.includes('president') || q.includes('congress')) {
        return 'politics';
    }
    if (q.includes('bitcoin') || q.includes('ethereum') || q.includes('crypto') || q.includes('btc') || q.includes('eth')) {
        return 'crypto';
    }
    if (q.includes('nfl') || q.includes('nba') || q.includes('world cup') || q.includes('championship') || q.includes('game')) {
        return 'sports';
    }
    if (q.includes('ai') || q.includes('openai') || q.includes('google') || q.includes('apple') || q.includes('tech')) {
        return 'tech';
    }
    return 'other';
}

// Normalize market data from different sources
function normalizePolymarket(markets) {
    return markets.map(m => ({
        id: `poly_${m.condition_id}`,
        question: m.question,
        source: 'Polymarket',
        category: categorizeQuestion(m.question),
        yesOdds: parseFloat(m.outcomes?.[0]?.price || m.tokens?.[0]?.price || 0.5),
        noOdds: parseFloat(m.outcomes?.[1]?.price || m.tokens?.[1]?.price || 0.5),
        volume: parseFloat(m.volume || 0),
        url: `https://polymarket.com/event/${m.condition_id}`,
        endDate: m.end_date_iso,
    }));
}

function normalizeMetaculus(questions) {
    return questions.results?.map(q => {
        const communityProb = q.community_prediction?.full?.q2 || q.community_prediction?.mean || 0.5;
        return {
            id: `meta_${q.id}`,
            question: q.title,
            source: 'Metaculus',
            category: categorizeQuestion(q.title),
            yesOdds: q.possibility_type === 'binary' ? communityProb : null,
            noOdds: q.possibility_type === 'binary' ? 1 - communityProb : null,
            volume: null,
            url: `https://www.metaculus.com/questions/${q.id}`,
            endDate: q.resolve_time,
        };
    }).filter(m => m.yesOdds !== null) || [];
}

function normalizeManifold(markets) {
    return markets.map(m => {
        const prob = m.probability || 0.5;
        return {
            id: `mani_${m.id}`,
            question: m.question,
            source: 'Manifold',
            category: categorizeQuestion(m.question),
            yesOdds: prob,
            noOdds: 1 - prob,
            volume: m.volume24Hours || 0,
            url: m.url,
            endDate: m.closeTime,
        };
    });
}

// Fetch functions
async function fetchPolymarket() {
    try {
        const url = `${CONFIG.CORS_PROXY}${encodeURIComponent(SOURCES.POLYMARKET.api)}`;
        const response = await fetch(url);
        const data = await response.json();
        console.log('Polymarket data:', data.length, 'markets');
        return normalizePolymarket(data.slice(0, 50)); // Top 50 markets
    } catch (error) {
        console.error('Polymarket fetch error:', error);
        return [];
    }
}

async function fetchMetaculus() {
    try {
        const url = `${CONFIG.CORS_PROXY}${encodeURIComponent(SOURCES.METACULUS.api + '?limit=50&status=open')}`;
        const response = await fetch(url);
        const data = await response.json();
        console.log('Metaculus data:', data.results?.length, 'questions');
        return normalizeMetaculus(data);
    } catch (error) {
        console.error('Metaculus fetch error:', error);
        return [];
    }
}

async function fetchManifold() {
    try {
        const url = `${CONFIG.CORS_PROXY}${encodeURIComponent(SOURCES.MANIFOLD.api + '?limit=50')}`;
        const response = await fetch(url);
        const data = await response.json();
        console.log('Manifold data:', data.length, 'markets');
        return normalizeManifold(data);
    } catch (error) {
        console.error('Manifold fetch error:', error);
        return [];
    }
}

// Aggregate and deduplicate markets by question similarity
function aggregateMarkets(markets) {
    const aggregated = new Map();

    markets.forEach(market => {
        // Create a simplified key for matching
        const key = market.question.toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 50);

        if (!aggregated.has(key)) {
            aggregated.set(key, {
                question: market.question,
                category: market.category,
                sources: {},
                endDate: market.endDate,
            });
        }

        const entry = aggregated.get(key);
        entry.sources[market.source] = {
            yesOdds: market.yesOdds,
            noOdds: market.noOdds,
            url: market.url,
            volume: market.volume,
        };
    });

    return Array.from(aggregated.values());
}

// Detect arbitrage opportunities
function detectArbitrage(markets) {
    const opportunities = [];

    markets.forEach(market => {
        const sources = Object.keys(market.sources);
        if (sources.length < 2) return; // Need at least 2 sources

        // Find best YES and best NO odds across all sources
        let bestYes = { odds: 0, source: null };
        let bestNo = { odds: 0, source: null };

        sources.forEach(source => {
            const s = market.sources[source];
            if (s.yesOdds > bestYes.odds) {
                bestYes = { odds: s.yesOdds, source };
            }
            if (s.noOdds > bestNo.odds) {
                bestNo = { odds: s.noOdds, source };
            }
        });

        // Calculate implied probability
        const impliedProb = bestYes.odds + bestNo.odds;

        // If sum < 1, there's an arbitrage opportunity
        if (impliedProb < CONFIG.ARB_THRESHOLD) {
            const edge = (1 - impliedProb) * 100;
            opportunities.push({
                question: market.question,
                category: market.category,
                yesSource: bestYes.source,
                yesOdds: bestYes.odds,
                noSource: bestNo.source,
                noOdds: bestNo.odds,
                impliedProb,
                edge,
                sources: market.sources,
            });
        }
    });

    return opportunities.sort((a, b) => b.edge - a.edge);
}

// Render functions
function renderMarketCard(market) {
    const hasArb = Object.keys(market.sources).length >= 2;
    const sourcesHtml = Object.entries(market.sources)
        .map(([name, data]) => `
            <div class="odds-item">
                <div class="odds-source">${name}</div>
                <div class="odds-value yes">Y: ${formatProbability(data.yesOdds)}</div>
                <div class="odds-value no">N: ${formatProbability(data.noOdds)}</div>
            </div>
        `).join('');

    const arbBadge = hasArb ? '<span class="arb-badge">Multiple Sources</span>' : '';

    return `
        <div class="market-card ${hasArb ? 'has-arb' : ''}">
            <div class="market-header">
                <div class="market-title">${market.question}</div>
                <span class="market-category">${market.category}</span>
            </div>
            <div class="odds-grid">
                ${sourcesHtml}
            </div>
            ${arbBadge}
        </div>
    `;
}

function renderArbitrageCard(arb) {
    return `
        <div class="arb-card">
            <div class="arb-header">
                <div class="arb-title">${arb.question}</div>
                <div class="arb-edge">+${arb.edge.toFixed(1)}%</div>
            </div>
            <div class="arb-details">
                <div class="arb-bet">
                    <div class="arb-bet-source">${arb.yesSource}</div>
                    <div class="arb-bet-action">Bet YES</div>
                    <div class="arb-bet-odds">@ ${formatProbability(arb.yesOdds)}</div>
                </div>
                <div class="arb-bet">
                    <div class="arb-bet-source">${arb.noSource}</div>
                    <div class="arb-bet-action">Bet NO</div>
                    <div class="arb-bet-odds">@ ${formatProbability(arb.noOdds)}</div>
                </div>
            </div>
            <div class="arb-explanation">
                Combined implied probability: <strong>${formatProbability(arb.impliedProb)}</strong>.
                Bet $${(arb.yesOdds * 100).toFixed(0)} on YES and $${(arb.noOdds * 100).toFixed(0)} on NO.
                Guaranteed profit: <strong>${arb.edge.toFixed(1)}%</strong>
            </div>
        </div>
    `;
}

function renderMarkets(markets) {
    if (markets.length === 0) {
        elements.marketsContainer.innerHTML = '<p class="loading">No markets found. Try refreshing.</p>';
        return;
    }

    elements.marketsContainer.innerHTML = markets.map(renderMarketCard).join('');
}

function renderArbitrage(opportunities) {
    if (opportunities.length === 0) {
        elements.arbitrageContainer.innerHTML = `
            <p class="loading">No arbitrage opportunities detected right now.
            This is normal — markets are usually efficient. Check back later.</p>
        `;
        return;
    }

    elements.arbitrageContainer.innerHTML = opportunities.slice(0, 10).map(renderArbitrageCard).join('');
}

function updateStats(markets, opportunities) {
    elements.marketCount.textContent = markets.length;

    const arbCount = opportunities.length;
    elements.arbCount.textContent = arbCount;

    if (arbCount > 0) {
        elements.bestEdge.textContent = `+${opportunities[0].edge.toFixed(1)}%`;
    } else {
        elements.bestEdge.textContent = '—';
    }
}

// Filter functions
function filterMarkets() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    const category = elements.categoryFilter.value;

    let filtered = allMarkets;

    if (searchTerm) {
        filtered = filtered.filter(m =>
            m.question.toLowerCase().includes(searchTerm)
        );
    }

    if (category !== 'all') {
        filtered = filtered.filter(m => m.category === category);
    }

    renderMarkets(filtered);
}

// Main initialization
async function init() {
    console.log('🜏 dissonance.fi initializing...');

    // Fetch from all sources in parallel
    const [polymarket, metaculus, manifold] = await Promise.all([
        fetchPolymarket(),
        fetchMetaculus(),
        fetchManifold(),
    ]);

    // Combine all markets
    const rawMarkets = [...polymarket, ...metaculus, ...manifold];
    console.log('Total raw markets:', rawMarkets.length);

    // Aggregate by question similarity
    allMarkets = aggregateMarkets(rawMarkets);
    console.log('Aggregated markets:', allMarkets.length);

    // Detect arbitrage
    arbitrageOpportunities = detectArbitrage(allMarkets);
    console.log('Arbitrage opportunities:', arbitrageOpportunities.length);

    // Hide loading, show data
    elements.loading.classList.add('hidden');

    // Render everything
    renderMarkets(allMarkets);
    renderArbitrage(arbitrageOpportunities);
    updateStats(allMarkets, arbitrageOpportunities);

    // Set up event listeners
    elements.searchInput.addEventListener('input', filterMarkets);
    elements.categoryFilter.addEventListener('change', filterMarkets);
    elements.refreshBtn.addEventListener('click', () => {
        elements.loading.classList.remove('hidden');
        elements.marketsContainer.innerHTML = '';
        elements.arbitrageContainer.innerHTML = '';
        init();
    });

    console.log('🜏 dissonance.fi ready');
}

// Start the app
init();
