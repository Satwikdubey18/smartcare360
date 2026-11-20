# SmartCare 360 — Viva Questions & Answers

> 20 questions covering the full project: web app, firmware, MQTT, payment, privacy, and design decisions.

---

## 1. What is SmartCare 360 in one sentence?
A college demonstration kiosk where a patient checks in on a tablet, reads first-aid advice, pays a demo fee, and an ESP32 drops a dummy packet from a servo-controlled dispenser.

## 2. What microcontroller did you use, and why?
**ESP32 DevKit V1.** It has built-in Wi-Fi (needed for MQTT and the web server), runs at 240 MHz (enough for real-time servo control and web serving), and has enough GPIO for 4 servos + LCD + buzzer + LED + button.

## 3. How does the tablet talk to the ESP32?
Three modes, auto-detected:
- **Cloud (MQTT):** Browser → HiveMQ broker (wss://) → ESP32 (tcp://)
- **Local (HTTP):** Browser → `fetch('/dispense?c=A')` to ESP32 at 192.168.4.1
- **Demo:** Simulated only, no hardware

## 4. What is MQTT and why did you use it?
**Message Queuing Telemetry Transport** — a lightweight publish/subscribe protocol for IoT. We use it because a browser on an HTTPS page (Vercel) **cannot** call a plain HTTP ESP32 endpoint (mixed-content block). MQTT over secure WebSockets (wss://) bypasses this.

## 5. What is "mixed content" and how did you solve it?
When an HTTPS page tries to fetch from a plain HTTP URL, the browser blocks it for security. Solution: MQTT over `wss://` on port 8884 — both sides are encrypted, so the browser allows it.

## 6. How is patient data protected?
- Name and mobile number are stored **only in JavaScript memory** (a local variable), never in `localStorage`, cookies, or any server.
- They are cleared on: End session, 90-second idle timeout, and when the patient returns to Check-in.
- The ESP32 and MQTT messages never carry patient data — only the compartment letter and order ID.

## 7. Why is the payment a demo? Why not real UPI?
- Real UPI requires a registered merchant, a payment gateway, server-side verification, and RBI compliance — not suitable for a college project.
- The demo payment shows the UI flow (QR, countdown, success screen) without touching real money.
- The screen clearly labels "DEMO PAYMENT – no real money is charged."

## 8. Why do emergencies skip payment?
No payment barrier should stand between a patient and emergency first aid. Emergency items (Heart Attack/G, Bleeding/E, Burn/F, Poisoning/H) dispense immediately with the 112 reminder.

## 9. What is the compartment map?
| Letter | Symptom | Servo | Pin |
|--------|---------|-------|-----|
| A | Fever, Stomach Pain | 1 | D18 |
| B | Headache, Vomiting | 1 | D18 |
| C | Cough, Body Pain | 2 | D19 |
| D | Chest Pain, Weakness | 2 | D19 |
| E | Bleeding | 4 | D32 |
| F | Burn | 4 | D32 |
| G | Heart Attack | 3 | D23 |
| H | Poisoning | 3 | D23 |

## 10. How does the servo drop a packet?
Servo swings from 90° (centre) → 5° or 175° (side) → holds 1 second → returns to 90°. The tilt of the tray drops the dummy packet by gravity.

## 11. What is the "isBusy" flag?
A boolean that prevents two servos from moving simultaneously. If a command arrives while `isBusy` is true, it returns `{"error":"BUSY"}` immediately. This protects the power supply and mechanical parts.

## 12. How does the ESP32 prevent double dispensing?
It keeps a circular buffer of the last 5 command UUIDs. If the same UUID arrives again (e.g., MQTT retransmission), it ignores the duplicate.

## 13. What is the token for?
A shared secret in `secrets.h` and `config.js`. Since we use a **public** MQTT broker, anyone could publish to our topic. The ESP32 rejects commands with the wrong token. This is demo-grade security — not for production.

## 14. What is PWA and why did you use it?
**Progressive Web App** — a web app that installs on the home screen and behaves like a native app (fullscreen, offline cache, its own icon). We use it so the tablet can open SmartCare 360 fullscreen without a browser bar, like a kiosk app.

## 15. What is a service worker?
A JavaScript file that intercepts network requests and serves cached responses. Our service worker caches the app shell (HTML, CSS, JS) so the dashboard loads even if the internet drops after the first visit.

## 16. How does the QR code work offline?
We vendored a small MIT-licensed QR generator (`qrcode-generator`) into `web/js/vendor/qrcode.js`. It generates a QR as a canvas data URL in the browser — no server, no CDN needed. The QR content is a plain demo string, not a real UPI link.

## 17. What does the embed_web.py script do?
It reads `web/index.html`, inlines all CSS and local JS files, and writes the result as a C header file (`dashboard_html.h`). The ESP32 serves this from `PROGMEM` flash at `http://192.168.4.1`, so the kiosk works without internet (Local mode).

## 18. How does the auto-detect mode work?
```
if (location.hostname === "192.168.4.1") → Local mode
else:
  load mqtt.js → connect to broker
  wait 5 s for ESP32 /status message
  if received and online: → Cloud mode
  else: → Demo mode
```

## 19. How is the layout designed for the tablet?
- **Fixed header (52 px) + fixed footer (30 px)** — always visible.
- Content area uses `height: 100dvh minus header/footer` with CSS Grid `fr` rows.
- Tiles use `clamp()` for icon/font sizes that scale from 600 px to 1080 px height.
- No backdrop-filter (slow on tablet GPU).
- Animations on transform/opacity only (GPU-accelerated).
- Touch targets ≥ 48 px.
- `prefers-reduced-motion` respected.

## 20. What are the security limitations of this project?
1. **Public MQTT broker** — the token provides only minimal protection.
2. **Token in source code** — anyone reading JS can see it.
3. **Demo payment** — no real transaction security.
4. **No HTTPS on ESP32** — the HTTP server on the station IP is plain HTTP.

For a real product: private MQTT broker with TLS client certificates, server-side payment verification, and HTTPS on the ESP32 would be needed.
