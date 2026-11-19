/* ============================================================
   SmartCare 360 – Connection Manager
   ============================================================
   Provides a single function:  dispense(letter)
   Works in three modes:
     1. Local  — ESP32 at 192.168.4.1 (HTTP fetch)
     2. Cloud  — MQTT over secure WebSocket (wss://)
     3. Demo   — simulated 2.8 s dispense, no hardware needed
   ============================================================ */

"use strict";

const Connection = (function () {
  // ----------------------------------------------------------
  // State
  // ----------------------------------------------------------
  let mode = "detecting";       // "local" | "cloud" | "demo" | "detecting"
  let mqttClient = null;        // MQTT.js client (Cloud mode only)
  let deviceOnline = false;     // Is the ESP32 reporting online?
  let installedServos = [true, true, true, true]; // servo availability

  // Keep the status pill element reference
  let statusPill = null;

  // ----------------------------------------------------------
  // Initialise — called once from app.js after DOM is ready
  // ----------------------------------------------------------
  function init() {
    statusPill = document.getElementById("status-pill");

    // --- Mode detection ---
    if (location.hostname === "192.168.4.1") {
      // Loaded from the ESP32 itself → Local mode
      setMode("local");
      return;
    }

    // Otherwise, try Cloud mode (needs mqtt.js from CDN)
    setMode("detecting");
    updatePill("Connecting…", "detecting");

    // Load mqtt.js dynamically (only needed for Cloud mode)
    loadMqttLibrary()
      .then(() => connectMqtt())
      .catch((err) => {
        console.warn("MQTT library failed to load:", err);
        setMode("demo");
      });
  }

  // ----------------------------------------------------------
  // Load mqtt.js from CDN
  // ----------------------------------------------------------
  function loadMqttLibrary() {
    return new Promise((resolve, reject) => {
      // Already loaded?
      if (window.mqtt) { resolve(); return; }

      const script = document.createElement("script");
      script.src = "https://unpkg.com/mqtt@5/dist/mqtt.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // ----------------------------------------------------------
  // Connect to MQTT broker (Cloud mode)
  // ----------------------------------------------------------
  function connectMqtt() {
    const deviceId = SC360.DEVICE_ID;
    const brokerUrl = SC360.MQTT_BROKER_WSS;
    const clientId = "sc360-web-" + Math.random().toString(36).substring(2, 10);

    try {
      mqttClient = mqtt.connect(brokerUrl, {
        clientId: clientId,
        clean: true,
        connectTimeout: 10000,
        keepalive: 30,
        reconnectPeriod: 5000
      });
    } catch (err) {
      console.warn("MQTT connect error:", err);
      setMode("demo");
      return;
    }

    // Topics
    const topicStatus = "smartcare360/" + deviceId + "/status";
    const topicResult = "smartcare360/" + deviceId + "/result";

    // Timeout: if no "online" status within 5 s → Demo
    const cloudTimeout = setTimeout(() => {
      if (mode === "detecting") {
        console.log("No device status within timeout → Demo mode");
        setMode("demo");
      }
    }, SC360.CLOUD_TIMEOUT);

    mqttClient.on("connect", () => {
      console.log("MQTT connected to", brokerUrl);
      mqttClient.subscribe([topicStatus, topicResult], { qos: 1 });
    });

    mqttClient.on("message", (topic, payload) => {
      let msg;
      try { msg = JSON.parse(payload.toString()); } catch (e) { return; }

      if (topic === topicStatus) {
        clearTimeout(cloudTimeout);
        deviceOnline = !!msg.online;
        if (Array.isArray(msg.installed)) {
          installedServos = msg.installed;
        }
        if (deviceOnline) {
          setMode("cloud");
        } else {
          updatePill("Dispenser offline", "offline");
        }
      }

      if (topic === topicResult) {
        // Dispatch to pending dispense callback
        handleResult(msg);
      }
    });

    mqttClient.on("error", (err) => {
      console.warn("MQTT error:", err);
    });

    mqttClient.on("offline", () => {
      if (mode === "cloud") {
        updatePill("Reconnecting…", "detecting");
      }
    });

    mqttClient.on("reconnect", () => {
      console.log("MQTT reconnecting…");
    });
  }

  // ----------------------------------------------------------
  // Pending dispense callbacks (Cloud mode)
  // ----------------------------------------------------------
  const pendingResults = new Map(); // id → { resolve, timer }

  function handleResult(msg) {
    if (!msg.id) return;
    const pending = pendingResults.get(msg.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingResults.delete(msg.id);
    pending.resolve(msg);
  }

  // ----------------------------------------------------------
  // Generate a simple UUID
  // ----------------------------------------------------------
  function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // ----------------------------------------------------------
  // DISPENSE — the single public function
  // Returns a Promise that resolves to:
  //   { ok: true,  letter, servo, mode }   on success
  //   { ok: false, error, mode }           on failure
  // ----------------------------------------------------------
  function dispense(letter) {
    letter = letter.toUpperCase();

    if (mode === "local") {
      return dispenseLocal(letter);
    } else if (mode === "cloud") {
      return dispenseCloud(letter);
    } else {
      return dispenseDemo(letter);
    }
  }

  // --- Local mode: HTTP fetch to ESP32 ---
  function dispenseLocal(letter) {
    return fetch("/dispense?c=" + letter)
      .then((res) => res.json())
      .then((data) => {
        data.mode = "local";
        return data;
      })
      .catch((err) => {
        console.error("Local dispense error:", err);
        return { ok: false, error: "NETWORK_ERROR", mode: "local" };
      });
  }

  // --- Cloud mode: publish MQTT command, wait for result ---
  function dispenseCloud(letter) {
    return new Promise((resolve) => {
      if (!mqttClient || !mqttClient.connected) {
        resolve({ ok: false, error: "NOT_CONNECTED", mode: "cloud" });
        return;
      }

      const id = uuid();
      const deviceId = SC360.DEVICE_ID;
      const topicCmd = "smartcare360/" + deviceId + "/cmd";

      const payload = JSON.stringify({
        id: id,
        letter: letter,
        token: SC360.TOKEN
      });

      // Set up timeout
      const timer = setTimeout(() => {
        pendingResults.delete(id);
        resolve({ ok: false, error: "TIMEOUT", mode: "cloud" });
      }, SC360.RESULT_TIMEOUT);

      // Register pending callback
      pendingResults.set(id, { resolve: (msg) => {
        msg.mode = "cloud";
        resolve(msg);
      }, timer: timer });

      // Publish command
      mqttClient.publish(topicCmd, payload, { qos: 1 });
    });
  }

  // --- Demo mode: simulate a dispense ---
  function dispenseDemo(letter) {
    return new Promise((resolve) => {
      const comp = SC360.COMPARTMENTS[letter];
      setTimeout(() => {
        resolve({
          ok: true,
          letter: letter,
          servo: comp ? comp.servo : 0,
          mode: "demo"
        });
      }, SC360.DISPENSE_DEMO_TIME);
    });
  }

  // ----------------------------------------------------------
  // Set mode and update UI
  // ----------------------------------------------------------
  function setMode(newMode) {
    mode = newMode;
    console.log("Connection mode:", mode);

    switch (mode) {
      case "local":
        updatePill("Dispenser connected \u00b7 Local", "connected");
        // Also check /status for installed servos
        fetch("/status").then(r => r.json()).then(data => {
          if (Array.isArray(data.installed)) {
            installedServos = data.installed;
          }
        }).catch(() => {});
        break;
      case "cloud":
        updatePill("Dispenser connected \u00b7 Cloud", "connected");
        break;
      case "demo":
        updatePill("Demo mode", "demo");
        break;
      default:
        updatePill("Connecting\u2026", "detecting");
    }
  }

  // ----------------------------------------------------------
  // Update the header pill
  // ----------------------------------------------------------
  function updatePill(text, state) {
    if (!statusPill) return;
    statusPill.textContent = text;
    statusPill.className = "status-pill status-" + state;
  }

  // ----------------------------------------------------------
  // Test connection (for settings panel)
  // ----------------------------------------------------------
  function testConnection() {
    return new Promise((resolve) => {
      if (mode === "local") {
        fetch("/status")
          .then((r) => r.json())
          .then(() => resolve({ ok: true, mode: "local" }))
          .catch(() => resolve({ ok: false, error: "Cannot reach ESP32" }));
        return;
      }

      // For Cloud: disconnect and reconnect with new settings
      if (mqttClient) {
        mqttClient.end(true);
        mqttClient = null;
      }
      deviceOnline = false;
      mode = "detecting";

      loadMqttLibrary()
        .then(() => {
          connectMqtt();
          // Wait up to 5 s for online status
          const start = Date.now();
          const check = setInterval(() => {
            if (mode === "cloud") {
              clearInterval(check);
              resolve({ ok: true, mode: "cloud" });
            } else if (Date.now() - start > SC360.CLOUD_TIMEOUT) {
              clearInterval(check);
              resolve({ ok: false, error: "Device not found (timeout)" });
            }
          }, 500);
        })
        .catch(() => resolve({ ok: false, error: "MQTT library failed to load" }));
    });
  }

  // ----------------------------------------------------------
  // Public API
  // ----------------------------------------------------------
  return {
    init: init,
    dispense: dispense,
    testConnection: testConnection,
    getMode: function () { return mode; },
    isServoInstalled: function (n) { return installedServos[n - 1]; }
  };
})();
