# Tablet Setup Guide – SmartCare 360

## Device: Samsung Galaxy Tab A7 Lite

The dashboard is designed for **landscape mode** at approximately 1005 × 600 CSS pixels.

---

## Mode 1: Cloud Mode (Recommended for Demo)

**What you need:** ESP32 and tablet both connected to the internet (phone hotspot or college Wi-Fi).

### Steps

1. **Connect your phone hotspot** (or use college Wi-Fi).
2. **Power on the ESP32.** It will try to connect to the Wi-Fi set in `secrets.h`.
   - LCD shows: `Connecting WiFi` → `Cloud ready` + IP address.
3. **On the tablet**, connect to the **same Wi-Fi network**.
4. **Open Chrome** and go to your Vercel URL:
   ```
   https://your-project.vercel.app
   ```
5. The header pill should show: **"Dispenser connected · Cloud"**
6. If it shows "Demo mode", check:
   - Is the ESP32 LCD showing "Cloud ready"?
   - Are the DEVICE_ID and TOKEN the same in `config.js` and `secrets.h`?
   - Long-press the logo (3 seconds) to open Settings and verify.

### Add to Home Screen (Fullscreen App)

1. In Chrome, tap the **⋮ menu** (top right).
2. Tap **"Add to Home screen"**.
3. Name it **SmartCare 360** and tap **Add**.
4. The app will now open in fullscreen (no browser chrome) — it looks like a native app!

---

## Mode 2: Local Mode (Offline Backup)

**What you need:** ESP32 running as access point. No internet needed.

### Steps

1. **Power on the ESP32** without Wi-Fi (or with wrong credentials in `secrets.h`).
   - LCD shows: `Offline mode` / `192.168.4.1`
2. **On the tablet**, go to **Wi-Fi Settings**.
3. **Connect to the network:** `SMARTCARE360` (password: `smartcare360`).
   - ⚠️ The tablet will warn "No internet" — that's expected. Tap **"Stay connected"**.
4. **Open Chrome** and go to:
   ```
   http://192.168.4.1
   ```
5. The header pill should show: **"Dispenser connected · Local"**
6. Everything works offline — no internet, no Vercel, no MQTT.

> [!IMPORTANT]
> In Local mode, the tablet has **no internet** because it's on the ESP32's access point. If you need to show both Vercel Cloud mode and Local mode in the same demo, do Cloud mode first (with hotspot), then switch to Local mode.

---

## Mode 3: Demo Mode (No Hardware)

**What you need:** Just the tablet and a web browser.

### Steps

1. **Open Chrome** and go to:
   - Your Vercel URL: `https://your-project.vercel.app`
   - Or open `web/index.html` directly on the tablet (copy the `web/` folder to the tablet).
2. If no ESP32 is found within 5 seconds, the app automatically enters **Demo mode**.
3. The header pill shows: **"Demo mode"**
4. Tapping "Dispense" shows the servo animation for 2.8 seconds, then shows success — but no real hardware moves.

---

## Screen Orientation

For the best experience, **lock the tablet to landscape mode:**

1. Pull down the notification shade.
2. Tap the **rotation lock** icon (make sure it says "Auto-rotate" is ON, then hold the tablet in landscape and lock it).
3. Or go to **Settings → Display → Screen rotation** and choose **Landscape**.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Demo mode" shows when ESP32 is on | Check DEVICE_ID and TOKEN match between web config and ESP32 `secrets.h`. Long-press logo to verify. |
| "No internet" warning on tablet | Expected in Local mode. Tap "Stay connected". |
| Page won't load in Local mode | Make sure the tablet is connected to the SMARTCARE360 Wi-Fi, then go to `http://192.168.4.1` |
| Vercel page loads but ESP32 not found | Both devices must be on the same network with internet. Check ESP32 LCD shows "Cloud ready". |
| App looks zoomed in / too big | In Chrome, tap ⋮ → zoom out to 90% or 80%. |
| Servo animation but no real dispensing | You're in Demo mode. Connect to the ESP32. |

