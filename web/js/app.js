/* ============================================================
   SmartCare 360 – Application Logic
   ============================================================
   Screens, animations, idle timeout, hidden settings panel.
   Reads all data from SC360 (config.js).
   Calls Connection.dispense(letter) for all hardware control.
   ============================================================ */

"use strict";

const App = (function () {
  // ----------------------------------------------------------
  // State
  // ----------------------------------------------------------
  let currentScreen = "home";   // "home" | "symptom" | "emergency" | "result" | "dispensing" | "settings"
  let idleTimer = null;
  let longPressTimer = null;

  // ----------------------------------------------------------
  // DOM helpers
  // ----------------------------------------------------------
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function show(id) {
    $$(".screen").forEach(function (el) {
      el.classList.remove("screen-active");
      el.setAttribute("aria-hidden", "true");
    });
    var el = document.getElementById(id);
    if (el) {
      el.classList.add("screen-active");
      el.setAttribute("aria-hidden", "false");
    }
    currentScreen = id;
    resetIdleTimer();
  }

  // ----------------------------------------------------------
  // Build the UI from config data
  // ----------------------------------------------------------
  function buildUI() {
    buildSymptomGrid();
    buildEmergencyGrid();
    buildSettingsPanel();
    attachEventListeners();
  }

  // ----------------------------------------------------------
  // Symptom grid (home screen)
  // ----------------------------------------------------------
  function buildSymptomGrid() {
    var grid = $("#symptom-grid");
    if (!grid) return;

    SC360.SYMPTOMS.forEach(function (s, i) {
      var btn = document.createElement("button");
      btn.className = "symptom-card";
      btn.setAttribute("data-symptom", s.id);
      btn.setAttribute("aria-label", s.title);
      // Stagger animation delay
      btn.style.animationDelay = (i * 0.08) + "s";

      btn.innerHTML =
        '<span class="symptom-icon" aria-hidden="true">' + s.icon + '</span>' +
        '<span class="symptom-title">' + escapeHtml(s.title) + '</span>';

      btn.addEventListener("click", function () {
        showSymptomDetail(s);
      });

      grid.appendChild(btn);
    });
  }

  // ----------------------------------------------------------
  // Emergency grid (home screen)
  // ----------------------------------------------------------
  function buildEmergencyGrid() {
    var grid = $("#emergency-grid");
    if (!grid) return;

    SC360.EMERGENCIES.forEach(function (e, i) {
      var btn = document.createElement("button");
      btn.className = "emergency-card";
      btn.setAttribute("data-emergency", e.id);
      btn.setAttribute("aria-label", e.title);
      btn.style.animationDelay = ((SC360.SYMPTOMS.length + i) * 0.08) + "s";

      btn.innerHTML =
        '<span class="symptom-icon" aria-hidden="true">' + e.icon + '</span>' +
        '<span class="symptom-title">' + escapeHtml(e.title) + '</span>';

      btn.addEventListener("click", function () {
        showEmergencyDetail(e);
      });

      grid.appendChild(btn);
    });
  }

  // ----------------------------------------------------------
  // Symptom detail screen
  // ----------------------------------------------------------
  function showSymptomDetail(symptom) {
    var screen = $("#screen-detail");
    var title = $("#detail-title");
    var icon = $("#detail-icon");
    var warning = $("#detail-warning");
    var steps = $("#detail-steps");
    var dispenseBtn = $("#detail-dispense");

    title.textContent = symptom.title;
    icon.textContent = symptom.icon;

    // Warning (chest pain has a special red warning)
    if (symptom.warning) {
      warning.textContent = symptom.warning;
      warning.style.display = "block";
    } else {
      warning.textContent = "";
      warning.style.display = "none";
    }

    // First-aid steps
    steps.innerHTML = "";
    symptom.firstAid.forEach(function (step) {
      var li = document.createElement("li");
      li.textContent = step;
      steps.appendChild(li);
    });

    // Dispense button
    dispenseBtn.setAttribute("data-compartment", symptom.compartment);
    dispenseBtn.textContent = "Dispense Packet";
    dispenseBtn.disabled = false;

    show("screen-detail");
  }

  // ----------------------------------------------------------
  // Emergency detail screen
  // ----------------------------------------------------------
  function showEmergencyDetail(emergency) {
    var screen = $("#screen-detail");
    var title = $("#detail-title");
    var icon = $("#detail-icon");
    var warning = $("#detail-warning");
    var steps = $("#detail-steps");
    var dispenseBtn = $("#detail-dispense");

    title.textContent = emergency.title;
    icon.textContent = emergency.icon;

    // Emergencies always show 112 warning
    warning.textContent = "This is an emergency. Call 112 immediately!";
    warning.style.display = "block";

    // First-aid steps
    steps.innerHTML = "";
    emergency.firstAid.forEach(function (step) {
      var li = document.createElement("li");
      li.textContent = step;
      steps.appendChild(li);
    });

    // Dispense button
    dispenseBtn.setAttribute("data-compartment", emergency.compartment);
    dispenseBtn.textContent = "Dispense Emergency Kit";
    dispenseBtn.disabled = false;

    show("screen-detail");
  }

  // ----------------------------------------------------------
  // Dispense action
  // ----------------------------------------------------------
  function startDispense(letter) {
    // Show dispensing animation screen
    var dispScreen = $("#screen-dispensing");
    var servoAnim = $("#servo-animation");
    var dispStatus = $("#dispensing-status");
    var dispLetter = $("#dispensing-letter");

    dispLetter.textContent = letter;
    dispStatus.textContent = "Dispensing from compartment " + letter + "…";
    servoAnim.className = "servo-arm servo-active";

    show("screen-dispensing");

    // Call the connection manager
    Connection.dispense(letter).then(function (result) {
      showResult(result, letter);
    });
  }

  // ----------------------------------------------------------
  // Result screen
  // ----------------------------------------------------------
  function showResult(result, letter) {
    var resultIcon = $("#result-icon");
    var resultTitle = $("#result-title");
    var resultMsg = $("#result-message");
    var resultMode = $("#result-mode");

    if (result.ok) {
      resultIcon.textContent = "✅";
      resultIcon.className = "result-icon result-success";
      resultTitle.textContent = "Packet Dispensed!";
      resultMsg.textContent = "Compartment " + letter + " — Servo " + result.servo;
    } else {
      resultIcon.textContent = "❌";
      resultIcon.className = "result-icon result-error";
      resultTitle.textContent = "Dispense Failed";
      var errorMessages = {
        "NOT_INSTALLED": "Servo not installed for compartment " + letter + ".",
        "BUSY": "Dispenser is busy. Please wait and try again.",
        "BAD_TOKEN": "Authentication failed. Check settings.",
        "BAD_LETTER": "Invalid compartment letter.",
        "TIMEOUT": "Lost connection to dispenser.",
        "NETWORK_ERROR": "Network error. Check connection.",
        "NOT_CONNECTED": "Not connected to MQTT broker."
      };
      resultMsg.textContent = errorMessages[result.error] || ("Error: " + result.error);
    }

    // Show connection mode
    var modeLabels = {
      "cloud": "Cloud (MQTT)",
      "local": "Local (HTTP)",
      "demo": "Demo mode"
    };
    resultMode.textContent = modeLabels[result.mode] || result.mode;

    show("screen-result");

    // Auto-return to home after 6 seconds
    setTimeout(function () {
      if (currentScreen === "screen-result") {
        show("screen-home");
      }
    }, 6000);
  }

  // ----------------------------------------------------------
  // Event listeners
  // ----------------------------------------------------------
  function attachEventListeners() {
    // Back buttons
    $$(".btn-back").forEach(function (btn) {
      btn.addEventListener("click", function () {
        show("screen-home");
      });
    });

    // Dispense button on detail screen
    var dispenseBtn = $("#detail-dispense");
    if (dispenseBtn) {
      dispenseBtn.addEventListener("click", function () {
        var letter = this.getAttribute("data-compartment");
        if (letter) {
          this.disabled = true;
          startDispense(letter);
        }
      });
    }

    // Home button on result screen
    var homeBtn = $("#result-home");
    if (homeBtn) {
      homeBtn.addEventListener("click", function () {
        show("screen-home");
      });
    }

    // Emergency 112 button
    var emergencyBtn = $("#btn-emergency-112");
    if (emergencyBtn) {
      emergencyBtn.addEventListener("click", function () {
        // On a real phone, this would dial 112
        if (navigator.userAgent.match(/Android|iPhone/i)) {
          window.location.href = "tel:112";
        } else {
          alert("Emergency Number: 112\n\nOn a phone, this button would dial 112.");
        }
      });
    }

    // Emergency 112 on detail screen
    var detailEmergency = $("#detail-emergency-112");
    if (detailEmergency) {
      detailEmergency.addEventListener("click", function () {
        if (navigator.userAgent.match(/Android|iPhone/i)) {
          window.location.href = "tel:112";
        } else {
          alert("Emergency Number: 112\n\nOn a phone, this button would dial 112.");
        }
      });
    }

    // Long-press logo → settings panel
    var logo = $("#header-logo");
    if (logo) {
      logo.addEventListener("touchstart", function (e) {
        longPressTimer = setTimeout(function () {
          show("screen-settings");
        }, 3000);
      });
      logo.addEventListener("touchend", function () {
        clearTimeout(longPressTimer);
      });
      logo.addEventListener("touchcancel", function () {
        clearTimeout(longPressTimer);
      });
      // Also support mouse for desktop testing
      logo.addEventListener("mousedown", function () {
        longPressTimer = setTimeout(function () {
          show("screen-settings");
        }, 3000);
      });
      logo.addEventListener("mouseup", function () {
        clearTimeout(longPressTimer);
      });
    }

    // Reset idle timer on any interaction
    ["touchstart", "click", "keydown"].forEach(function (evt) {
      document.addEventListener(evt, function () {
        resetIdleTimer();
      }, { passive: true });
    });
  }

  // ----------------------------------------------------------
  // Settings panel
  // ----------------------------------------------------------
  function buildSettingsPanel() {
    var deviceInput = $("#settings-device-id");
    var tokenInput = $("#settings-token");
    var brokerInput = $("#settings-broker");
    var saveBtn = $("#settings-save");
    var testBtn = $("#settings-test");
    var testResult = $("#settings-test-result");
    var backBtn = $("#settings-back");

    if (!deviceInput) return;

    // Load current values
    deviceInput.value = SC360.DEVICE_ID;
    tokenInput.value = SC360.TOKEN;
    brokerInput.value = SC360.MQTT_BROKER_WSS;

    // Save
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        SC360.DEVICE_ID = deviceInput.value.trim();
        SC360.TOKEN = tokenInput.value.trim();
        SC360.MQTT_BROKER_WSS = brokerInput.value.trim();

        try {
          localStorage.setItem("sc360_settings", JSON.stringify({
            DEVICE_ID: SC360.DEVICE_ID,
            TOKEN: SC360.TOKEN,
            MQTT_BROKER_WSS: SC360.MQTT_BROKER_WSS
          }));
        } catch (e) { /* ignore */ }

        testResult.textContent = "Settings saved. Reconnecting…";
        testResult.className = "settings-result";

        // Reconnect
        Connection.testConnection().then(function (r) {
          if (r.ok) {
            testResult.textContent = "Connected! Mode: " + r.mode;
            testResult.className = "settings-result settings-ok";
          } else {
            testResult.textContent = "Failed: " + r.error;
            testResult.className = "settings-result settings-err";
          }
        });
      });
    }

    // Test
    if (testBtn) {
      testBtn.addEventListener("click", function () {
        testResult.textContent = "Testing…";
        testResult.className = "settings-result";
        Connection.testConnection().then(function (r) {
          if (r.ok) {
            testResult.textContent = "Connected! Mode: " + r.mode;
            testResult.className = "settings-result settings-ok";
          } else {
            testResult.textContent = "Failed: " + r.error;
            testResult.className = "settings-result settings-err";
          }
        });
      });
    }

    // Back
    if (backBtn) {
      backBtn.addEventListener("click", function () {
        show("screen-home");
      });
    }
  }

  // ----------------------------------------------------------
  // Idle timer — returns to home after 90 s of inactivity
  // ----------------------------------------------------------
  function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (currentScreen !== "screen-home" && currentScreen !== "screen-dispensing") {
        show("screen-home");
      }
    }, SC360.IDLE_TIMEOUT);
  }

  // ----------------------------------------------------------
  // Escape HTML for safe insertion
  // ----------------------------------------------------------
  function escapeHtml(text) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  // ----------------------------------------------------------
  // Initialise — called once on DOMContentLoaded
  // ----------------------------------------------------------
  function init() {
    buildUI();
    Connection.init();
    show("screen-home");
    resetIdleTimer();
  }

  // ----------------------------------------------------------
  // Public API
  // ----------------------------------------------------------
  return {
    init: init,
    showHome: function () { show("screen-home"); }
  };
})();

// ----------------------------------------------------------
// Start the app when the DOM is ready
// ----------------------------------------------------------
document.addEventListener("DOMContentLoaded", App.init);
