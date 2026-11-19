// ============================================================
// SmartCare 360 – Configuration (SINGLE SOURCE OF TRUTH)
// ============================================================
// Edit compartment mappings, symptom/emergency data, and
// MQTT settings here.  Every other file reads from this object.
// ============================================================

"use strict";

const SC360 = {
  // ----------------------------------------------------------
  // DEVICE_ID  — must match secrets.h on your ESP32
  // ----------------------------------------------------------
  DEVICE_ID: "sc360-7f3k9q",

  // ----------------------------------------------------------
  // TOKEN  — simple demo-grade secret; must match secrets.h
  // ----------------------------------------------------------
  TOKEN: "demo-token-2024",

  // ----------------------------------------------------------
  // MQTT BROKER
  // Browser uses wss:// (secure WebSocket on port 8884)
  // ESP32 uses plain mqtt:// on port 1883
  // ----------------------------------------------------------
  MQTT_BROKER_WSS: "wss://broker.hivemq.com:8884/mqtt",

  // ----------------------------------------------------------
  // IDLE TIMEOUT (ms) — return to home screen after inactivity
  // ----------------------------------------------------------
  IDLE_TIMEOUT: 90000, // 90 seconds

  // ----------------------------------------------------------
  // DISPENSE HOLD TIME (ms) — how long the servo animation runs
  // ----------------------------------------------------------
  DISPENSE_DEMO_TIME: 2800, // 2.8 seconds (matches servo hold)

  // ----------------------------------------------------------
  // CLOUD CONNECT TIMEOUT (ms) — how long to wait for ESP32
  // "online" status before falling back to Demo mode
  // ----------------------------------------------------------
  CLOUD_TIMEOUT: 5000, // 5 seconds

  // ----------------------------------------------------------
  // MQTT RESULT TIMEOUT (ms) — how long to wait for dispense
  // result from the ESP32 before showing "Lost connection"
  // ----------------------------------------------------------
  RESULT_TIMEOUT: 15000, // 15 seconds

  // ----------------------------------------------------------
  // COMPARTMENT MAP
  // Maps each compartment letter (A–H) to a servo number (1–4)
  // and a direction ("left" = 5°, "right" = 175°).
  //
  // Servo 1 (D18): A=left, B=right
  // Servo 2 (D19): C=left, D=right
  // Servo 3 (D23): G=left, H=right
  // Servo 4 (D32): E=left, F=right
  // ----------------------------------------------------------
  COMPARTMENTS: {
    A: { servo: 1, side: "left",  label: "Compartment A" },
    B: { servo: 1, side: "right", label: "Compartment B" },
    C: { servo: 2, side: "left",  label: "Compartment C" },
    D: { servo: 2, side: "right", label: "Compartment D" },
    E: { servo: 4, side: "left",  label: "Compartment E" },
    F: { servo: 4, side: "right", label: "Compartment F" },
    G: { servo: 3, side: "left",  label: "Compartment G" },
    H: { servo: 3, side: "right", label: "Compartment H" }
  },

  // ----------------------------------------------------------
  // SYMPTOMS — 8 common conditions
  // Each has: title, compartment letter, icon (emoji),
  //           firstAid (array of steps), and optional warning.
  //
  // *** Medical text copied word-for-word from the approved
  //     reference design.  Do NOT edit medical content. ***
  // ----------------------------------------------------------
  SYMPTOMS: [
    {
      id: "fever",
      title: "Fever",
      compartment: "A",
      icon: "🌡️",
      firstAid: [
        "Rest in a cool, comfortable place.",
        "Drink plenty of fluids — water, oral rehydration salts (ORS), or clear soups.",
        "Place a cool, damp cloth on the forehead.",
        "Wear light, loose clothing.",
        "If temperature is above 103 °F (39.4 °C) or lasts more than 2 days, seek medical help immediately."
      ]
    },
    {
      id: "headache",
      title: "Headache",
      compartment: "B",
      icon: "🤕",
      firstAid: [
        "Rest in a quiet, dark room.",
        "Apply a cold or warm compress to the forehead or back of the neck.",
        "Stay hydrated — dehydration is a common cause of headaches.",
        "Gently massage the temples and neck muscles.",
        "If the headache is sudden and severe, or accompanied by confusion, stiff neck, or vision changes, seek emergency care."
      ]
    },
    {
      id: "cough",
      title: "Cough",
      compartment: "C",
      icon: "😷",
      firstAid: [
        "Drink warm fluids — honey with warm water, herbal tea, or clear broth.",
        "Use steam inhalation: breathe in steam from a bowl of hot water (carefully).",
        "Keep the throat moist — sip water frequently.",
        "Avoid smoke, dust, and strong odours.",
        "If cough lasts more than 2 weeks, produces blood, or is accompanied by difficulty breathing, see a doctor urgently."
      ]
    },
    {
      id: "chest-pain",
      title: "Chest Pain",
      compartment: "D",
      icon: "💔",
      warning: "Chest pain can be a sign of a heart attack. If pain is crushing, spreads to the arm or jaw, or comes with sweating and breathlessness — call 112 immediately and chew an aspirin if available.",
      firstAid: [
        "Stop all physical activity and sit down in a comfortable position.",
        "Loosen any tight clothing around the chest.",
        "If the person is conscious and not allergic, let them chew an aspirin (if available).",
        "Do NOT give anything to eat or drink other than prescribed medication.",
        "Call 112 / emergency services immediately — do not wait to see if the pain goes away."
      ]
    },
    {
      id: "stomach-pain",
      title: "Stomach Pain",
      compartment: "A",
      icon: "🤢",
      firstAid: [
        "Lie down and rest in a comfortable position.",
        "Sip clear fluids — water, clear broth, or oral rehydration salts.",
        "Avoid solid food until the pain eases.",
        "Apply a warm (not hot) compress to the abdomen.",
        "If the pain is severe, persistent, or accompanied by vomiting blood, high fever, or inability to pass gas, seek emergency medical help."
      ]
    },
    {
      id: "vomiting",
      title: "Vomiting",
      compartment: "B",
      icon: "🤮",
      firstAid: [
        "Stop eating solid food. Sip small amounts of clear fluids (water, ORS, clear broth) every 15 minutes.",
        "Do NOT drink large amounts at once — this may trigger more vomiting.",
        "Once vomiting stops for 4–6 hours, try bland foods (crackers, plain rice, banana).",
        "Rest in a sitting or side-lying position to prevent choking.",
        "Seek medical help if vomiting lasts more than 24 hours, contains blood, or is accompanied by severe headache, stiff neck, or confusion."
      ]
    },
    {
      id: "body-pain",
      title: "Body Pain",
      compartment: "C",
      icon: "🦴",
      firstAid: [
        "Rest the affected area and avoid strenuous activity.",
        "Apply a cold pack for the first 24–48 hours (wrap in cloth, 15 min on / 15 min off).",
        "After 48 hours, switch to warm compresses to relax muscles.",
        "Gently stretch and move joints to prevent stiffness.",
        "If pain is severe, unexplained, or lasts more than a week, consult a doctor."
      ]
    },
    {
      id: "weakness",
      title: "Weakness",
      compartment: "D",
      icon: "😵",
      firstAid: [
        "Sit or lie down immediately to prevent falls.",
        "Drink fluids — water or an electrolyte drink (ORS).",
        "Eat a small snack with sugar and salt (biscuit, fruit, light meal).",
        "Rest in a cool, well-ventilated area.",
        "If weakness is sudden, one-sided, or accompanied by slurred speech, drooping face, or confusion, call 112 — it may be a stroke."
      ]
    }
  ],

  // ----------------------------------------------------------
  // EMERGENCIES — 4 critical conditions
  // *** Medical text copied word-for-word from the approved
  //     reference design.  Do NOT edit medical content. ***
  // ----------------------------------------------------------
  EMERGENCIES: [
    {
      id: "heart-attack",
      title: "Heart Attack",
      compartment: "G",
      icon: "❤️‍🩹",
      firstAid: [
        "Call 112 immediately.",
        "Have the person sit down and rest in a comfortable position (semi-reclined).",
        "If the person is conscious and not allergic, let them chew an aspirin.",
        "Loosen any tight clothing.",
        "If the person becomes unconscious and stops breathing, begin CPR: 30 chest compressions followed by 2 rescue breaths. Continue until help arrives.",
        "Do NOT leave the person alone."
      ]
    },
    {
      id: "bleeding",
      title: "Bleeding",
      compartment: "E",
      icon: "🩸",
      firstAid: [
        "Apply firm, direct pressure to the wound using a clean cloth or bandage.",
        "Keep pressing — do NOT lift the cloth to check. If it soaks through, add another layer on top.",
        "Elevate the injured limb above the level of the heart (if possible).",
        "If bleeding is from a limb and cannot be controlled, apply a tourniquet 5–7 cm above the wound (note the time).",
        "Call 112 if bleeding does not stop within 10 minutes, or if the wound is deep, gaping, or on the head/neck/torso."
      ]
    },
    {
      id: "burn",
      title: "Burn",
      compartment: "F",
      icon: "🔥",
      firstAid: [
        "Cool the burn under cool (not ice-cold) running water for at least 10 minutes.",
        "Remove rings, watches, and tight clothing near the burn before swelling starts.",
        "Cover the burn loosely with a clean, non-stick bandage or cling film.",
        "Do NOT apply ice, butter, toothpaste, or any home remedy.",
        "Do NOT burst blisters.",
        "For burns larger than the person's palm, on the face, hands, joints, or genitals, or if caused by chemicals or electricity — call 112."
      ]
    },
    {
      id: "poisoning",
      title: "Poisoning",
      compartment: "H",
      icon: "☠️",
      firstAid: [
        "Call 112 or the poison control centre immediately.",
        "Try to identify the substance, the amount, and the time it was taken.",
        "If the person is conscious, do NOT induce vomiting unless specifically told to by a medical professional.",
        "If the poison is on the skin, remove contaminated clothing and rinse the skin with running water for 15–20 minutes.",
        "If the person is unconscious but breathing, place them in the recovery position (on their side).",
        "If the person stops breathing, begin CPR."
      ]
    }
  ],

  // ----------------------------------------------------------
  // FOOTER DISCLAIMER — shown on every screen
  // ----------------------------------------------------------
  DISCLAIMER: "College demonstration with dummy packets. Not a medical diagnosis or prescription. In an emergency, call 112."
};

// ----------------------------------------------------------
// Allow settings to be overridden from localStorage
// (used by the hidden settings panel)
// ----------------------------------------------------------
(function loadSavedSettings() {
  try {
    const saved = localStorage.getItem("sc360_settings");
    if (saved) {
      const s = JSON.parse(saved);
      if (s.DEVICE_ID)       SC360.DEVICE_ID       = s.DEVICE_ID;
      if (s.TOKEN)           SC360.TOKEN           = s.TOKEN;
      if (s.MQTT_BROKER_WSS) SC360.MQTT_BROKER_WSS = s.MQTT_BROKER_WSS;
    }
  } catch (e) {
    // If localStorage is unavailable or corrupt, use defaults
    console.warn("Could not load saved settings:", e);
  }
})();
