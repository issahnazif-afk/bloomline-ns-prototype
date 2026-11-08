#!/usr/bin/env python3
"""Extract GSHHG full-resolution land polygons for a bounding box from the
basemap-data-hires wheel (pip download basemap-data-hires==2.0.0, then unzip).
Writes GeoJSON land polygons clipped to the box. Dev-time tool; its output
(data/land_halifax.geojson) is committed so the site needs no Python."""
import sys, json
import numpy as np
from shapely.geometry import Polygon, box, mapping
from shapely.ops import unary_union

DATA_DIR = sys.argv[1]            # .../mpl_toolkits/basemap_data
OUT = sys.argv[2]
W, S, E, N = -64.10, 44.30, -63.20, 44.95     # study box with margin
RES = 'f'

meta = open(f'{DATA_DIR}/gshhsmeta_{RES}.dat').read().splitlines()
raw = open(f'{DATA_DIR}/gshhs_{RES}.dat', 'rb')
bbox = box(W, S, E, N)
polys = []
for line in meta:
    p = line.split()
    typ, area, npts, south, north, start, nbytes = p[:7]
    south, north = float(south), float(north)
    if north < S or south > N:
        continue
    raw.seek(int(start)); buf = raw.read(int(nbytes))
    xy = np.frombuffer(buf, dtype='<f4').reshape(-1, 2).astype('float64')
    lon = np.where(xy[:, 0] > 180, xy[:, 0] - 360, xy[:, 0]); lat = xy[:, 1]
    if lon.max() < W or lon.min() > E:
        continue
    pts = np.column_stack([lon, lat])
    if len(pts) < 4: continue
    g = Polygon(pts)
    if not g.is_valid: g = g.buffer(0)
    clip = g.intersection(bbox)
    if clip.is_empty: continue
    polys.append((int(typ), clip))
    print('poly type', typ, 'npts', npts, '-> clipped area deg2', round(clip.area, 5))

land = unary_union([g for t, g in polys if t in (1, 3)])        # land + islands in lakes
water_in_land = [g for t, g in polys if t in (2, 4)]             # lakes/ponds
if water_in_land:
    land = land.difference(unary_union(water_in_land))
json.dump({'type': 'FeatureCollection', 'features': [
    {'type': 'Feature', 'properties': {'kind': 'land', 'source': 'GSHHG v2 full resolution'},
     'geometry': mapping(land)}]}, open(OUT, 'w'))
print('land parts:', len(getattr(land, 'geoms', [land])), 'vertices:',
      sum(len(g.exterior.coords) for g in getattr(land, 'geoms', [land])))
