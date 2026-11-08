# Data contract

The web app reads static JSON from `data/`. It has no backend and no build step. Anything that writes these files in this shape can drive the dashboard: today that is `tools/make_sample_data.py`, later it can be your model pipeline.

Check any set of files with:

```bash
python3 tools/validate_data.py
```

## Files

```
data/
  meta.json                         what exists: dates, layers, classes, species
  grid.json                         the pixel table (fixed, rebuilt only if zones change)
  zones.geojson                     zone polygons for display (fixed)
  land_halifax.geojson              coastline used as a fallback basemap (fixed)
  layers/<layer>/<YYYY-MM-DD>.json  one file per layer per forecast date
```

### `grid.json` (columnar, one entry per pixel)

| Field | Type | Meaning |
|---|---|---|
| `pixel_m` | number | Pixel width in metres (300) |
| `n` | integer | Number of pixels |
| `zones` | string[] | Zone codes, in order. Position = zone index |
| `lon`, `lat` | number[n] | Pixel centre, WGS84 |
| `zone` | integer[n] | Index into `zones` |

**Every value array in `layers/` is aligned to this table: entry `i` is pixel `i`.** Never reorder the grid without regenerating every layer file.

### `zones.geojson`

Polygon features. Required properties: `id` (equals position in the file), `code`, `name_en`, `name_fr`, `n_pixels`, `area_km2`, `label` (`[lon, lat]` for the zone pill). Order must match `grid.zones`.

### `meta.json`

| Field | Meaning |
|---|---|
| `schema` | Must be `1` |
| `dataset.kind`, `.note`, `.generated_at` | `"sample"` or `"live"`, plus text shown in the status card |
| `dates` | Forecast dates, first = today. The UI shows one tab per date |
| `pixel_types` | `{"OBS":0,"MOD":1,"INT":2,"KRI":3}` |
| `layers[]` | See below |
| `species`, `zone_species` | Species names and which species each zone tracks (closures layer) |
| `map` | `center`, `zoom`, `bounds` for the first view |

**Pixel layer** (`type: "pixels"`): `id`, `label_en/fr`, `unit`, `decimals`, `legend_title_en/fr`, `tooltip_en/fr`, `footnote_en/fr`, `summary` (`mean`, `p90` or `p10`: how a zone's pixels are reduced to one colour in the all-zones view), `updated` (ISO time with offset), `source`, and `classes[]`.

**Classes** run from highest to lowest severity. Each has `id`, `label_en/fr`, `min` (inclusive), `max` (exclusive), `color`. Use `null` for an open end. The first class that matches wins. The HABtrail layer must have classes with ids `very_high` and `high`: alerts are computed from them.

**Table layer** (`type: "table"`): the shellfish closures layer.

### `layers/<layer>/<date>.json` (pixel layers)

```json
{ "layer": "chla", "date": "2026-11-09", "v": [3.42, 3.51, null], "t": [0, 0, 2] }
```

- `v[i]`: value for pixel `i`, in the layer's unit. `null` = no data (drawn grey, counted under "No data").
- `t[i]`: where the value came from. `0` OBS observed by satellite, `1` MOD modelled forecast, `2` INT interpolated from neighbours, `3` KRI kriged.

### `layers/interdictions/<date>.json`

```json
{ "layer": "interdictions", "date": "2026-11-09", "zones": { "BDB": { "blue_mussel": 1, "soft_shell_clam": 0 } } }
```

`1` = closed, `0` = open. Only species listed for the zone in `meta.zone_species` may appear.

## Replacing the sample with real data

1. Decide pixel size and grid. Keep 300 m if the source is Sentinel-3 OLCI. If you change zones or the grid, rerun `tools/build_grid.py` and regenerate all layer files.
2. Write one file per layer per date in the shape above, then run `tools/validate_data.py`.
3. Set `dataset.kind` to `"live"`, replace the sample note, and set each layer's `source` and `updated`.
4. Set class thresholds with a domain expert. The current ones are placeholders (HAB probability bands are copied from the Portuguese app; the rest were chosen only to exercise the interface).
5. Delete `.github/workflows/refresh-sample-data.yml` and replace it with the job that runs your pipeline.
