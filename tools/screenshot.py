"""
SmartCare 360 — Screenshot tool
Takes screenshots of every screen at 1005x600 and 1920x1080
using Playwright (headless Chromium).

Usage:
  python tools/screenshot.py

Outputs to: readme/screenshots/
"""

import os, sys, asyncio, time

SCREENSHOTS_DIR = os.path.join(os.path.dirname(__file__), "..", "readme", "screenshots")
BASE_URL = "http://localhost:3000"

async def take_screenshots(viewport_w, viewport_h, suffix=""):
    from playwright.async_api import async_playwright

    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": viewport_w, "height": viewport_h})

        def ss(name):
            path = os.path.join(SCREENSHOTS_DIR, name + suffix + ".png")
            return page.screenshot(path=path, full_page=False)

        # 1. Check-in
        await page.goto(BASE_URL, wait_until="networkidle")
        await page.wait_for_timeout(600)
        await ss("checkin")
        print(f"  ✓ checkin{suffix}.png")

        # 2. Fill in and continue → Home
        await page.fill("#checkin-name", "Priya Sharma")
        await page.fill("#checkin-mobile", "9876543210")
        await page.wait_for_timeout(300)
        await page.click("#checkin-continue")
        await page.wait_for_timeout(600)
        await ss("home")
        print(f"  ✓ home{suffix}.png")

        # 3. Diagnosis grid
        await page.click("#home-diagnosis")
        await page.wait_for_timeout(500)
        await ss("diagnosis-grid")
        print(f"  ✓ diagnosis-grid{suffix}.png")

        # 4. Symptom detail (Fever — first tile)
        await page.locator(".tile-card").first.click()
        await page.wait_for_timeout(500)
        await ss("symptom-detail")
        print(f"  ✓ symptom-detail{suffix}.png")

        # 5. Payment screen
        await page.click("#detail-dispense")
        await page.wait_for_timeout(600)
        await ss("payment")
        print(f"  ✓ payment{suffix}.png")

        # 6. Payment success
        await page.click("#pay-simulate")
        await page.wait_for_timeout(600)
        await ss("pay-success")
        print(f"  ✓ pay-success{suffix}.png")

        # 7. Dispensing (auto-advances from pay success after 2.5s)
        await page.wait_for_timeout(3000)
        await ss("dispensing")
        print(f"  ✓ dispensing{suffix}.png")

        # 8. Collect (auto-advances from dispensing ~3s)
        await page.wait_for_timeout(4000)
        await ss("collect")
        print(f"  ✓ collect{suffix}.png")

        # 9. Emergency grid — restart session
        await page.goto(BASE_URL, wait_until="networkidle")
        await page.fill("#checkin-name", "Priya Sharma")
        await page.fill("#checkin-mobile", "9876543210")
        await page.click("#checkin-continue")
        await page.wait_for_timeout(400)
        await page.click("#home-emergency")
        await page.wait_for_timeout(500)
        await ss("emergency-grid")
        print(f"  ✓ emergency-grid{suffix}.png")

        # 10. Emergency detail
        await page.locator(".tile-emergency").first.click()
        await page.wait_for_timeout(500)
        await ss("emergency-detail")
        print(f"  ✓ emergency-detail{suffix}.png")

        await browser.close()

async def main():
    print("=== SmartCare 360 Screenshots ===")

    print(f"\n[1] 1005 × 600 (Galaxy Tab A7 Lite landscape)")
    await take_screenshots(1005, 600, "")

    print(f"\n[2] 1920 × 1080 (Laptop / desktop)")
    await take_screenshots(1920, 1080, "-1080")

    print("\nAll screenshots saved to readme/screenshots/")

if __name__ == "__main__":
    asyncio.run(main())
