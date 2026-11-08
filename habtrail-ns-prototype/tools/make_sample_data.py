#!/usr/bin/env python3
"""Generate SAMPLE data in the prototype's data contract (see docs/DATA_CONTRACT.md).

Nothing here is measured or modelled from real observations. Fields are smooth
synthetic surfaces with a seasonal (November) baseline, an estuarine gradient,
and a bloom hotspot that grows over the 3-day forecast, so every UI state
(all five classes, all four pixel types, alerts, closures) can be exercised.

When the real pipeline exists it must write the same files:
    data/meta.json
    data/layers/<layer>/<YYYY-MM-DD>.json   -> {"v":[...], "t":[...]}  (aligned to data/grid.json)
    data/layers/interdictions/<YYYY-MM-DD>.json

Usage:  python3 tools/make_sample_data.py [--start YYYY-MM-DD]
"""
import argparse
import json
import math
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OBS, MOD, INT, KRI = 0, 1, 2, 3


def now_halifax():
    try:
        from zoneinfo import ZoneInfo
        return datetime.now(ZoneInfo("America/Halifax"))
    except Exception:  # tzdata missing: fall back to a fixed UTC-4 (ADT/AST ambiguity is irrelevant for sample data)
        return datetime.now(timezone(timedelta(hours=-4)))


# --- class definitions: min inclusive, max exclusive; colours follow the ramp of the Portuguese reference app ---
RED, ORANGE, YELLOW, GREEN, TEAL, GREY = "#ef4444", "#f59e0b", "#facc15", "#34d058", "#19c3b1", "#8b95a5"


def classes(spec):
    """spec: list of (id, label_en, label_fr, min, max, colour) from highest to lowest severity."""
    return [{"id": i, "label_en": en, "label_fr": fr, "min": lo, "max": hi, "color": c} for i, en, fr, lo, hi, c in spec]


