# SmartCare 360

> **Smart Healthcare Kiosk** — B.Pharm college project  
> Patient selects a symptom on a tablet → reads first-aid steps → taps "Dispense" → ESP32 drops a dummy medicine packet via servo motor.

⚠️ **College demonstration only.** No real diagnosis, prescription, or medicine. Dummy packets only.

---

## Features

- 🩺 **8 Symptoms** — Fever, Headache, Cough, Chest Pain, Stomach Pain, Vomiting, Body Pain, Weakness
- 🚨 **4 Emergencies** — Heart Attack, Bleeding, Burn, Poisoning
- 🔄 **3 Connection Modes** — Cloud (MQTT), Local (HTTP), Demo (simulated)
- 📱 **PWA** — Installable on the tablet home screen, works offline
- 🎨 **Premium UI** — Dark navy + cyan theme, ECG animation, servo animation

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/smartcare360.git
cd smartcare360
```

### 2. Set Up the ESP32 Firmware

#### Install Arduino IDE

1. Download [Arduino IDE](https://www.arduino.cc/en/software) (version 2.x recommended).
2. Go to **File → Preferences** and add this to "Additional Boards Manager URLs":
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Go to **Tools → Board → Boards Manager**, search for **esp32**, and install **esp32 by Espressif Systems**.

#### Install Libraries

Go to **Tools → Manage Libraries** and install:

| Library | Author | Version |
|---------|--------|---------|
| **ESP32Servo** | Kevin Harrington | Latest |
| **LiquidCrystal I2C** | Frank de Brabander | Latest |
| **PubSubClient** | Nick O'Leary | Latest |
| **ArduinoJson** | Benoit Blanchon | **v7** |

#### Create secrets.h

```bash
cd firmware/SmartCare360
cp secrets_example.h secrets.h
```

Edit `secrets.h` with your Wi-Fi credentials:

```cpp
#define WIFI_SSID     "YourPhoneHotspot"
#define WIFI_PASSWORD "YourPassword"
#define MQTT_BROKER   "broker.hivemq.com"
#define DEVICE_ID     "sc360-7f3k9q"      // must match web config
#define TOKEN         "demo-token-2024"    // must match web config
```

> [!IMPORTANT]
> `secrets.h` is in `.gitignore` — it will **not** be pushed to GitHub. Never share your Wi-Fi password.

#### Upload to ESP32

1. Connect the ESP32 via USB Type-C.
2. In Arduino IDE:
   - **Board:** `DOIT ESP32 DEVKIT V1`
   - **Port:** Select the COM port that appeared
   - **Upload Speed:** `921600`
3. Click **Upload** (→ button).
4. Open **Serial Monitor** (115200 baud) to see status.

### 3. Wire the Hardware

See [docs/wiring.md](docs/wiring.md) for the full wiring table and power notes.

> [!CAUTION]
> Use an **external 5V power supply** for the servos. The ESP32 USB power alone is not enough for 4 servos.

### 4. Generate the Offline Dashboard

```bash
python tools/embed_web.py
```

This inlines the web app into `firmware/SmartCare360/dashboard_html.h` so the ESP32 can serve it at `http://192.168.4.1` without internet.

Re-upload the firmware after generating this file.

### 5. Test Locally

Open the web app directly in your browser:

```bash
# Option 1: open the file directly
# Just double-click web/index.html

# Option 2: use a local server
npx serve web
```

The app should load in **Demo mode** (no ESP32 connected).

### 6. Deploy to Vercel

1. Push this repository to **GitHub**.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. **Import** your GitHub repository.
4. Set:
   - **Framework Preset:** `Other`
   - **Root Directory:** `web`
   - **Build Command:** *(leave empty)*
   - **Output Directory:** *(leave empty)*
5. Click **Deploy**.

Your app is now live at `https://your-project.vercel.app`!

---

## Connection Modes

| Mode | When | How | Header Shows |
|------|------|-----|-------------|
| **Cloud** | Vercel + ESP32 on internet | MQTT over wss:// | "Dispenser connected · Cloud" |
| **Local** | Opened from `192.168.4.1` | HTTP fetch | "Dispenser connected · Local" |
| **Demo** | No ESP32 found | Simulated 2.8 s | "Demo mode" |

