// ============================================================
// SmartCare 360 – Configuration (SINGLE SOURCE OF TRUTH)
// ============================================================
"use strict";

const SC360 = {
  DEVICE_ID: "sc360-k7m2q",
  TOKEN: "123456",
  MQTT_BROKER_WSS: "wss://broker.hivemq.com:8884/mqtt",
  MQTT_TOPIC_BASE: "smartcare360/" + "sc360-k7m2q",
  IDLE_TIMEOUT: 90000,
  DISPENSE_DEMO_TIME: 2800,
  CLOUD_TIMEOUT: 5000,
  RESULT_TIMEOUT: 15000,

  // Demo prices (editable here — one place)
  PRICES: { A: 20, B: 25, C: 30, D: 35, E: 15, F: 40, G: 50, H: 50 },

  // Compartments
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

  // Emergency compartments (skip payment)
  EMERGENCY_LETTERS: ["E", "F", "G", "H"],

  // SVG icons (inline, no emoji — consistent across all devices, works offline)
  ICONS: {
    fever: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="38" r="6"/><line x1="24" y1="8" x2="24" y2="32"/><line x1="17" y1="15" x2="24" y2="15"/><line x1="17" y1="20" x2="24" y2="20"/><line x1="17" y1="25" x2="24" y2="25"/></svg>`,
    headache: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6C15.2 6 8 13.2 8 22c0 5.5 2.7 10.4 6.9 13.4V42h18v-6.6C37.3 32.4 40 27.5 40 22c0-8.8-7.2-16-16-16z"/><line x1="24" y1="18" x2="24" y2="26"/><circle cx="24" cy="29" r="1.5" fill="currentColor" stroke="none"/></svg>`,
    cough: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 20c0-5.5 4.5-10 10-10s10 4.5 10 10"/><path d="M10 28c0-7.7 6.3-14 14-14s14 6.3 14 14"/><path d="M24 28v12"/><path d="M18 36l6 6 6-6"/></svg>`,
    "chest-pain": `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 40l-14-14a9.9 9.9 0 0 1 14-14 9.9 9.9 0 0 1 14 14z"/><line x1="24" y1="20" x2="24" y2="30"/><line x1="19" y1="25" x2="29" y2="25"/></svg>`,
    "stomach-pain": `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="24" cy="26" rx="14" ry="12"/><path d="M16 20c2-3 5-5 8-5s6 2 8 5"/><path d="M20 32c1 2 2.5 3 4 3s3-1 4-3"/><path d="M22 10 Q24 6 26 10"/></svg>`,
    vomiting: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="16" r="10"/><path d="M22 26v8l-4 6"/><path d="M26 26v8l4 6"/><path d="M18 40h12"/></svg>`,
    "body-pain": `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="8" r="4"/><line x1="24" y1="12" x2="24" y2="30"/><line x1="14" y1="18" x2="34" y2="18"/><line x1="24" y1="30" x2="16" y2="44"/><line x1="24" y1="30" x2="32" y2="44"/><circle cx="12" cy="22" r="3" stroke-dasharray="2 2"/><circle cx="36" cy="22" r="3" stroke-dasharray="2 2"/></svg>`,
    weakness: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="8" r="4"/><path d="M24 12v14l-6 10"/><path d="M24 26l6 10"/><path d="M12 24l12 2 12-2"/><path d="M14 42l4-6"/><path d="M34 42l-4-6"/></svg>`,
    "heart-attack": `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 40l-14-14a9.9 9.9 0 0 1 14-14 9.9 9.9 0 0 1 14 14z"/><polyline points="14,24 18,20 22,28 26,18 30,24 34,24"/></svg>`,
    bleeding: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 8 Q32 20 32 28a8 8 0 0 1-16 0Q16 20 24 8z"/><path d="M20 34 Q22 40 24 42 Q26 40 28 34"/></svg>`,
    burn: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 42c-8.8 0-14-5.4-14-12 0-4.5 2.5-8 6-11 0 4 2 6 4 6-1-5 2-10 6-13 0 5 3 8 5 10 2-3 2-7 1-10 4 3 6 8 6 12 0 2.5-.7 4.8-2 6.7C34.7 33.5 32 36 32 38c-1-1-2-3-2-5-2 2-3.5 5.5-2 9h-4z"/></svg>`,
    poisoning: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 8h8l2 6H18z"/><rect x="14" y="14" width="20" height="24" rx="4"/><line x1="24" y1="20" x2="24" y2="30"/><line x1="19" y1="25" x2="29" y2="25"/><circle cx="24" cy="38" r="1.5" fill="currentColor" stroke="none"/></svg>`,
    diagnosis: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="12" y="8" width="40" height="48" rx="4"/><line x1="20" y1="22" x2="44" y2="22"/><line x1="20" y1="30" x2="44" y2="30"/><line x1="20" y1="38" x2="34" y2="38"/><circle cx="44" cy="44" r="6"/><line x1="48.2" y1="48.2" x2="52" y2="52"/></svg>`,
    emergency: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="32,8 58,54 6,54"/><line x1="32" y1="26" x2="32" y2="40"/><circle cx="32" cy="46" r="2" fill="currentColor" stroke="none"/></svg>`
  },

  // Symptoms — medical text verbatim
  SYMPTOMS: [
    {
      id: "fever", title: "Fever", compartment: "A",
      whatMayHelp: [
        "Rest in a cool, comfortable place.",
        "Drink plenty of fluids — water, oral rehydration salts (ORS), or clear soups.",
        "Place a cool, damp cloth on the forehead.",
        "Wear light, loose clothing."
      ],
      seeDoctor: "If temperature is above 103\u00b0F (39.4\u00b0C) or lasts more than 2\u00a0days, seek medical help immediately."
    },
    {
      id: "headache", title: "Headache", compartment: "B",
      whatMayHelp: [
        "Rest in a quiet, dark room.",
        "Apply a cold or warm compress to the forehead or back of the neck.",
        "Stay hydrated \u2014 dehydration is a common cause of headaches.",
        "Gently massage the temples and neck muscles."
      ],
      seeDoctor: "If the headache is sudden and severe, or accompanied by confusion, stiff neck, or vision changes, seek emergency care."
    },
    {
      id: "cough", title: "Cough", compartment: "C",
      whatMayHelp: [
        "Drink warm fluids \u2014 honey with warm water, herbal tea, or clear broth.",
        "Use steam inhalation: breathe in steam from a bowl of hot water (carefully).",
        "Keep the throat moist \u2014 sip water frequently.",
        "Avoid smoke, dust, and strong odours."
      ],
      seeDoctor: "If cough lasts more than 2\u00a0weeks, produces blood, or is accompanied by difficulty breathing, see a doctor urgently."
    },
    {
      id: "chest-pain", title: "Chest Pain", compartment: "D",
      warning: "Chest pain can be a sign of a heart attack. If pain is crushing, spreads to the arm or jaw, or comes with sweating and breathlessness \u2014 call 112 immediately.",
      whatMayHelp: [
        "Stop all physical activity and sit down in a comfortable position.",
        "Loosen any tight clothing around the chest.",
        "Do NOT give anything to eat or drink other than prescribed medication.",
        "Call 112 / emergency services immediately \u2014 do not wait to see if the pain goes away."
      ],
      seeDoctor: "Call 112 immediately. Do not drive yourself to hospital."
    },
    {
      id: "stomach-pain", title: "Stomach Pain", compartment: "A",
      whatMayHelp: [
        "Lie down and rest in a comfortable position.",
        "Sip clear fluids \u2014 water, clear broth, or oral rehydration salts.",
        "Avoid solid food until the pain eases.",
        "Apply a warm (not hot) compress to the abdomen."
      ],
      seeDoctor: "If the pain is severe, persistent, or accompanied by vomiting blood, high fever, or inability to pass gas, seek emergency medical help."
    },
    {
      id: "vomiting", title: "Vomiting", compartment: "B",
      whatMayHelp: [
        "Stop eating solid food. Sip small amounts of clear fluids (water, ORS, clear broth) every 15\u00a0minutes.",
        "Do NOT drink large amounts at once \u2014 this may trigger more vomiting.",
        "Once vomiting stops for 4\u20136\u00a0hours, try bland foods (crackers, plain rice, banana).",
        "Rest in a sitting or side-lying position to prevent choking."
      ],
      seeDoctor: "Seek medical help if vomiting lasts more than 24\u00a0hours, contains blood, or is accompanied by severe headache, stiff neck, or confusion."
    },
    {
      id: "body-pain", title: "Body Pain", compartment: "C",
      whatMayHelp: [
        "Rest the affected area and avoid strenuous activity.",
        "Apply a cold pack for the first 24\u201348\u00a0hours (wrap in cloth, 15\u00a0min on / 15\u00a0min off).",
        "After 48\u00a0hours, switch to warm compresses to relax muscles.",
        "Gently stretch and move joints to prevent stiffness."
      ],
      seeDoctor: "If pain is severe, unexplained, or lasts more than a week, consult a doctor."
    },
    {
      id: "weakness", title: "Weakness", compartment: "D",
      whatMayHelp: [
        "Sit or lie down immediately to prevent falls.",
        "Drink fluids \u2014 water or an electrolyte drink (ORS).",
        "Eat a small snack with sugar and salt (biscuit, fruit, light meal).",
        "Rest in a cool, well-ventilated area."
      ],
      seeDoctor: "If weakness is sudden, one-sided, or accompanied by slurred speech, drooping face, or confusion, call 112 \u2014 it may be a stroke."
    }
  ],

  // Emergencies — medical text verbatim
  EMERGENCIES: [
    {
      id: "heart-attack", title: "Heart Attack", compartment: "G",
      whatMayHelp: [
        "Call 112 immediately.",
        "Have the person sit down and rest in a comfortable position (semi-reclined).",
        "Loosen any tight clothing.",
        "If the person becomes unconscious and stops breathing, start hands-only CPR: push hard and fast in the centre of the chest.",
        "Do NOT leave the person alone."
      ],
      seeDoctor: "Call 112 immediately. This is a life-threatening emergency."
    },
    {
      id: "bleeding", title: "Bleeding", compartment: "E",
      whatMayHelp: [
        "Apply firm, direct pressure to the wound using a clean cloth or bandage.",
        "Keep pressing \u2014 do NOT lift the cloth to check. If it soaks through, add another layer on top.",
        "Elevate the injured limb above the level of the heart (if possible).",
        "If bleeding is from a limb and cannot be controlled, apply a tourniquet 5\u20137\u00a0cm above the wound (note the time)."
      ],
      seeDoctor: "Call 112 if bleeding does not stop within 10\u00a0minutes, or if the wound is deep, gaping, or on the head/neck/torso."
    },
    {
      id: "burn", title: "Burn", compartment: "F",
      whatMayHelp: [
        "Cool the burn under cool (not ice-cold) running water for at least 10\u00a0minutes.",
        "Remove rings, watches, and tight clothing near the burn before swelling starts.",
        "Cover the burn loosely with a clean, non-stick bandage or cling film.",
        "Do NOT apply ice, butter, toothpaste, or any home remedy.",
        "Do NOT burst blisters."
      ],
      seeDoctor: "For burns larger than the person\u2019s palm, on the face, hands, joints, or genitals, or if caused by chemicals or electricity \u2014 call 112."
    },
    {
      id: "poisoning", title: "Poisoning", compartment: "H",
      whatMayHelp: [
        "Call 112 or the poison control centre immediately.",
        "Try to identify the substance, the amount, and the time it was taken.",
        "If the person is conscious, do NOT induce vomiting unless specifically told to by a medical professional.",
        "If the poison is on the skin, remove contaminated clothing and rinse the skin with running water for 15\u201320\u00a0minutes.",
        "If the person is unconscious but breathing, place them in the recovery position (on their side).",
        "If the person stops breathing, begin CPR."
      ],
      seeDoctor: "Call 112 or the poison control centre immediately. This is a medical emergency."
    }
  ],

  DISCLAIMER: "College demonstration with dummy packets. Not a medical diagnosis or prescription. In an emergency, call 112."
};

// Load MQTT settings from localStorage (never patient data)
(function loadSavedSettings() {
  try {
    const saved = localStorage.getItem("sc360_settings");
    if (saved) {
      const s = JSON.parse(saved);
      if (s.DEVICE_ID)       SC360.DEVICE_ID       = s.DEVICE_ID;
      if (s.TOKEN)           SC360.TOKEN           = s.TOKEN;
      if (s.MQTT_BROKER_WSS) SC360.MQTT_BROKER_WSS = s.MQTT_BROKER_WSS;
    }
    SC360.MQTT_TOPIC_BASE = "smartcare360/" + SC360.DEVICE_ID;
  } catch (e) {
    console.warn("Could not load saved settings:", e);
  }
})();
