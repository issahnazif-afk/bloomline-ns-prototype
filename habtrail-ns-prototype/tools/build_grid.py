#!/usr/bin/env python3
"""Build the Halifax Harbour pixel grid and zone polygons.

Input : data/land_halifax.geojson   (GSHHG full-resolution land, see extract_coast.py)
Output: data/grid.json              (columnar pixel table, 300 m square pixels)
        data/zones.geojson          (water-only zone polygons, display geometry)

Everything is computed in UTM zone 20N (EPSG:32620) so that pixels are true
300 m x 300 m squares, then converted back to lon/lat for the web app.
Zones are rough, hand-defined regions (boxes in lon/lat) intersected with the
sea-connected water body. They are prototype zones, not an official scheme.
"""
import json
import sys
import warnings
from pathlib import Path

import numpy as np
import shapely
from pyproj import Transformer
from shapely.geometry import Point, box, shape, mapping
from shapely.ops import transform, unary_union

warnings.filterwarnings("ignore", category=DeprecationWarning)

ROOT = Path(__file__).resolve().parent.parent
PIXEL_M = 300.0
SHORE_BUFFER_M = 40.0          # pixel centres must sit this far from land
COAST_BAND_M = 4500.0          # keep water within this distance of land (coastal product, like the original)
SEA_SEED = (-63.45, 44.50)     # an offshore point, used to pick the sea-connected water

to_utm = Transformer.from_crs(4326, 32620, always_xy=True).transform
to_ll = Transformer.from_crs(32620, 4326, always_xy=True).transform

# (code, English name, French name, region box or list of boxes in lon/lat: W, S, E, N)
# Order matters: earlier zones claim water first.
ZONES = [
    ("BDB", "Bedford Basin",                  "Bassin de Bedford",              [(-63.72, 44.655, -63.622, 44.76), (-63.622, 44.676, -63.585, 44.76)]),
    ("NWA", "Northwest Arm",                  "Northwest Arm",                  (-63.64, 44.600, -63.571, 44.645)),
    ("INH", "Inner Harbour & The Narrows",    "Port intérieur et The Narrows",  (-63.62, 44.640, -63.50, 44.677)),
    ("EAP", "Eastern Passage & Cole Harbour", "Eastern Passage et Cole Harbour", (-63.50, 44.575, -63.38, 44.745)),
    ("OUH", "Outer Harbour & McNabs Island",  "Avant-port et île McNabs",       (-63.60, 44.575, -63.50, 44.642)),
    ("APR", "Harbour Approaches",             "Approches du port",              (-63.66, 44.470, -63.38, 44.575)),
]


def ll_poly(w, s, e, n):
    return transform(to_utm, box(w, s, e, n))


def region_poly(region):
    """A region is one (W, S, E, N) box or a list of boxes (their union)."""
    boxes = region if isinstance(region, list) else [region]
    return unary_union([ll_poly(*b) for b in boxes])


def main():
    land_ll = shape(json.loads((ROOT / "data/land_halifax.geojson").read_text())["features"][0]["geometry"])
    land = transform(to_utm, land_ll)

    # Study box (water is box minus land); keep only the sea-connected component.
    study = ll_poly(-63.72, 44.47, -63.38, 44.76)
    water = study.difference(land)
    seed = Point(*to_utm(*SEA_SEED))
    parts = [g for g in getattr(water, "geoms", [water])]
    sea_parts = [g for g in parts if g.buffer(1).contains(seed) or g.distance(seed) < 1]
    if not sea_parts:
        sys.exit("sea seed not inside water — check SEA_SEED")
    sea = unary_union(sea_parts)
    print(f"water parts: {len(parts)}, sea-connected area: {sea.area/1e6:.1f} km2")
    band = land.simplify(25).buffer(COAST_BAND_M, resolution=8)
    sea = sea.intersection(band)
    print(f"after {COAST_BAND_M/1000:.1f} km coastal band: {sea.area/1e6:.1f} km2")

    # --- zone polygons (display geometry) ---
    taken = None
    zone_geoms = []
    for code, en, fr, region in ZONES:
        g = sea.intersection(region_poly(region))
        if taken is not None:
            g = g.difference(taken)
        # light morphological closing to remove pinholes, then re-clip so zones never overlap
        g = g.buffer(45).buffer(-45).intersection(sea)
        if taken is not None:
            g = g.difference(taken)
        # drop slivers smaller than ~0.1 km2
        polys = [p for p in getattr(g, "geoms", [g]) if p.geom_type == "Polygon" and p.area > 1e5]
        g = unary_union(polys)
        zone_geoms.append((code, en, fr, g))
        taken = g if taken is None else unary_union([taken, g])

    # --- pixel grid (300 m, UTM-aligned) ---
    sea_in = sea.buffer(-SHORE_BUFFER_M)
    minx, miny, maxx, maxy = sea.bounds
    xs = np.arange(np.floor(minx / PIXEL_M) * PIXEL_M + PIXEL_M / 2, maxx, PIXEL_M)
    ys = np.arange(np.floor(miny / PIXEL_M) * PIXEL_M + PIXEL_M / 2, maxy, PIXEL_M)
    gx, gy = np.meshgrid(xs, ys)
    gx, gy = gx.ravel(), gy.ravel()
    ok = shapely.contains_xy(sea_in, gx, gy)
    px_x, px_y = gx[ok], gy[ok]

    zone_idx = np.full(px_x.shape, -1, dtype=int)
    for i, (_, _, _, g) in enumerate(zone_geoms):
        inside = shapely.contains_xy(g, px_x, px_y) & (zone_idx < 0)
        zone_idx[inside] = i
    keep = zone_idx >= 0
    px_x, px_y, zone_idx = px_x[keep], px_y[keep], zone_idx[keep]

    # sort pixels by zone then north->south, west->east so files are stable/diffable
    order = np.lexsort((px_x, -px_y, zone_idx))
    px_x, px_y, zone_idx = px_x[order], px_y[order], zone_idx[order]
    lon, lat = to_ll(px_x, px_y)

    grid = {
        "pixel_m": int(PIXEL_M),
        "crs": "EPSG:4326",
        "n": int(len(lon)),
        "zones": [z[0] for z in zone_geoms],
        "lon": [round(float(v), 5) for v in lon],
        "lat": [round(float(v), 5) for v in lat],
        "zone": [int(v) for v in zone_idx],
    }
    (ROOT / "data/grid.json").write_text(json.dumps(grid, separators=(",", ":")))

    # --- zones.geojson ---
    feats = []
    for i, (code, en, fr, g) in enumerate(zone_geoms):
        g_ll = transform(to_ll, g).simplify(0.00012, preserve_topology=True)
        biggest = max(getattr(g, "geoms", [g]), key=lambda p: p.area)
        lp = transform(to_ll, biggest.representative_point())
        feats.append({
            "type": "Feature",
            "properties": {
                "id": i, "code": code, "name_en": en, "name_fr": fr,
                "n_pixels": int((zone_idx == i).sum()),
                "area_km2": round(g.area / 1e6, 2),
                "label": [round(lp.x, 5), round(lp.y, 5)],
            },
            "geometry": mapping(g_ll),
        })
    (ROOT / "data/zones.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}, separators=(",", ":")))

    print(f"pixels: {grid['n']}")
    for f in feats:
        p = f["properties"]
        print(f"  {p['code']}: {p['n_pixels']:4d} px, {p['area_km2']:6.2f} km2")


if __name__ == "__main__":
    main()
