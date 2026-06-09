# Research Report — Almond Market & Go-To-Market

> **Audience: founders + downstream agents.** Verified findings from a deep-research pass (31 sources
> fetched, 145 claims extracted, top 25 adversarially verified → 18 confirmed, 7 killed). Pairs with
> `../tiered-feature-roadmap/` (the product + pricing build plan).

| Field | Value |
|---|---|
| Goal | What to build + how to win clients, for SMB dental/medical front-office (serving: land first pilots, win investor John, build a repeatable motion) |
| As of | 2026-06-09 |
| What Almond is | System-of-engagement layer atop the PMS/EHR: lead/missed-call capture → online booking → intake forms that write a PDF back to the chart → two-way messaging, synced via a canonical connector (Open Dental live; Denticon/NextGen planned) |
| Overall confidence | High on competitive/market facts; Medium on exact pricing (third-party/quote-gated) |

---

## 1. The uncomfortable truth (lead with this)
The thing we assumed was the moat — *"digital intake that writes a PDF back into the chart"* — is **not differentiation**. **NexHealth** already does Almond's exact loop (booking → intake write-back → messaging → payments) across ~70 marketed PMS/EHRs (≈14–15 documented, **including all three of our roadmap targets** — Open Dental, Denticon, NextGen), runs **10,000+ practices** (corroborated by Stripe), and raised a **$125M Series C at a ~$1B valuation (April 2022)**. Verification *killed* the hopeful claim that "broad PMS support is white space" — it isn't.

**So the wedge is price, focus, and ease — not capability.** NexHealth's own users churn on cost ("kept going up until became unaffordable," ~$350/mo starting). The defensible pitch is **"all of NexHealth's core loop, dental-first, ~half the price, white-glove onboarding"** — a framing that survives an investor's scrutiny, unlike "nobody does this."

## 2. Verified demand (the deck backbone)
- **Self-scheduling demand ≫ supply:** only **11%** of medical groups have a majority of patients self-scheduling; **73%** have ≤25% digital-scheduling adoption (MGMA, Nov 2024, n=318) — against **89%** of patients valuing anytime online scheduling vs **63%** of providers offering/planning it (Experian Health 2024). *This is the single best-sourced demand fact we have.*
- **Market size:** ~**$166B US dental *services*** market, **200,000+** dentists, **~130–135k** practices, highly fragmented. ⚠️ **This is the services market, NOT a software TAM — never present it as Almond's addressable market.**
- **Consolidation tailwind:** DSOs ~23% of offices (2022) → **forecast 39% by 2026** (L.E.K. 2023); solo-practice ownership fell **66.5% (2001) → 46.2% (2021)**. Use the *2024* consolidation figure (~16–25%), not the stale "10%."

## 3. Competitive landscape
| Competitor | What it is | Pricing (as found) | Weakness / opening |
|---|---|---|---|
| **NexHealth** | The incumbent; same loop, broad PMS coverage | ~$350/mo start; quote-gated | **Churns on price**; generic, not dental-deep |
| **Podium** | Reviews + messaging + payments | ~$399 Core / ~$599 Pro (third-party; $500–800 loaded) | Quote-gated; weaker PMS write-back |
| **Weave** | Phones + comms + payments | from ~$249; mid-$300s Elite; +$750 setup | Per-location caps; phone-centric |
| **Tebra** (Kareo+PatientPop) | EHR + billing + engagement | **per-provider** (~$49–$799/provider/mo) | Per-provider pricing; EHR-anchored |
| **RevenueWell** | Dental engagement | from ~$189 | Smaller; cheaper entry (price pressure) |
| Not verified this pass | Solutionreach, Dental Intelligence, Adit, Yapi, Doctible, Phreesia, Luma, Artera, Jarvis | — | **Open competitive-map gap** |

**Where Almond wins:** lower price, dental-first depth (eligibility, recall), frictionless onboarding for the *small independent* practice NexHealth prices out — **not** chart write-back.

