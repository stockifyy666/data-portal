export type ReportTeam = 'Research' | 'Technical' | 'Fundamental'

export type Report = {
  id:       number
  slug:     string
  title:    string
  team:     ReportTeam
  date:     string
  readTime: string
  summary:  string
  tags:     string[]
  featured?: boolean
  body:     string   // markdown-ish HTML string for the detail page
}

export const REPORTS: Report[] = [
  {
    id: 1,
    slug: 'pakistan-market-outlook-q3-2025',
    title: 'Pakistan Market Outlook — Q3 2025',
    team: 'Research',
    date: '2025-08-15',
    readTime: '12 min',
    summary: 'A comprehensive analysis of macroeconomic indicators, SBP policy direction, and sector rotation trends expected in Q3 2025.',
    tags: ['Macro', 'Market Outlook', 'SBP Policy'],
    featured: true,
    body: `
<h2>Executive Summary</h2>
<p>Pakistan's macro environment is stabilising after the IMF tranche disbursement in July 2025. Inflation is trending down toward single digits and the SBP is expected to cut policy rate by another 100–150 bps over Q3. Foreign exchange reserves have crossed $14 Bn, providing a comfortable import cover of 2.5 months.</p>

<h2>Macro Indicators</h2>
<ul>
  <li><strong>CPI Inflation:</strong> 11.1% YoY (Jul-25), expected to reach 8–9% by Sep-25.</li>
  <li><strong>Policy Rate:</strong> 17.5% — SBP MPC meeting scheduled for September.</li>
  <li><strong>PKR/USD:</strong> Stable at ~280–285, supported by remittance inflows and IMF support.</li>
  <li><strong>FX Reserves:</strong> $14.2 Bn (SBP) as of Aug-10, 2025.</li>
</ul>

<h2>Sector Outlook</h2>
<p><strong>Banking:</strong> Rate cuts will compress NIM but rising loan volumes should partially offset. Our top picks remain HBL and MCB for their low-cost deposit franchises.</p>
<p><strong>Cement:</strong> Construction demand rebounding post-monsoon. Lucky Cement (LUCK) and DG Khan Cement (DGKC) are positioned to capture margin expansion as coal prices moderate.</p>
<p><strong>Technology:</strong> IT exports growing 20%+ YoY. Systems Ltd (SYS) and NetSol Technologies are benefiting from PKR stability improving USD-denominated earnings.</p>

<h2>Investment Strategy</h2>
<p>We recommend overweighting Financials and Materials into Q3, while remaining selective on Energy given circular debt uncertainty. The KSE-100 target for December 2025 is 130,000 (+10% from current levels).</p>

<h2>Risks</h2>
<ul>
  <li>Global commodity price spike could reignite import-driven inflation.</li>
  <li>Delay in IMF tranche release if fiscal targets are missed.</li>
  <li>Political uncertainty ahead of by-elections.</li>
</ul>
    `,
  },
  {
    id: 2,
    slug: 'banking-sector-rate-cut-impact',
    title: 'Banking Sector: Rate Cut Impact Analysis',
    team: 'Research',
    date: '2025-08-10',
    readTime: '8 min',
    summary: 'Deep dive into how the recent 150bps rate reduction affects NIM compression, loan growth, and valuations across PSX-listed banks.',
    tags: ['Banking', 'Interest Rates', 'NIM'],
    body: `
<h2>Overview</h2>
<p>The State Bank of Pakistan cut the policy rate by 150bps to 17.5% in its July 2025 MPC meeting. This note analyses the first and second-order effects on the banking sector.</p>

<h2>NIM Compression</h2>
<p>Banks with higher fixed-rate deposit books will see NIM compress 20–40bps over the next two quarters. Banks with floating-rate, short-tenure deposit mix (e.g., HBL, UBL) are better insulated.</p>

<h2>Loan Growth Catalyst</h2>
<p>Lower rates stimulate private sector credit. We expect industry-wide loan growth to accelerate from 8% YoY to 14–16% YoY by Q4 FY26, partially offsetting NIM headwinds.</p>

<h2>Valuation Impact</h2>
<p>Lower discount rates expand P/B multiples. Banks trading below 1x P/B — including BOP and SILK — offer the highest re-rating potential. Our top picks: MCB (BUY, TP Rs 450) and HBL (BUY, TP Rs 210).</p>
    `,
  },
  {
    id: 3,
    slug: 'cement-sector-demand-recovery-margins',
    title: 'Cement Sector Update: Demand Recovery & Margins',
    team: 'Research',
    date: '2025-08-05',
    readTime: '10 min',
    summary: 'Industry dispatches recovering post-monsoon. Cost normalization and CPEC Phase-II project pipeline outlook for FY26.',
    tags: ['Cement', 'Dispatches', 'FY26'],
    body: `
<h2>Dispatch Trends</h2>
<p>July 2025 dispatches came in at 3.8 Mn tons, up 12% MoM as construction activity resumed post-monsoon slowdown. The North region leads recovery driven by housing projects in Lahore and Islamabad.</p>

<h2>Cost Normalisation</h2>
<p>International coal prices have moderated to $115/ton (vs. $160/ton peak in FY24). Combined with declining RLNG tariffs, energy costs per ton are expected to fall Rs 250–300 in FY26.</p>

<h2>CPEC Phase-II Pipeline</h2>
<p>The government has announced infrastructure projects worth Rs 2 Tn under CPEC Phase-II, including motorways and industrial zones. This provides a multi-year demand tailwind for the cement sector.</p>

<h2>Top Picks</h2>
<p>LUCK (BUY, TP Rs 1,250) remains our top pick for its cost efficiency and export optionality. DGKC (BUY, TP Rs 120) offers a re-rating play as its new line reaches full utilisation by Q2 FY26.</p>
    `,
  },
  {
    id: 4,
    slug: 'energy-rlng-pricing-power-sector',
    title: 'Energy Chain: RLNG Pricing & Power Sector Dynamics',
    team: 'Research',
    date: '2025-07-28',
    readTime: '9 min',
    summary: 'Impact of revised RLNG tariffs on gas distribution companies and the downstream effect on power-sector circular debt.',
    tags: ['Energy', 'RLNG', 'Circular Debt'],
    body: `
<h2>RLNG Tariff Revision</h2>
<p>OGRA revised RLNG prices downward by 8% effective August 2025, in line with lower JKM spot prices. This benefits gas distribution companies (SNGP, SSGC) by reducing input cost and improving cost recovery ratios.</p>

<h2>Circular Debt Impact</h2>
<p>Lower RLNG prices reduce the per-unit generation cost for RLNG-based IPPs, potentially trimming capacity payment obligations and slowing the circular debt accumulation rate. However, structural issues remain.</p>

<h2>Investment Implications</h2>
<p>PSO benefits from lower RLNG procurement cost and improved LNG cargo economics. SNGP's recovery ratio improves, supporting dividend sustainability. We maintain BUY on PSO (TP Rs 380) and SSGC (TP Rs 22).</p>
    `,
  },
  {
    id: 5,
    slug: 'kse100-weekly-technical-outlook',
    title: 'KSE-100 Weekly Technical Outlook',
    team: 'Technical',
    date: '2025-08-16',
    readTime: '5 min',
    summary: 'KSE-100 approaching strong resistance at 118,000. RSI divergence forming. Key support levels, breakout scenarios, and trade setups for the week.',
    tags: ['KSE-100', 'RSI', 'Support & Resistance'],
    featured: true,
    body: `
<h2>Weekly Chart Overview</h2>
<p>The KSE-100 closed at 117,340 on Friday, up 1.8% for the week. The index is now testing a key horizontal resistance at 118,000 — a level that capped upside twice in May and June 2025.</p>

<h2>RSI Divergence</h2>
<p>The 14-period RSI on the daily chart is showing a bearish divergence — price making a higher high while RSI forms a lower high at 68. This signals fading momentum and increases the probability of a short-term pullback.</p>

<h2>Key Levels</h2>
<ul>
  <li><strong>Resistance:</strong> 118,000 | 120,500 (all-time high)</li>
  <li><strong>Support:</strong> 115,200 (20-DMA) | 112,500 (50-DMA)</li>
</ul>

<h2>Trade Setup</h2>
<p><strong>Bullish Breakout:</strong> A daily close above 118,500 with volume > 30-day avg targets 122,000–124,000.</p>
<p><strong>Pullback Scenario:</strong> Failure to break 118,000 this week opens a retest of 115,200. This would be a buying opportunity for medium-term investors.</p>
    `,
  },
  {
    id: 6,
    slug: 'engro-cup-handle-breakout',
    title: 'ENGRO — Cup & Handle Breakout in Progress',
    team: 'Technical',
    date: '2025-08-12',
    readTime: '4 min',
    summary: 'ENGRO completing a 14-week cup-and-handle pattern on the weekly chart. Volume confirmation observed. Target and stop-loss levels defined.',
    tags: ['ENGRO', 'Chart Pattern', 'Breakout'],
    body: `
<h2>Pattern Identification</h2>
<p>ENGRO has formed a textbook cup-and-handle pattern on the weekly chart spanning 14 weeks (May–August 2025). The cup base was formed at Rs 285 and the handle is tightening between Rs 315–325.</p>

<h2>Volume Confirmation</h2>
<p>Volume surged 2.4x the 30-day average during the breakout attempt on August 10, confirming institutional accumulation. This is a strong bullish signal consistent with classic Wyckoff accumulation.</p>

<h2>Target & Stop-Loss</h2>
<ul>
  <li><strong>Breakout level:</strong> Rs 328 (handle high)</li>
  <li><strong>Price target:</strong> Rs 370 (cup depth added to breakout point)</li>
  <li><strong>Stop-loss:</strong> Rs 310 (below handle low)</li>
  <li><strong>Risk-Reward:</strong> 1:3</li>
</ul>
    `,
  },
  {
    id: 7,
    slug: 'hbl-golden-cross-daily-chart',
    title: 'HBL — Golden Cross Signal on Daily Chart',
    team: 'Technical',
    date: '2025-08-08',
    readTime: '3 min',
    summary: '50-DMA has crossed above 200-DMA for HBL, generating a classic golden cross. Historical performance of similar setups on PSX banking stocks.',
    tags: ['HBL', 'Moving Averages', 'Golden Cross'],
    body: `
<h2>Signal Description</h2>
<p>HBL's 50-day moving average crossed above its 200-day moving average on August 7, 2025, generating a golden cross signal. The stock closed at Rs 178, up 2.3% on that day.</p>

<h2>Historical Context</h2>
<p>Back-testing golden cross signals on HBL over the past 10 years shows an average forward return of +18% over the following 3 months in 7 out of 9 instances. The two negative instances occurred during broad market crashes.</p>

<h2>Setup</h2>
<ul>
  <li><strong>Entry:</strong> Rs 178–182 (current range)</li>
  <li><strong>Target 1:</strong> Rs 195 (prior resistance)</li>
  <li><strong>Target 2:</strong> Rs 215 (52-week high)</li>
  <li><strong>Stop-loss:</strong> Rs 168 (below 50-DMA)</li>
</ul>
    `,
  },
  {
    id: 8,
    slug: 'sector-rotation-inflows-textile',
    title: 'Sector Rotation: Inflows Moving to Textile',
    team: 'Technical',
    date: '2025-07-30',
    readTime: '6 min',
    summary: 'Relative strength analysis shows capital rotating out of defensive sectors into textile exporters ahead of PKR stabilisation trade.',
    tags: ['Sector Rotation', 'Textile', 'Relative Strength'],
    body: `
<h2>Relative Strength Analysis</h2>
<p>The KSE-Textile index has outperformed the KSE-100 by 8.3% over the past 30 days. This divergence signals institutional rotation from defensive sectors (Utilities, FMCG) into export-oriented textile names.</p>

<h2>Macro Driver</h2>
<p>PKR stabilisation at 280–285/USD, combined with declining cotton prices, is improving textile exporters' margins. US apparel import demand remains robust, supporting order book growth.</p>

<h2>Top Rotational Picks</h2>
<ul>
  <li><strong>Interloop (ILP):</strong> Breaking out of a 3-month base. Target Rs 115.</li>
  <li><strong>Nishat Mills (NML):</strong> Relative strength rank #3 in the sector. Target Rs 95.</li>
  <li><strong>Gul Ahmed (GATM):</strong> Volume accumulation visible. Target Rs 52.</li>
</ul>
    `,
  },
  {
    id: 9,
    slug: 'luck-fy25-results-fy26-estimates',
    title: 'LUCK — FY25 Results Review & FY26 Estimates',
    team: 'Fundamental',
    date: '2025-08-14',
    readTime: '11 min',
    summary: 'FY25 EPS came in at Rs 84.2, beating estimates by 7%. Revised FY26 earnings model, DCF valuation, and updated price target of Rs 1,250.',
    tags: ['LUCK', 'Earnings Review', 'DCF', 'Price Target'],
    featured: true,
    body: `
<h2>FY25 Results Summary</h2>
<p>Lucky Cement reported FY25 EPS of Rs 84.2, a 7% beat vs. our estimate of Rs 78.7. Revenue grew 14% YoY to Rs 142 Bn, driven by higher retention prices and a 9% increase in domestic dispatches. EBITDA margin expanded 210bps to 28.4%.</p>

<h2>Key Positives</h2>
<ul>
  <li>Coal cost per ton fell Rs 320 vs. FY24 as international coal prices normalised.</li>
  <li>Iraq export operation turned profitable for the first time, contributing Rs 3.2 Bn to EBIT.</li>
  <li>Final dividend of Rs 20/share declared, taking FY25 total DPS to Rs 32 (yield: 2.9%).</li>
</ul>

<h2>FY26 Earnings Model</h2>
<p>We revise FY26 EPS estimate upward to Rs 96 (from Rs 89) reflecting: (1) further coal cost normalisation, (2) higher domestic dispatch volume of +8% YoY, and (3) incremental Iraq contribution.</p>

<h2>Valuation & Target Price</h2>
<p>Our DCF model (WACC: 14.5%, terminal growth: 3%) yields a fair value of Rs 1,280. We set our 12-month target price at Rs 1,250, implying 14% upside from current levels. Rating: <strong>BUY</strong>.</p>

<h2>Risks</h2>
<ul>
  <li>Cement price war if capacity additions outpace demand.</li>
  <li>PKR depreciation increasing imported coal costs.</li>
  <li>Iraq operation disruption.</li>
</ul>
    `,
  },
  {
    id: 10,
    slug: 'mari-gas-reserve-upgrade-valuation',
    title: 'MARI Gas — Reserve Upgrade & Valuation',
    team: 'Fundamental',
    date: '2025-08-09',
    readTime: '9 min',
    summary: 'Newly certified reserves add 15% upside to our NAV estimate. Full model update with revised production profile and SRO pricing assumptions.',
    tags: ['MARI', 'NAV', 'Reserves', 'Gas'],
    body: `
<h2>Reserve Upgrade</h2>
<p>Mari Petroleum has announced newly certified 2P reserves of 5.8 TCF (trillion cubic feet), up from 5.0 TCF previously certified in 2022. The upgrade primarily reflects successful appraisal drilling at the Sukkur block.</p>

<h2>NAV Impact</h2>
<p>Applying our long-run gas price assumption of $3.5/MMBtu and a 12% discount rate, the reserve upgrade adds Rs 180/share to our NAV estimate, taking total NAV to Rs 1,650/share (previously Rs 1,430).</p>

<h2>Production Profile</h2>
<p>Management targets daily production of 680 MMCFD by FY27 (vs. current 580 MMCFD), supported by new well completions. This growth profile strengthens the dividend outlook.</p>

<h2>Rating</h2>
<p>We upgrade MARI to <strong>BUY</strong> (from Hold) with a revised target price of Rs 1,580, implying 12% upside. The stock offers a 4.2% dividend yield on our FY26 DPS estimate of Rs 55.</p>
    `,
  },
  {
    id: 11,
    slug: 'mcb-bank-initiating-coverage-buy',
    title: 'MCB Bank — Initiating Coverage: BUY',
    team: 'Fundamental',
    date: '2025-08-03',
    readTime: '14 min',
    summary: 'Initiating coverage on MCB with a BUY rating. Strong CASA base, below-peer NPL ratio, and rising dividend yield make it a top pick in the banking space.',
    tags: ['MCB', 'Initiation', 'BUY', 'Banking'],
    body: `
<h2>Investment Thesis</h2>
<p>We initiate coverage on MCB Bank with a BUY rating and a 12-month target price of Rs 450, implying 24% upside from the current price of Rs 362. MCB is our top pick in the banking sector for three reasons: (1) industry-leading CASA ratio, (2) best-in-class asset quality, and (3) sustainable dividend yield.</p>

<h2>CASA Strength</h2>
<p>MCB's CASA ratio stands at 92%, the highest among large-cap banks. This provides a structural cost-of-fund advantage that will become even more valuable as interest rates decline and NIM compression affects peers more severely.</p>

<h2>Asset Quality</h2>
<p>NPL ratio of 5.2% vs. industry average of 8.7%. Coverage ratio of 115% provides a comfortable buffer. We expect MCB to avoid the provisioning cycle that will pressure some peers as the economic cycle turns.</p>

<h2>Dividend Outlook</h2>
<p>MCB has paid uninterrupted dividends for 25 consecutive years. We forecast DPS of Rs 28 in FY25 and Rs 32 in FY26, implying a forward dividend yield of 7.7–8.8% — attractive on an absolute and relative basis.</p>

<h2>Valuation</h2>
<p>MCB trades at 1.1x FY26E P/B vs. peer average of 0.9x — a premium justified by superior ROE of 28% vs. peer average of 21%. Our Gordon Growth Model (ROE: 28%, cost of equity: 18%, growth: 8%) yields a fair P/B of 1.33x, or Rs 450/share.</p>

<h2>Key Risks</h2>
<ul>
  <li>Aggressive rate cuts reducing investment income faster than expected.</li>
  <li>Macro deterioration increasing NPLs in the SME segment.</li>
  <li>Regulatory capital requirements tightening dividend payout.</li>
</ul>
    `,
  },
  {
    id: 12,
    slug: 'ogdc-cashflow-receivables-deep-dive',
    title: 'OGDC — Quarterly Cash Flow & Receivables Deep-Dive',
    team: 'Fundamental',
    date: '2025-07-25',
    readTime: '8 min',
    summary: 'Analysing Rs 340Bn+ in outstanding receivables, expected recovery timeline, and impact on dividend sustainability over the next 3 years.',
    tags: ['OGDC', 'Cash Flow', 'Receivables', 'Dividend'],
    body: `
<h2>Receivables Problem</h2>
<p>OGDC's trade receivables stood at Rs 343 Bn as of Q4 FY25, equivalent to 14 months of revenue. The bulk (Rs 290 Bn) is owed by power sector entities — primarily DISCOs and CPPs — within the circular debt chain.</p>

<h2>Recovery Timeline</h2>
<p>The government's Circular Debt Management Plan (CDMP-II) targets clearing Rs 200 Bn of OGDC's receivables by June 2026 through a combination of PIBs, cash payments, and debt-equity swaps. We model a conservative Rs 120 Bn recovery in FY26.</p>

<h2>Cash Flow Impact</h2>
<p>Even with partial recovery, OGDC's operating cash conversion remains low at 45%. Free cash flow is expected at Rs 42 Bn in FY26, down from Rs 58 Bn in FY24 due to higher capex on exploration wells.</p>

<h2>Dividend Sustainability</h2>
<p>OGDC paid Rs 8.5 DPS in FY25. We believe this is sustainable through FY27 even under our conservative receivables recovery scenario, as the company has Rs 18 Bn in cash on balance sheet and committed credit facilities of Rs 30 Bn.</p>

<h2>Rating</h2>
<p>We maintain <strong>HOLD</strong> on OGDC (TP Rs 145). The receivables risk is a known overhang, but the 8.5% dividend yield provides downside support. Upgrade trigger: accelerated CDMP implementation.</p>
    `,
  },
]