INF = None  # JSON null = unbounded
LAYERS = [
    {
        "id": "interdictions", "type": "table",
        "label_en": "Shellfish closures (sample)", "label_fr": "Fermetures de mollusques (exemple)",
        "footnote_en": "Closures here are synthetic. Real closures come from the regulator.",
        "footnote_fr": "Ces fermetures sont synthétiques. Les vraies fermetures viennent de l'autorité réglementaire.",
    },
    {
        "id": "bloom", "type": "pixels", "summary": "p90", "unit": "%", "decimals": 0,
        "label_en": "Bloom risk", "label_fr": "Risque de PAN",
        "legend_title_en": "HAB Probability", "legend_title_fr": "Probabilité de PAN",
        "tooltip_en": "Bloom risk", "tooltip_fr": "Risque de PAN",
        "footnote_en": "*HAB: Harmful Algal Bloom", "footnote_fr": "*PAN : prolifération d'algues nuisibles",
        "classes": classes([
            ("very_high", "Very High", "Très élevée", 90, INF, RED),
            ("high", "High", "Élevée", 70, 90, ORANGE),
            ("moderate", "Moderate", "Modérée", 50, 70, YELLOW),
            ("low", "Low", "Faible", 25, 50, GREEN),
            ("very_low", "Very Low", "Très faible", INF, 25, TEAL),
        ]),
    },
    {
        "id": "chla", "type": "pixels", "summary": "p90", "unit": "mg/m³", "decimals": 2,
        "label_en": "Chlorophyll-a", "label_fr": "Chlorophylle a",
        "legend_title_en": "Chlorophyll-a", "legend_title_fr": "Chlorophylle a",
        "tooltip_en": "Chl-a", "tooltip_fr": "Chl a",
        "footnote_en": "", "footnote_fr": "",
        "classes": classes([
            ("very_high", "Very High", "Très élevée", 15, INF, RED),
            ("high", "High", "Élevée", 8, 15, ORANGE),
            ("moderate", "Moderate", "Modérée", 4, 8, YELLOW),
            ("low", "Low", "Faible", INF, 4, GREEN),
        ]),
    },
    {
        "id": "sst", "type": "pixels", "summary": "mean", "unit": "°C", "decimals": 1,
        "label_en": "SST", "label_fr": "TSM",
        "legend_title_en": "SST", "legend_title_fr": "TSM",
        "tooltip_en": "SST", "tooltip_fr": "TSM",
        "footnote_en": "*SST: Sea Surface Temperature", "footnote_fr": "*TSM : température de surface de la mer",
        "classes": classes([
            ("very_high", "Very High", "Très élevée", 10.5, INF, RED),
            ("high", "High", "Élevée", 10, 10.5, ORANGE),
            ("moderate", "Moderate", "Modérée", 9.5, 10, YELLOW),
            ("low", "Low", "Faible", INF, 9.5, GREEN),
        ]),
    },
    {
        "id": "salinity", "type": "pixels", "summary": "mean", "unit": "PSU", "decimals": 1,
        "label_en": "Salinity", "label_fr": "Salinité",
        "legend_title_en": "Salinity", "legend_title_fr": "Salinité",
        "tooltip_en": "Salinity", "tooltip_fr": "Salinité",
        "footnote_en": "", "footnote_fr": "",
        "classes": classes([
            ("high", "Marine", "Marine", 31, INF, TEAL),
            ("moderate", "Brackish-marine", "Saumâtre-marine", 29.5, 31, GREEN),
            ("low", "Brackish", "Saumâtre", 27, 29.5, YELLOW),
            ("very_low", "Fresher", "Plus douce", INF, 27, ORANGE),
        ]),
    },
    {
        "id": "wqi", "type": "pixels", "summary": "p10", "unit": "", "decimals": 0,
        "label_en": "Water Quality Index", "label_fr": "Indice de qualité de l'eau",
        "legend_title_en": "Water Quality Index", "legend_title_fr": "Indice de qualité de l'eau",
        "tooltip_en": "WQI", "tooltip_fr": "IQE",
        "footnote_en": "Index 0–100, higher is better.", "footnote_fr": "Indice 0–100, plus élevé = meilleur.",
        "classes": classes([
            ("excellent", "Excellent", "Excellente", 80, INF, TEAL),
            ("good", "Good", "Bonne", 60, 80, GREEN),
            ("fair", "Fair", "Passable", 40, 60, YELLOW),
            ("poor", "Poor", "Mauvaise", 20, 40, ORANGE),
            ("very_poor", "Very Poor", "Très mauvaise", INF, 20, RED),
        ]),
    },
    {
        "id": "sediments", "type": "pixels", "summary": "p90", "unit": "mg/L", "decimals": 1,
        "label_en": "Sediments", "label_fr": "Sédiments",
        "legend_title_en": "Suspended Matter", "legend_title_fr": "Matières en suspension",
        "tooltip_en": "Suspended matter", "tooltip_fr": "Matières en suspension",
        "footnote_en": "", "footnote_fr": "",
        "classes": classes([
            ("very_high", "Very High", "Très élevée", 20, INF, RED),
            ("high", "High", "Élevée", 10, 20, ORANGE),
            ("moderate", "Moderate", "Modérée", 5, 10, YELLOW),
            ("low", "Low", "Faible", INF, 5, GREEN),
        ]),
    },
]

SPECIES = [
    {"id": "blue_mussel", "name_en": "Blue mussel", "name_fr": "Moule bleue", "threshold": 70},
    {"id": "soft_shell_clam", "name_en": "Soft-shell clam", "name_fr": "Mye commune", "threshold": 70},
    {"id": "eastern_oyster", "name_en": "Eastern oyster", "name_fr": "Huître américaine", "threshold": 70},
    {"id": "razor_clam", "name_en": "Atlantic razor clam", "name_fr": "Couteau de l'Atlantique", "threshold": 75},
    {"id": "quahog", "name_en": "Ocean quahog", "name_fr": "Praire", "threshold": 85},
    {"id": "sea_scallop", "name_en": "Sea scallop", "name_fr": "Pétoncle géant", "threshold": 90},
]
ZONE_SPECIES = {
    "BDB": ["blue_mussel", "soft_shell_clam"],
    "NWA": ["blue_mussel", "soft_shell_clam"],
    "INH": ["blue_mussel"],
    "OUH": ["blue_mussel", "soft_shell_clam", "quahog"],
    "EAP": ["blue_mussel", "soft_shell_clam", "eastern_oyster", "razor_clam"],
    "APR": ["blue_mussel", "razor_clam", "quahog", "sea_scallop"],
}
# species that are permanently closed in a zone in the sample (so the table shows a mix of states on day 0)
ALWAYS_CLOSED = {("APR", "razor_clam"), ("INH", "blue_mussel"), ("EAP", "razor_clam")}


