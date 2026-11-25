# Clinical Team Visit Forecast

Interactive monthly visit forecast across **DHA/PE4**, **DBS**, and **VISTA** for USC CPBH clinical operations.

## Live site

After GitHub Pages is enabled:

**https://husseinyassinemd.github.io/visit-forecast/**

## What’s included

- Stacked monthly chart of estimated clinical visits (Nov 2026 – Oct 2027)
- KPI summary + backlog callout
- Filterable DHA/PE4 detail from Ivett’s Scheduling Notes tab
- DBS Year 3 / Year 4 pending visit detail
- VISTA enrollment snapshot and milestone pathway

## Local preview

```bash
cd docs
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).

## Data sources

| Study | Owner | Source |
|---|---|---|
| DHA / PE4 | Ivett Villarreal | PT Visit Tracker → Scheduling Notes |
| DBS | Clinical team | DBS Tracker → Completed Visits + Y3/Y4 Scheduling Notes |
| VISTA | Sahar | Verbal update (tracker TBD) |

As of **2026-11-25**.
