/* ============================================================
   SmartCare 360 – Connection Manager (unchanged API)
   Cloud (MQTT) / Local (HTTP) / Demo modes
   ============================================================ */
"use strict";

const Connection = (function () {
  let mode = "detecting";
  let mqttClient = null;
  let deviceOnline = false;
  let installedServos = [true, true, true, true];
  let faults = [];
  let statusPill = null;
  const pendingResults = new Map();

  function init() {
    statusPill = document.getElementById("status-pill");
    if (location.hostname === "192.168.4.1") { setMode("local"); return; }
    setMode("detecting");
    updatePill("Connecting\u2026", "detecting");
    loadMqttLibrary().then(() => connectMqtt()).catch(() => setMode("demo"));
  }

  function loadMqttLibrary() {
    return new Promise((resolve, reject) => {
      if (window.mqtt) { resolve(); return; }
      const s = document.createElement("script");
      s.src = "https://unpkg.com/mqtt@5/dist/mqtt.min.js";
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function connectMqtt() {
    const brokerUrl = SC360.MQTT_BROKER_WSS;
    const clientId = "sc360-web-" + Math.random().toString(36).substring(2, 10);
    try {
      mqttClient = mqtt.connect(brokerUrl, { clientId, clean: true, connectTimeout: 10000, keepalive: 30, reconnectPeriod: 5000 });
    } catch (err) { setMode("demo"); return; }

    const topicStatus = SC360.MQTT_TOPIC_BASE + "/status";
    const topicResult = SC360.MQTT_TOPIC_BASE + "/result";
    const cloudTimeout = setTimeout(() => { if (mode === "detecting") setMode("demo"); }, SC360.CLOUD_TIMEOUT);

    mqttClient.on("connect", () => { mqttClient.subscribe([topicStatus, topicResult], { qos: 1 }); });
    mqttClient.on("message", (topic, payload) => {
      let msg; try { msg = JSON.parse(payload.toString()); } catch (e) { return; }
      if (topic === topicStatus) {
        clearTimeout(cloudTimeout);
        updateStatus(msg);
        deviceOnline ? setMode("cloud") : updatePill("Dispenser offline", "offline");
      }
      if (topic === topicResult) handleResult(msg);
    });
    mqttClient.on("error", () => {});
    mqttClient.on("offline", () => { if (mode === "cloud") updatePill("Reconnecting\u2026", "detecting"); });
  }

  function handleResult(msg) {
    if (!msg.id) return;
    const p = pendingResults.get(msg.id);
    if (!p) return;
    clearTimeout(p.timer);
    pendingResults.delete(msg.id);
    p.resolve(msg);
  }

  function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function dispense(letter) {
    letter = letter.toUpperCase();
    if (mode === "local") return dispenseLocal(letter);
    if (mode === "cloud") return dispenseCloud(letter);
    return dispenseDemo(letter);
  }

  function dispenseLocal(letter) {
    return fetch("/dispense?c=" + letter).then(r => r.json()).then(d => { d.mode = "local"; return d; })
      .catch(() => ({ ok: false, error: "NETWORK_ERROR", mode: "local" }));
  }

  function dispenseCloud(letter) {
    return new Promise(resolve => {
      if (!mqttClient || !mqttClient.connected) { resolve({ ok: false, error: "NOT_CONNECTED", mode: "cloud" }); return; }
      const id = uuid();
      const topicCmd = SC360.MQTT_TOPIC_BASE + "/cmd";
      const payload = JSON.stringify({ id, letter, token: SC360.TOKEN });
      const timer = setTimeout(() => { pendingResults.delete(id); resolve({ ok: false, error: "TIMEOUT", mode: "cloud" }); }, SC360.RESULT_TIMEOUT);
      pendingResults.set(id, { resolve: msg => { msg.mode = "cloud"; resolve(msg); }, timer });
      mqttClient.publish(topicCmd, payload, { qos: 1 });
    });
  }

  function dispenseDemo(letter) {
    return new Promise(resolve => {
      const comp = SC360.COMPARTMENTS[letter];
      setTimeout(() => resolve({ ok: true, letter, servo: comp ? comp.servo : 0, mode: "demo" }), SC360.DISPENSE_DEMO_TIME);
    });
  }

  function updateStatus(status) {
    deviceOnline = !!status.online;
    if (Array.isArray(status.installed)) installedServos = status.installed;
    if (Array.isArray(status.faults)) faults = status.faults;
    document.dispatchEvent(new CustomEvent("sc360status"));
  }

  function setMode(newMode) {
    mode = newMode;
    switch (mode) {
      case "local": updatePill("Dispenser connected \u00b7 Local", "connected");
        fetch("/status").then(r => r.json()).then(updateStatus).catch(() => {}); break;
      case "cloud": updatePill("Dispenser connected \u00b7 Cloud", "connected"); break;
      case "demo":  updatePill("Demo mode", "demo"); break;
      default:      updatePill("Connecting\u2026", "detecting");
    }
  }

  function updatePill(text, state) {
    if (!statusPill) return;
    statusPill.textContent = text;
    statusPill.className = "status-pill status-" + state;
  }

  function testConnection() {
    return new Promise(resolve => {
      if (mode === "local") {
        fetch("/status").then(r => r.json()).then(() => resolve({ ok: true, mode: "local" })).catch(() => resolve({ ok: false, error: "Cannot reach ESP32" })); return;
      }
      if (mqttClient) { mqttClient.end(true); mqttClient = null; }
      deviceOnline = false; mode = "detecting";
      loadMqttLibrary().then(() => {
        connectMqtt();
        const start = Date.now();
        const check = setInterval(() => {
          if (mode === "cloud") { clearInterval(check); resolve({ ok: true, mode: "cloud" }); }
          else if (Date.now() - start > SC360.CLOUD_TIMEOUT) { clearInterval(check); resolve({ ok: false, error: "Device not found (timeout)" }); }
        }, 500);
      }).catch(() => resolve({ ok: false, error: "MQTT library failed to load" }));
    });
  }

  return {
    init, dispense, testConnection,
    getMode: () => mode,
    isServoInstalled: n => installedServos[n - 1],
    isLetterAvailable: letter => {
      const compartment = SC360.COMPARTMENTS[letter];
      return !!compartment && installedServos[compartment.servo - 1] !== false && !faults.includes(letter);
    }
  };
})();
