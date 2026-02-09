# Bb Budget

Personal budget tracker. Import bank CSVs, categorize transactions, track spending trends.

## Features
- **Transaction Review**: Import CSVs from Wells Fargo & SoFi, categorize each transaction
- **Monthly Summary**: Budget vs actual with progress bars per category
- **Trends**: Month-over-month charts for spending, income, and category breakdowns
- **Balances**: Log bi-monthly account balance snapshots, track liquid position over time
- **Credit Card Toggle**: View all expenses unified, or isolate credit card spending

## Setup

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

1. Push to GitHub
2. Go to Settings → Pages → Source: GitHub Actions
3. The workflow in `.github/workflows/deploy.yml` handles the rest

## Data

All data is stored in your browser's localStorage. Use Settings → Export Backup to save a JSON backup regularly.

## Tech
- Vite + React
- Tailwind CSS
- Recharts (charts)
- Papaparse (CSV parsing)
- localStorage (persistence)
