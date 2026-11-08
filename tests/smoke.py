#!/usr/bin/env python3
"""End-to-end smoke test: drives the real UI in headless Chrome and saves screenshots.

    pip install playwright            # uses your installed Chrome, no browser download needed
    python3 tests/smoke.py            # serves the repo on localhost and runs everything
    python3 tests/smoke.py --url http://localhost:8000 --out shots

Imagery tiles come from the internet; if they are blocked (CI, sandboxes) the app falls back to the
built-in coastline, and this test still passes.
"""
import argparse, functools, http.server, json, os, sys, threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"]
IGNORABLE = ("arcgisonline", "ERR_", "Failed to load resource", "net::", "tile", "AJAXError", "403", "status of 4")


def serve(port):
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    handler.log_message = lambda *a, **k: None
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url"); ap.add_argument("--out", default="test-shots"); ap.add_argument("--chrome")
    a = ap.parse_args()
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    srv = None
    if not a.url:
        srv = serve(8765); a.url = "http://127.0.0.1:8765/"
    chrome = a.chrome or next((p for p in ("/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser") if os.path.exists(p)), None)

    errors, failures = [], []
    def check(name, cond, detail=""):
        print(("PASS " if cond else "FAIL ") + name + (f"  [{detail}]" if detail else ""))
        if not cond: failures.append(name)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=chrome, args=ARGS, headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 860})
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        def on_console(m):
            if m.type != "error" or any(s in m.text for s in IGNORABLE): return
            if "Failed to fetch" in m.text and "maplibre-gl" in (m.location.get("url") or ""): return   # blocked imagery tiles
            errors.append(f"console: {m.text}")
        page.on("console", on_console)

        rendered = lambda layer="pixels": page.evaluate(f"__habtrail.map.queryRenderedFeatures({{layers:['{layer}']}}).length")
        settle = lambda ms=1400: page.wait_for_timeout(ms)

        # 1. overview
        page.goto(a.url + "#layer=habtrail")
        page.wait_for_selector(".zone-pill"); page.wait_for_selector(".date-tab"); settle(1800)
        check("6 zone pills", page.locator(".zone-pill").count() == 6)
        check("4 date tabs", page.locator(".date-tab").count() == 4)
        check("sample-data notice visible", page.locator(".status summary").inner_text().strip().startswith("Sample"))
        check("no pixels in overview", rendered() == 0)
        page.screenshot(path=str(out / "1-overview.png"))

        # 2. zone view
        page.locator(".zone-pill", has_text="BDB").click(); settle(2000)
        n = rendered(); check("pixels drawn in zone", n > 50, f"{n} rendered")
        check("zone card shows name", "Bedford Basin" in page.locator(".zone-card").inner_text())
        check("legend has 5 classes", page.locator(".legend-row").count() == 5)
        page.screenshot(path=str(out / "2-zone-habtrail.png"))

        # 3. date tab changes values
        before = page.locator(".legend-row .count").all_inner_texts()
        page.locator(".date-tab").nth(3).click(); settle(1200)
        after = page.locator(".legend-row .count").all_inner_texts()
        check("date change updates legend counts", before != after, f"{before} -> {after}")
        check("URL hash follows state", "date=" in page.evaluate("location.hash") and "zone=BDB" in page.evaluate("location.hash"))
        page.screenshot(path=str(out / "3-zone-day3.png"))

        # 3b. hover tooltip on a pixel
        x, y = page.evaluate("(() => { const m = __habtrail.map, f = m.queryRenderedFeatures({layers: ['pixels']})[5], p = m.project(f.geometry.coordinates), r = document.getElementById('map').getBoundingClientRect(); return [p.x + r.left, p.y + r.top]; })()")
        page.mouse.move(x - 40, y); page.mouse.move(x, y, steps=4); settle(300)
        check("hover tooltip shows value and pixel source", page.locator(".tip").is_visible() and "HABtrail" in page.locator(".tip").inner_text(), page.locator(".tip").inner_text().replace("\n", " | ") if page.locator(".tip").is_visible() else "no tooltip")
        page.screenshot(path=str(out / "3b-hover.png"))
        page.mouse.move(5, 400)

        # 4. pixel-source filter (A-05)
        total = rendered()
        page.locator(".type-row input").nth(0).uncheck(); settle(700)
        check("hiding OBS removes pixels", rendered() <= total)
        page.locator(".type-row input").nth(0).check(); settle(500)

        # 5. layer menu -> chlorophyll
        page.get_by_role("button", name="Layers").click()
        page.get_by_role("menuitemradio", name="Chlorophyll-a").click(); settle(1500)
        check("legend title follows layer", "Chlorophyll" in page.locator(".legend-title").inner_text())
        page.screenshot(path=str(out / "4-zone-chla.png"))

        # 6. area select -> trend
        page.get_by_role("button", name="Select area").click()
        box = page.locator("#map").bounding_box()
        cx, cy = box["x"] + box["width"] * 0.55, box["y"] + box["height"] * 0.5
        page.mouse.move(cx - 120, cy - 90); page.mouse.down(); page.mouse.move(cx + 120, cy + 90, steps=6); page.mouse.up(); settle(600)
        check("trend card opens", page.locator(".trend").is_visible())
        check("trend shows a dashed average label", "Ø" in page.locator(".trend").inner_text())
        page.screenshot(path=str(out / "5-trend.png"))
        page.keyboard.press("Escape")

        # 7. closures table
        page.get_by_role("button", name="Layers").click()
        page.get_by_role("menuitemradio", name="Shellfish closures (sample)").click(); settle(1200)
        check("closures table has species rows", page.locator(".tbl tbody tr").count() >= 3, f"{page.locator('.tbl tbody tr').count()} rows")
        page.screenshot(path=str(out / "6-closures.png"))

        # 8. alerts
        page.get_by_role("button", name="Alerts").click(); settle(500)
        check("alerts badge has a count", page.locator(".badge").is_visible() and int(page.locator(".badge").inner_text()) >= 1)
        check("alert cards listed", page.locator(".alert-card").count() >= 1)
        pill = page.evaluate("getComputedStyle(document.querySelector('.alert-card .pill')).backgroundColor")
        check("alert pill uses the class colour", pill != "rgb(136, 136, 136)", pill)
        page.screenshot(path=str(out / "7-alerts.png"))
        page.keyboard.press("Escape")
        page.get_by_role("button", name="About this prototype").click(); settle(400)
        check("about panel opens", "synthetic" in page.locator(".overlay").inner_text().lower())
        page.screenshot(path=str(out / "8-about.png"))
        page.keyboard.press("Escape")

        # 9. French
        page.locator(".lang-btn").click(); settle(600)
        check("French UI", "Aujourd" in page.locator(".dates").inner_text())
        page.screenshot(path=str(out / "9-fr.png"))
        page.locator(".lang-btn").click()

        # 10. plain basemap + mobile
        page.goto(a.url + "#layer=habtrail&zone=OUH&basemap=plain"); page.wait_for_selector(".zone-pill"); settle(2200)
        check("deep link opens zone", rendered() > 20, f"{rendered()} px")
        page.screenshot(path=str(out / "10-plain.png"))
        page.set_viewport_size({"width": 390, "height": 844}); page.goto(a.url + "#layer=habtrail&zone=BDB"); page.reload(); page.wait_for_selector(".zone-pill"); settle(2400)
        page.screenshot(path=str(out / "11-mobile.png"))
        right_edge = page.evaluate("Math.max(...[...document.querySelectorAll('.round-btn')].map(b => b.getBoundingClientRect().right))")
        check("action buttons fit the phone screen", right_edge <= 390, f"right edge {right_edge:.0f}px")
        check("status card collapsed on phone", not page.evaluate("document.querySelector('.status').open"))
        dock_top = page.evaluate("document.querySelector('.dock').getBoundingClientRect().top")
        check("map keeps over half the phone screen", dock_top > 844 * 0.45, f"dock starts at {dock_top:.0f}px")

        browser.close()
    if srv: srv.shutdown()
    check("no JS errors", not errors, " ; ".join(errors))
    print(f"\n{'ALL PASSED' if not failures else 'FAILED: ' + ', '.join(failures)}  (screenshots in {out})")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