**Auto-detection:**
- If `location.hostname` is `192.168.4.1` → **Local**
- Otherwise → try **Cloud** (wait 5 s for ESP32 status via MQTT)
- If timeout → **Demo**

---

## MQTT Details

| Setting | Browser | ESP32 |
|---------|---------|-------|
| **Broker** | `wss://broker.hivemq.com:8884/mqtt` | `broker.hivemq.com:1883` |
| **Topics** | `smartcare360/<DEVICE_ID>/cmd` (publish) | subscribe to `/cmd` |
| | `smartcare360/<DEVICE_ID>/result` (subscribe) | publish to `/result` |
| | `smartcare360/<DEVICE_ID>/status` (subscribe) | publish retained + Last Will |

> [!WARNING]
> The token is **demo-grade security**. Anyone who reads your code can see it. This is fine for a college project on a public broker, but **not** for production use. For production, use a private broker with TLS client certificates.

---

## Hidden Settings Panel

**Long-press the logo** (3 seconds) to open the settings panel. Here you can change:
- Device ID
- Token
- MQTT Broker URL

Settings are saved in `localStorage` and persist across page reloads.

---

## Serial Commands (for testing without the tablet)

Connect to the ESP32 via Serial Monitor (115200 baud):

| Command | Action |
|---------|--------|
| `A` – `H` | Dispense compartment A through H |
| `1` – `8` | Same as A–H (by number) |
| `0` | Run all compartments in sequence |
| `R` | Reset all servos to centre (90°) |
| `?` | Print status (Wi-Fi, MQTT, servos) |

---

## Troubleshooting

| Problem | Possible Cause | Solution |
|---------|---------------|----------|
| LCD shows nothing | Wrong I2C address or bad wiring | Check SDA→D21, SCL→D22. Try adjusting the contrast pot on the LCD backpack. |
| Servo doesn't move | Power issue | Use external 5V supply. Check GND is shared. |
| Servo jitters | Insufficient current | Add 100 µF cap across servo VCC/GND. |
| "Demo mode" on tablet | ESP32 not on MQTT | Check LCD shows "Cloud ready". Verify DEVICE_ID and TOKEN match. |
| Mixed content error | Opening HTTP from HTTPS | Use Cloud mode (MQTT) or Local mode (HTTP from ESP32). |
| `embed_web.py` error | Python not installed | Install Python 3.6+. Run from the repo root. |
| Upload fails | Wrong board selected | Select "DOIT ESP32 DEVKIT V1". Try holding BOOT button during upload. |
| Wi-Fi won't connect | Wrong credentials | Check WIFI_SSID and WIFI_PASSWORD in secrets.h. Must be 2.4 GHz (ESP32 doesn't support 5 GHz). |

---

## Repository Structure

```
smartcare360/
├── web/                         ← Deployed to Vercel (static)
│   ├── index.html
│   ├── css/styles.css
│   ├── js/config.js             ← Compartments, symptoms, MQTT settings
│   ├── js/connection.js         ← Cloud / Local / Demo modes
│   ├── js/app.js                ← Screens, animations, idle timeout
│   ├── manifest.webmanifest     ← PWA manifest
│   ├── sw.js                    ← Service worker
│   └── icons/                   ← 192px and 512px PNG icons
├── firmware/
│   └── SmartCare360/
│       ├── SmartCare360.ino     ← Main firmware
│       ├── config.h             ← Pins, angles, timings
│       ├── secrets_example.h    ← Copy to secrets.h
│       └── dashboard_html.h     ← Generated (gitignored)
├── tools/
│   └── embed_web.py             ← Generates dashboard_html.h
├── docs/
│   ├── wiring.md                ← Full wiring table + power
│   ├── tablet-setup.md          ← How to open the app
│   └── viva-notes.md            ← Block diagram + 15 Q&A
├── vercel.json
├── .gitignore
└── README.md                    ← This file
```

---

## Docs

- [Wiring Guide](docs/wiring.md) — Full wiring table and power notes
- [Tablet Setup](docs/tablet-setup.md) — How to open the app on the Galaxy Tab A7 Lite
- [Viva Notes](docs/viva-notes.md) — Block diagram, flow diagram, and 15 viva Q&A

---

## License

This project is a college demonstration. Use it freely for educational purposes.