## 4. Integration / distribution
- **Build-ON Open Dental directly = cheapest, already live.** Free dev registration, 1–3 day approval, no rev-share — but not free at scale (~$199/mo/location → $149 after 12 months).
- **Aggregators buy breadth at a cost:** Sikka $35–$175/loc/mo **+ $350/mo license**, 400+ integrations, ~90% retail-healthcare coverage (vendor marketing). NexHealth Synchronizer covers our 3 targets instantly but means *building on a competitor*.
- **Recommendation:** stay direct (Open Dental → Denticon/NextGen) for cost + data control; rent an aggregator only if speed-to-breadth becomes a deal-blocker.

## 5. Trust / compliance as a sales lever
SMB practices and especially DSOs require a signed **BAA**, often **SOC 2**, before software touches PHI. Stripe will **not** sign a BAA (keep PHI out of Stripe; use a payments BAA vendor for PHI-linked pay). This gates the premium features (AI voice, payments, reviews-touching-PII, eligibility) behind an enterprise/compliance tier. *(This theme was only lightly covered — flagged open.)*

## 6. Prioritized shortlist
**Top 5 product additions** (tag = objective):
1. AI receptionist / missed-call-text-back + after-hours booking — *pilot · investor · scale*
2. Automated reminders + recall + waitlist auto-fill (no-show reduction) — *pilot*
3. Two-way SMS unified inbox (table stakes) — *pilot*
4. Reputation / Google-review automation (proven willingness-to-pay) — *pilot · scale*
5. Text-to-pay / payments + insurance eligibility (dental-depth) — *scale*

**Top 5 GTM moves:**
1. Price-wedge positioning vs NexHealth ("full loop, dental-first, ~half the price") — *pilot · scale*
2. Convert Joel's warm practices as **paid pilots with an ROI guarantee** — *pilot*
3. Lead with Open Dental; get listed in PMS ecosystems/marketplaces to lower CAC — *pilot · scale*
4. Land-and-expand into DSOs/groups (ride consolidation) — *investor · scale*
5. Turn first 3–5 pilots into hard-number case studies for a referral motion — *scale*

## 7. Open questions (not verified — close before the investor deck)
- The **no-show $-cost** and **% of calls missed** / recovered-revenue stats (sources fetched, figures unverified).
- **Software SAM** (not services TAM) + 2024–26 vertical-healthtech SaaS funding comps/multiples.
- The **full competitor map** (the 9 vendors above).
- **Compliance buying-gate** (BAA/SOC2 close-rate impact) — lightly covered only.

## 8. Sources (key, verified)
- MGMA Stat (Nov 5 2024) — mgma.com/mgma-stat/putting-the-power-of-scheduling-into-patients-hands
- Experian Health State of Patient Access 2024 — experian.com/blogs/healthcare/the-state-of-patient-access-2024/
- NexHealth supported systems / partner program / Series C — docs.nexhealth.com/docs/supported-health-record-systems · nexhealth.com/partner-program · stripe.com/customers/nexhealth
- Podium pricing — podium.com/getpricing (+ third-party trackers)
- Tebra pricing — tebra.com/pricing
- Open Dental API — opendental.com/site/apisetup.html · /fees.html
- Sikka — sikka.ai/oneapi · sikkasoft.com/api-packages
- OMERS Ventures dental software thesis — medium.com/omers-ventures (drilling-into-trends)
- L.E.K. US Dental Outlook 2023 — lek.com/insights/hea/us/ar/outlook-us-dental-industry
- ADA Health Policy Institute — ada.org/resources/research/health-policy-institute/dentist-workforce

> **Killed in verification (do not use):** NexHealth coverage is *not* limited to a few dental PMS (it's broad); Tebra *does* publish per-provider pricing; the "2025 Series C / Buckley Ventures" claim is false (the real event is the $125M Series C at ~$1B, April 2022).
