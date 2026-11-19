// ============================================================
// SmartCare 360 – Secrets (EXAMPLE)
// ============================================================
// Copy this file to secrets.h and fill in your values.
// secrets.h is in .gitignore — it will NOT be pushed to GitHub.
// ============================================================

#ifndef SECRETS_H
#define SECRETS_H

// ----------------------------------------------------------
// Wi-Fi credentials
// The ESP32 will try to connect to this network for 15 s.
// If it fails, it starts its own access point (SMARTCARE360).
// Use your phone's hotspot or college Wi-Fi.
// ----------------------------------------------------------
#define WIFI_SSID     "YourWiFiName"
#define WIFI_PASSWORD "YourWiFiPassword"

// ----------------------------------------------------------
// MQTT Broker
// Default: broker.hivemq.com (free, public, no account needed)
// ----------------------------------------------------------
#define MQTT_BROKER   "broker.hivemq.com"

// ----------------------------------------------------------
// Device ID
// Must match the DEVICE_ID in the web app's config.js.
// Use something random like "sc360-7f3k9q".
// ----------------------------------------------------------
#define DEVICE_ID     "sc360-7f3k9q"

// ----------------------------------------------------------
// Token (demo-grade security)
// Must match the TOKEN in the web app's config.js.
// This is NOT real security — anyone who reads your code
// can see it.  It just prevents random people on the public
// broker from accidentally triggering your dispenser.
// ----------------------------------------------------------
#define TOKEN         "demo-token-2024"

#endif // SECRETS_H
