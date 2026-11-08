# SIP Continuity Discovery Engine Dashboard

An interactive discovery engine dashboard analyzing why first-time mutual fund investors keep or stop their Systematic Investment Plans (SIPs) in their first year.

## Features

- **Overview Funnel & Findings**: Key metrics, 5-line summary, and data progression from 1.63M public records to strict early-journey episodes.
- **Nine Questions**: Interactive breakdown of investor motivations, expectations, check frequency, in-app friction, and continuation reasons with Wilson 95% confidence intervals on Kish effective sample sizes.
- **Opportunity Areas**: Quantitative analysis of five primary levers (Payment & AutoPay friction, Order/money status and support resolution, Returns expectations wobble, Cash-flow shocks, and SIP control).
- **Story Explorer**: Search and filter through thousands of early-journey investor stories with verbatim evidence quotes and grounded categorical spans.
- **AI Evidence Log**: Full audit log detailing corpus coverage, held-out golden set evaluation, Sonnet and cross-family reliability audits, and transparent reporting of corrected/rejected AI prompts and outputs.
- **Try the Engine**: Interactive test interface allowing live or cached analysis of investor texts with grounded extraction.

## Rebuilding the Site Data

To rebuild `site/data/*.json` and `site/data/evidence.md` from analysis exports and corpus definitions:

```bash
python tools/build_site_data.py
```

## Running the Web Application

The site is built with Next.js (App Router), Tailwind CSS, and TypeScript.

```bash
cd site
npm install
npm run build
npm run start
```
