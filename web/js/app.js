/* ============================================================
   SmartCare 360 – Application Logic v2
   Screens: checkin → home → diagnosis/emergency → detail →
            payment (diagnosis only) → dispensing → collect → checkin
   ============================================================ */
"use strict";

const App = (function () {
  // ---- State ----
  let patient = { name: "", mobile: "" };
  let currentScreen = "screen-checkin";
  let currentItem = null;   // { type:"symptom"|"emergency", data, letter }
  let currentOrder = null;  // { id, letter, item, price }
  let idleTimer = null;
  let longPressTimer = null;
  let paymentTimer = null;
  let paymentCountdown = null;
  let collectTimer = null;

  // ---- Helpers ----
  const $ = id => document.getElementById(id);
  const $q = sel => document.querySelector(sel);
  const $qa = sel => document.querySelectorAll(sel);

  function escHtml(t) {
    const d = document.createElement("div");
    d.appendChild(document.createTextNode(t));
    return d.innerHTML;
  }

  function timeStr() {
    return new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }

  function randomOrderId() {
    return "SC-" + Math.floor(1000 + Math.random() * 9000);
  }

  // ---- Screen management ----
  function show(id) {
    $qa(".screen").forEach(el => { el.classList.remove("screen-active"); el.setAttribute("aria-hidden", "true"); });
    const el = $(id);
    if (el) { el.classList.add("screen-active"); el.setAttribute("aria-hidden", "false"); }
    currentScreen = id;
    resetIdleTimer();
    updateHeaderSession();
  }

  function updateHeaderSession() {
    const nameEl = $("header-patient-name");
    const endBtn = $("btn-end-session");
    if (patient.name) {
      if (nameEl) nameEl.textContent = patient.name;
      if (endBtn) endBtn.style.display = "flex";
      if (nameEl) nameEl.style.display = "block";
    } else {
      if (endBtn) endBtn.style.display = "none";
      if (nameEl) nameEl.style.display = "none";
    }
  }

  // ---- Idle timer ----
  function resetIdleTimer() {
    clearTimeout(idleTimer);
    if (currentScreen === "screen-checkin") return;
    idleTimer = setTimeout(() => { clearPatient(); show("screen-checkin"); }, SC360.IDLE_TIMEOUT);
  }

  function clearPatient() {
    patient = { name: "", mobile: "" };
    currentItem = null; currentOrder = null;
    clearTimeout(paymentTimer);
    clearInterval(paymentCountdown);
  }

  // ---- Build home screen ----
  function buildHome() {
    const greet = $("home-greeting");
    if (greet) greet.textContent = greeting() + ", " + (patient.name.split(" ")[0] || "");
  }

  // ---- Build diagnosis grid ----
  function buildDiagnosisGrid() {
    const grid = $("diagnosis-grid");
    if (!grid) return;
    grid.innerHTML = "";
    SC360.SYMPTOMS.forEach((s, i) => {
      const btn = document.createElement("button");
      const unavailable = !Connection.isLetterAvailable(s.compartment);
      btn.className = "tile-card" + (s.id === "chest-pain" ? " tile-chest" : "") + (unavailable ? " tile-out-of-order" : "");
      btn.style.animationDelay = (i * 0.06) + "s";
      btn.setAttribute("aria-label", s.title);
      btn.disabled = unavailable;
      const comp = SC360.COMPARTMENTS[s.compartment];
      btn.innerHTML = `
        <span class="tile-icon">${SC360.ICONS[s.id] || ""}</span>
        <span class="tile-label">${escHtml(s.title)}</span>
        <span class="tile-badge">Compartment ${escHtml(s.compartment)} · Servo ${comp.servo}</span>
        ${unavailable ? '<span class="tile-out-of-order-label">Out of order</span>' : ""}
        ${s.id === "chest-pain" ? '<span class="tile-urgent">⚠ Call 112 first</span>' : ""}
      `;
      btn.addEventListener("click", () => showDetail("symptom", s));
      grid.appendChild(btn);
    });
  }

  // ---- Build emergency grid ----
  function buildEmergencyGrid() {
    const grid = $("emergency-grid");
    if (!grid) return;
    grid.innerHTML = "";
    SC360.EMERGENCIES.forEach((e, i) => {
      const btn = document.createElement("button");
      const unavailable = !Connection.isLetterAvailable(e.compartment);
      btn.className = "tile-card tile-emergency" + (unavailable ? " tile-out-of-order" : "");
      btn.style.animationDelay = (i * 0.08) + "s";
      btn.setAttribute("aria-label", e.title);
      btn.disabled = unavailable;
      const comp = SC360.COMPARTMENTS[e.compartment];
      btn.innerHTML = `
        <span class="tile-icon">${SC360.ICONS[e.id] || ""}</span>
        <span class="tile-label">${escHtml(e.title)}</span>
        <span class="tile-badge">Compartment ${escHtml(e.compartment)} · Servo ${comp.servo}</span>
        ${unavailable ? '<span class="tile-out-of-order-label">Out of order</span>' : ""}
      `;
      btn.addEventListener("click", () => showDetail("emergency", e));
      grid.appendChild(btn);
    });
  }

  // ---- Detail screen ----
  function showDetail(type, data) {
    currentItem = { type, data, letter: data.compartment };
    const comp = SC360.COMPARTMENTS[data.compartment];
    const price = SC360.PRICES[data.compartment];
    const isEmerg = type === "emergency";

    // Left column
    const titleEl = $("detail-title");
    const iconEl = $("detail-icon");
    const warnEl = $("detail-warning");
    const helpLabel = $("detail-help-label");
    const helpList = $("detail-help-list");
    const doctorEl = $("detail-doctor");

    if (titleEl) titleEl.textContent = data.title;
    if (iconEl)  iconEl.innerHTML = SC360.ICONS[data.id] || "";

    if (warnEl) {
      if (data.warning || isEmerg) {
        warnEl.textContent = data.warning || "This is an emergency. Call 112 immediately!";
        warnEl.style.display = "block";
      } else {
        warnEl.style.display = "none";
      }
    }

    if (helpLabel) helpLabel.textContent = isEmerg ? "First-aid steps" : "What may help";

    if (helpList) {
      helpList.innerHTML = "";
      (data.whatMayHelp || []).forEach(step => {
        const li = document.createElement("li");
        li.textContent = step;
        helpList.appendChild(li);
      });
    }

    if (doctorEl) doctorEl.textContent = data.seeDoctor || "";

    // Right column — packet card
    const letterEl = $("detail-packet-letter");
    const compInfoEl = $("detail-comp-info");
    const priceEl = $("detail-price");
    const dispBtn = $("detail-dispense");
    const emergNote = $("detail-emerg-note");

    if (letterEl)  letterEl.textContent = data.compartment;
    if (compInfoEl) compInfoEl.textContent = comp.label + " · Servo " + comp.servo + " (" + comp.side + ")";
    if (priceEl)   priceEl.textContent = isEmerg ? "No charge (emergency)" : "\u20b9" + price;
    if (dispBtn) {
      dispBtn.disabled = false;
      dispBtn.textContent = isEmerg ? "Dispense emergency kit" : "Dispense packet \u2192 Pay \u20b9" + price;
      dispBtn.className = "btn-dispense" + (isEmerg ? " btn-dispense-emerg" : "");
    }
    if (emergNote) emergNote.style.display = isEmerg ? "block" : "none";

    // Remember which grid we came from, for the back button
    const detailEl = document.getElementById("screen-detail");
    if (detailEl) detailEl.dataset.from = type === "emergency" ? "emergency" : "symptom";

    show("screen-detail");
  }

  // ---- Dispense action ----
  function startDispenseFlow() {
    if (!currentItem) return;
    const isEmerg = currentItem.type === "emergency";
    if (isEmerg) {
      // Skip payment for emergencies
      startDispensing();
    } else {
      // Show payment screen
      showPayment();
    }
  }

  // ---- Payment ----
  function showPayment() {
    const { letter } = currentItem;
    const price = SC360.PRICES[letter];
    const orderId = randomOrderId();
    currentOrder = { id: orderId, letter, item: currentItem.data.title, price };

    // Populate left column
    const nameEl = $("pay-patient-name");
    const itemEl = $("pay-item");
    const compEl = $("pay-comp");
    const priceEl = $("pay-price");
    const orderEl = $("pay-order-id");
    const firstName = patient.name.split(" ")[0];

    if (nameEl)  nameEl.textContent = firstName;
    if (itemEl)  itemEl.textContent = currentItem.data.title;
    if (compEl)  compEl.textContent = SC360.COMPARTMENTS[letter].label + " · Servo " + SC360.COMPARTMENTS[letter].servo;
    if (priceEl) priceEl.textContent = "\u20b9" + price;
    if (orderEl) orderEl.textContent = orderId;

    // Generate QR
    const qrContent = "SMARTCARE360-DEMO|ORDER:" + orderId + "|AMOUNT:" + price + "|NOT-A-REAL-PAYMENT";
    const qrImg = $("pay-qr");
    if (qrImg && window.qrcode) {
      try { qrImg.src = qrcode.generate(qrContent, 5, 20); } catch (e) { qrImg.style.display = "none"; }
    }

    // Countdown — 2 minutes
    let secsLeft = 120;
    const countEl = $("pay-countdown");
    clearInterval(paymentCountdown);
    function tick() {
      const m = Math.floor(secsLeft / 60);
      const s = secsLeft % 60;
      if (countEl) countEl.textContent = m + ":" + String(s).padStart(2, "0");
      if (secsLeft <= 0) { clearInterval(paymentCountdown); handlePaymentTimeout(); }
      secsLeft--;
    }
    tick();
    paymentCountdown = setInterval(tick, 1000);

    show("screen-payment");
  }

  function handlePaymentTimeout() {
    // Auto-cancel after countdown
    clearPatient();
    show("screen-checkin");
  }

  function simulatePayment() {
    clearInterval(paymentCountdown);
    showPaymentSuccess();
  }

  function showPaymentSuccess() {
    if (!currentOrder) return;
    const { id, letter, item, price } = currentOrder;
    const comp = SC360.COMPARTMENTS[letter];

    $("paysuccess-amount").textContent = "\u20b9" + price;
    $("paysuccess-order").textContent  = id;
    $("paysuccess-time").textContent   = timeStr();
    $("paysuccess-item").textContent   = item;
    $("paysuccess-comp").textContent   = comp.label + " · Servo " + comp.servo;

    show("screen-paysuccess");

    // Auto-continue to dispensing after 2.5 s
    setTimeout(() => startDispensing(), 2500);
  }

  // ---- Dispensing ----
  function startDispensing() {
    if (!currentItem) return;
    const { letter } = currentItem;
    $("dispensing-letter").textContent = letter;
    $("dispensing-status").textContent = "Dispensing from compartment " + letter + "\u2026";

    const arm = $("servo-arm");
    if (arm) { arm.className = "servo-arm servo-active"; }

    show("screen-dispensing");

    Connection.dispense(letter).then(result => {
      if (arm) arm.className = "servo-arm";
      showCollect(result, letter);
    });
  }

  function showCollect(result, letter) {
    clearTimeout(collectTimer);
    const iconEl = $("collect-icon");
    const msgEl  = $("collect-msg");
    const subEl  = $("collect-sub");
    const collectHome = $("collect-home");

    if (result.ok) {
      if (iconEl) { iconEl.innerHTML = '<svg class="success-check" viewBox="0 0 64 64" aria-hidden="true"><circle class="success-check-circle" cx="32" cy="32" r="28"/><path class="success-check-tick" d="M18 33l9 9 19-20"/></svg>'; iconEl.className = "collect-icon collect-ok"; }
      if (msgEl)  msgEl.textContent = "Please collect your packet from the tray.";
      if (subEl)  subEl.textContent = "Compartment " + letter + " \u00b7 Servo " + result.servo + " \u00b7 " + (result.mode === "demo" ? "Demo mode" : "Connected");
      if (collectHome) collectHome.textContent = "← Back to start";
    } else {
      if (iconEl) { iconEl.textContent = "\u274c"; iconEl.className = "collect-icon collect-err"; }
      if (msgEl) {
        const paid = currentOrder !== null && currentItem && currentItem.type === "symptom";
        msgEl.textContent = paid
          ? "Dispense failed \u2014 demo payment reversed."
          : "Dispense failed.";
      }
      if (subEl)  subEl.textContent = result.message || dispenseErrorText(result.error);
      if (collectHome) collectHome.textContent = "Choose another option";
    }

    show("screen-collect");

    // Auto back to check-in after 12 s
    collectTimer = setTimeout(() => { clearPatient(); show("screen-checkin"); }, 12000);
  }

  function dispenseErrorText(error) {
    const messages = {
      OUT_OF_ORDER: "This compartment is out of order.",
      NO_PACKET: "No packet is available in this compartment.",
      CHUTE_BLOCKED: "The dispensing chute is blocked.",
      BAD_TOKEN: "The dispenser could not verify this request.",
      BAD_LETTER: "The selected compartment is not valid.",
      BUSY: "The dispenser is busy. Please try another option.",
      NOT_INSTALLED: "This dispenser compartment is not installed."
    };
    return messages[error] || error || "The dispenser could not complete the request.";
  }

  // ---- Check-in validation ----
  function validateCheckin() {
    const nameInput = $("checkin-name");
    const mobileInput = $("checkin-mobile");
    const continueBtn = $("checkin-continue");
    const nameErr = $("checkin-name-err");
    const mobileErr = $("checkin-mobile-err");

    const name = nameInput ? nameInput.value.trim() : "";
    const mobile = mobileInput ? mobileInput.value.trim() : "";

    const nameValid = /^[A-Za-z ]{2,40}$/.test(name);
    const mobileValid = /^[6-9]\d{9}$/.test(mobile);

    if (nameErr) nameErr.textContent = nameValid || !name ? "" : "Enter a valid name (2\u201340 letters)";
    if (mobileErr) mobileErr.textContent = mobileValid || !mobile ? "" : "Enter a valid 10-digit mobile number starting with 6\u20139";

    if (continueBtn) continueBtn.disabled = !(nameValid && mobileValid);
    return { nameValid, mobileValid, name, mobile };
  }

  // ---- Event listeners ----
  function attachEvents() {
    // Check-in inputs
    const nameInput = $("checkin-name");
    const mobileInput = $("checkin-mobile");
    if (nameInput) {
      nameInput.addEventListener("input", validateCheckin);
      nameInput.addEventListener("focus", () => setTimeout(() => nameInput.scrollIntoView({ block: "nearest" }), 300));
    }
    if (mobileInput) {
      mobileInput.addEventListener("input", e => {
        // Allow only digits
        e.target.value = e.target.value.replace(/\D/g, "").substring(0, 10);
        validateCheckin();
      });
      mobileInput.addEventListener("focus", () => setTimeout(() => mobileInput.scrollIntoView({ block: "nearest" }), 300));
    }

    // Check-in continue
    const continueBtn = $("checkin-continue");
    if (continueBtn) {
      continueBtn.addEventListener("click", () => {
        const { nameValid, mobileValid, name, mobile } = validateCheckin();
        if (!nameValid || !mobileValid) return;
        // Store in memory only — never localStorage
        patient.name = name;
        patient.mobile = mobile;
        buildHome();
        show("screen-home");
      });
    }

    // Home tiles
    const diagBtn = $("home-diagnosis");
    const emergBtn = $("home-emergency");
    if (diagBtn) diagBtn.addEventListener("click", () => { buildDiagnosisGrid(); show("screen-diagnosis"); });
    if (emergBtn) emergBtn.addEventListener("click", () => { buildEmergencyGrid(); show("screen-emergency"); });

    // Back buttons
    $qa(".btn-back-home").forEach(b => b.addEventListener("click", () => show("screen-home")));
    $qa(".btn-back-checkin").forEach(b => b.addEventListener("click", () => { clearPatient(); show("screen-checkin"); }));
    $qa(".btn-back-diag").forEach(b => b.addEventListener("click", () => show("screen-diagnosis")));
    $qa(".btn-back-emerg").forEach(b => b.addEventListener("click", () => show("screen-emergency")));

    // Detail → dispense
    const dispBtn = $("detail-dispense");
    if (dispBtn) {
      dispBtn.addEventListener("click", () => { dispBtn.disabled = true; startDispenseFlow(); });
    }

    // Payment buttons
    const simBtn = $("pay-simulate");
    if (simBtn) simBtn.addEventListener("click", simulatePayment);

    const cancelBtn = $("pay-cancel");
    if (cancelBtn) cancelBtn.addEventListener("click", () => { clearInterval(paymentCountdown); show("screen-detail"); });

    // Collect home
    const collectHome = $("collect-home");
    if (collectHome) collectHome.addEventListener("click", () => {
      if (currentItem && collectHome.textContent === "Choose another option") {
        clearTimeout(collectTimer);
        currentItem.type === "emergency" ? buildEmergencyGrid() : buildDiagnosisGrid();
        show(currentItem.type === "emergency" ? "screen-emergency" : "screen-diagnosis");
      } else {
        clearPatient(); show("screen-checkin");
      }
    });

    document.addEventListener("sc360status", () => {
      if (currentScreen === "screen-diagnosis") buildDiagnosisGrid();
      if (currentScreen === "screen-emergency") buildEmergencyGrid();
    });

    // End session
    const endBtn = $("btn-end-session");
    if (endBtn) endBtn.addEventListener("click", () => { clearPatient(); show("screen-checkin"); });

    // Emergency 112 (header)
    const e112 = $("btn-emergency-112");
    if (e112) e112.addEventListener("click", () => { if (/Android|iPhone/i.test(navigator.userAgent)) window.location.href = "tel:112"; else alert("Emergency: 112\n\nOn a phone this would dial 112."); });

    // Long-press logo → settings
    const logo = $("header-logo");
    if (logo) {
      const start = e => { longPressTimer = setTimeout(() => show("screen-settings"), 3000); };
      const end   = () => clearTimeout(longPressTimer);
      logo.addEventListener("mousedown", start); logo.addEventListener("mouseup", end); logo.addEventListener("mouseleave", end);
      logo.addEventListener("touchstart", start, { passive: true }); logo.addEventListener("touchend", end);
    }

    // Settings
    const saveBtn = $("settings-save");
    const testBtn2 = $("settings-test");
    const backSettings = $("settings-back");
    if (saveBtn) saveBtn.addEventListener("click", () => {
      SC360.DEVICE_ID = $("settings-device-id").value.trim();
      SC360.TOKEN = $("settings-token").value.trim();
      SC360.MQTT_BROKER_WSS = $("settings-broker").value.trim();
      SC360.MQTT_TOPIC_BASE = "smartcare360/" + SC360.DEVICE_ID;
      try { localStorage.setItem("sc360_settings", JSON.stringify({ DEVICE_ID: SC360.DEVICE_ID, TOKEN: SC360.TOKEN, MQTT_BROKER_WSS: SC360.MQTT_BROKER_WSS })); } catch (e) {}
      $("settings-test-result").textContent = "Saved. Reconnecting\u2026";
      Connection.testConnection().then(r => { $("settings-test-result").textContent = r.ok ? "Connected! Mode: " + r.mode : "Failed: " + r.error; });
    });
    if (testBtn2) testBtn2.addEventListener("click", () => {
      $("settings-test-result").textContent = "Testing\u2026";
      Connection.testConnection().then(r => { $("settings-test-result").textContent = r.ok ? "Connected! Mode: " + r.mode : "Failed: " + r.error; });
    });
    if (backSettings) backSettings.addEventListener("click", () => show(patient.name ? "screen-home" : "screen-checkin"));

    // Reset idle on any touch/key
    ["touchstart", "click", "keydown"].forEach(evt => document.addEventListener(evt, resetIdleTimer, { passive: true }));

    // Settings inputs populate
    const devInput = $("settings-device-id");
    const tokInput = $("settings-token");
    const brkInput = $("settings-broker");
    if (devInput) devInput.value = SC360.DEVICE_ID;
    if (tokInput) tokInput.value = SC360.TOKEN;
    if (brkInput) brkInput.value = SC360.MQTT_BROKER_WSS;
  }

  // ---- Init ----
  function init() {
    attachEvents();
    Connection.init();
    show("screen-checkin");
    // Disable continue button initially
    const btn = $("checkin-continue");
    if (btn) btn.disabled = true;
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", App.init);