def local_km(lon, lat, lon0=-63.55, lat0=44.62):
    return (lon - lon0) * math.cos(math.radians(lat0)) * 111.32, (lat - lat0) * 110.57


def smooth_noise(rng, K):
    z = K @ rng.standard_normal(K.shape[0])
    return (z - z.mean()) / (z.std() + 1e-9)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", help="first forecast date YYYY-MM-DD (default: today, Halifax)")
    args = ap.parse_args()
    gen = now_halifax()
    start = date.fromisoformat(args.start) if args.start else gen.date()
    dates = [(start + timedelta(days=i)).isoformat() for i in range(4)]
    rng = np.random.default_rng(int(start.strftime("%Y%m%d")))

    grid = json.loads((ROOT / "data/grid.json").read_text())
    lon, lat = np.array(grid["lon"]), np.array(grid["lat"])
    zone_code = [grid["zones"][i] for i in grid["zone"]]
    n = len(lon)
    X, Y = (np.array(a) for a in zip(*[local_km(a, b) for a, b in zip(lon, lat)]))

    # spatial smoothing kernel (0.8 km length scale) used for coherent noise and for blending zone baselines
    d = np.hypot(X[:, None] - X[None, :], Y[:, None] - Y[None, :])
    K = np.exp(-0.5 * (d / 0.8) ** 2); K /= K.sum(1, keepdims=True)
    K2 = np.exp(-0.5 * (d / 1.6) ** 2); K2 /= K2.sum(1, keepdims=True)

    # estuarine gradient g: 1 = enclosed / fresher / more productive, 0 = open coast
    zone_g = {"BDB": 1.0, "NWA": 0.9, "INH": 0.85, "EAP": 0.55, "OUH": 0.5, "APR": 0.12}
    g = K2 @ np.array([zone_g[z] for z in zone_code])
    g = np.clip(g, 0, 1)

    def blob(cx, cy, sigma_km):
        bx, by = local_km(cx, cy)
        return np.exp(-0.5 * (((X - bx) ** 2 + (Y - by) ** 2) / sigma_km ** 2))

    hot_bdb = blob(-63.640, 44.700, 1.9)    # Bedford Basin bloom
    hot_col = blob(-63.425, 44.672, 1.5)    # Cole Harbour patch
    amp_bdb = [34, 46, 58, 68]
    amp_col = [10, 16, 24, 30]

    base_noise = smooth_noise(rng, K)
    # day-0 cloud gaps -> INT near gap edges, KRI in gap cores; a few scattered INT pixels
    t0 = np.full(n, OBS)
    for _ in range(3):
        c = rng.integers(0, n); r = rng.uniform(1.6, 2.6)
        dist = np.hypot(X - X[c], Y - Y[c])
        t0[dist < r] = INT
        t0[dist < r * 0.55] = KRI
    t0[(rng.random(n) < 0.04) & (t0 == OBS)] = INT

    values = {k: [] for k in ("bloom", "chla", "sst", "salinity", "wqi", "sediments")}
    types = []
    for day in range(4):
        nz = 0.85 * base_noise + 0.5 * smooth_noise(rng, K)
        nz2 = smooth_noise(rng, K)
        hab = 7 + 20 * g + 5 * nz + amp_bdb[day] * hot_bdb + amp_col[day] * hot_col
        hab = np.clip(hab, 1, 99)
        excess = np.clip(hab - 20, 0, None)
        chla = np.clip(0.8 + 2.2 * g + 0.15 * excess + 0.45 * nz, 0.1, 40)
        sst = np.clip(10.4 - 1.5 * g + 0.12 * day + 0.28 * nz2, 4, 20)
        sal = np.clip(31.9 - 3.4 * g + 0.25 * nz, 20, 35)
        wqi = np.clip(92 - 30 * g - 0.55 * excess + 3 * nz2, 4, 99)
        inh_boost = np.array([2.0 if z in ("INH", "NWA") else 0.0 for z in zone_code])
        sed = np.clip(1.4 + 4.2 * g + inh_boost + 0.8 * nz, 0.2, 30)
        values["bloom"].append(np.round(hab).astype(int))
        values["chla"].append(np.round(chla, 2)); values["sst"].append(np.round(sst, 1))
        values["salinity"].append(np.round(sal, 1)); values["wqi"].append(np.round(wqi).astype(int))
        values["sediments"].append(np.round(sed, 1))
        types.append(t0 if day == 0 else np.full(n, MOD))

    out = ROOT / "data/layers"
    for lid, per_day in values.items():
        (out / lid).mkdir(parents=True, exist_ok=True)
        for day, arr in enumerate(per_day):
            payload = {"layer": lid, "date": dates[day], "v": arr.tolist(), "t": types[day].tolist()}
            (out / lid / f"{dates[day]}.json").write_text(json.dumps(payload, separators=(",", ":")))

    # --- shellfish closures (sample): driven by the zone's peak HAB probability, sticky over the horizon ---
    (out / "interdictions").mkdir(parents=True, exist_ok=True)
    sp_thr = {s["id"]: s["threshold"] for s in SPECIES}
    closed_prev = {}
    for day in range(4):
        zone_max = {}
        for z, h in zip(zone_code, values["bloom"][day]):
            zone_max[z] = max(zone_max.get(z, 0), int(h))
        payload = {}
        for z, species in ZONE_SPECIES.items():
            payload[z] = {}
            for s in species:
                closed = zone_max.get(z, 0) >= sp_thr[s] or (z, s) in ALWAYS_CLOSED or closed_prev.get((z, s), False)
                payload[z][s] = int(closed)
                closed_prev[(z, s)] = closed
        (out / "interdictions" / f"{dates[day]}.json").write_text(json.dumps({"layer": "interdictions", "date": dates[day], "zones": payload}, separators=(",", ":")))

    # prune files for dates that have rolled off the 4-day window
    for layer_dir in out.iterdir():
        if layer_dir.is_dir():
            for f in layer_dir.glob("*.json"):
                if f.stem not in dates:
                    f.unlink()

    stamp = gen.isoformat(timespec="seconds")
    layer_meta = []
    for L in LAYERS:
        m = dict(L)
        m["updated"] = stamp
        m["source"] = "SAMPLE (synthetic)"
        layer_meta.append(m)
    meta = {
        "schema": 1,
        "dataset": {
            "kind": "sample",
            "name": "Halifax Harbour prototype — synthetic sample",
            "generated_at": stamp,
            "note": "All values are synthetic and for interface demonstration only. Not for operational or safety decisions.",
        },
        "dates": dates,
        "pixel_m": grid["pixel_m"],
        "pixel_types": {"OBS": OBS, "MOD": MOD, "INT": INT, "KRI": KRI},
        "layers": layer_meta,
        "species": SPECIES,
        "zone_species": ZONE_SPECIES,
        "map": {"center": [-63.53, 44.60], "zoom": 10.4, "bounds": [[-63.74, 44.45], [-63.34, 44.78]]},
    }
    (ROOT / "data/meta.json").write_text(json.dumps(meta, indent=1, ensure_ascii=False))

    print("dates:", dates)
    for lid in values:
        a = np.concatenate([x.astype(float) for x in values[lid]])
        print(f"  {lid:10s} min {a.min():7.2f}  mean {a.mean():7.2f}  max {a.max():7.2f}")
    h = values["bloom"]
    for day in range(4):
        print(f"  day {day}: HAB>=70% pixels: {(h[day] >= 70).sum()}, >=90%: {(h[day] >= 90).sum()}")
    print("  types day0:", {k: int((t0 == v).sum()) for k, v in (("OBS", OBS), ("INT", INT), ("KRI", KRI))})


if __name__ == "__main__":
    main()
