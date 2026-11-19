// ============================================================
// SmartCare 360 – ESP32 Firmware
// ============================================================
// Controls 4 SG90 servos to dispense dummy medicine packets.
// Connects via MQTT (Cloud) or serves a local web dashboard.
//
// Hardware:
//   ESP32 DevKit V1 (30-pin, Type-C)
//   4× SG90 servos (pins D18, D19, D23, D32)
//   16×2 I2C LCD (SDA D21, SCL D22)
//   Passive buzzer (D25)
//   LED (D26, 220 Ω)
//   Push button (D27, INPUT_PULLUP)
//
// Libraries needed (install via Arduino Library Manager):
//   - ESP32Servo           by Kevin Harrington
//   - LiquidCrystal I2C    by Frank de Brabander
//   - PubSubClient         by Nick O'Leary
//   - ArduinoJson          v7 by Benoit Blanchon
// ============================================================

#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include <ESP32Servo.h>
#include <LiquidCrystal_I2C.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

#include "config.h"
#include "secrets.h"

// If the offline dashboard header exists, include it
#if __has_include("dashboard_html.h")
  #include "dashboard_html.h"
  #define HAS_DASHBOARD 1
#else
  #define HAS_DASHBOARD 0
#endif

// ============================================================
// GLOBAL OBJECTS
// ============================================================

// Servos
Servo servo1, servo2, servo3, servo4;
Servo* servos[4] = { &servo1, &servo2, &servo3, &servo4 };
const int servoPins[4] = { SERVO1_PIN, SERVO2_PIN, SERVO3_PIN, SERVO4_PIN };
const bool servoInstalled[4] = {
  SERVO1_INSTALLED, SERVO2_INSTALLED,
  SERVO3_INSTALLED, SERVO4_INSTALLED
};

// LCD — address auto-detected in setup()
LiquidCrystal_I2C* lcd = nullptr;

// Web server (runs on port 80)
WebServer server(80);

// MQTT
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

// ============================================================
// STATE
// ============================================================
bool wifiConnected = false;         // Station mode connected?
bool mqttConnectedFlag = false;     // MQTT broker connected?
bool isBusy = false;                // Servo currently moving?
bool apMode = false;                // Running as access point?
unsigned long lastMqttAttempt = 0;  // For non-blocking reconnect

// Dedup buffer — last N command IDs (prevent double dispense)
String dedupBuffer[DEDUP_BUFFER_SIZE];
int dedupIndex = 0;

// MQTT topics (built in setup)
String topicCmd;
String topicResult;
String topicStatus;

// ============================================================
// FORWARD DECLARATIONS
// ============================================================
void setupLCD();
void setupServos();
void setupBuzzer();
void lcdPrint(const char* line1, const char* line2 = "");
void connectWiFi();
void startAccessPoint();
void setupWebServer();
void connectMqtt();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void publishStatus(bool online);
bool dispenseCompartment(char letter, int* outServo);
void moveServo(int servoNum, char direction);
void buzzSuccess();
void buzzError();
void blinkLED(int times, int delayMs);
void handleSerial();
void handleButton();
bool isDuplicate(const String& id);
void addToDedup(const String& id);
String getStatusJson();

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n=== SmartCare 360 ===");
  Serial.println("Starting up...");

  // --- Pin modes ---
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  // --- LCD ---
  setupLCD();
  lcdPrint("SmartCare 360", "Starting...");

  // --- Servos ---
  setupServos();

  // --- Build MQTT topics ---
  topicCmd    = String(MQTT_TOPIC_PREFIX) + DEVICE_ID + "/cmd";
  topicResult = String(MQTT_TOPIC_PREFIX) + DEVICE_ID + "/result";
  topicStatus = String(MQTT_TOPIC_PREFIX) + DEVICE_ID + "/status";

  // --- Wi-Fi ---
  connectWiFi();

  if (wifiConnected) {
    // Station mode: connect to MQTT + start HTTP server
    lcdPrint("Cloud ready", WiFi.localIP().toString().c_str());
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());

    // Reduce TX power to save current
    WiFi.setTxPower(WIFI_POWER_8_5dBm);

    // MQTT setup
    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    mqttClient.setBufferSize(512);
    mqttClient.setCallback(mqttCallback);
    connectMqtt();

    // Also start HTTP server on the station IP
    setupWebServer();
    server.begin();
    Serial.println("HTTP server started on station IP");
  } else {
    // Access point mode
    startAccessPoint();
    setupWebServer();
    server.begin();
    Serial.println("HTTP server started at 192.168.4.1");
  }

  // Startup blink
  blinkLED(3, 150);
  buzzSuccess();

  Serial.println("Ready! Commands: A-H, 1-8, 0 (all), R (reset), ? (status)");
}

// ============================================================
// MAIN LOOP
// ============================================================
void loop() {
  // Handle web server requests
  server.handleClient();

  // Handle MQTT (non-blocking)
  if (wifiConnected) {
    if (!mqttClient.connected()) {
      // Reconnect without blocking
      unsigned long now = millis();
      if (now - lastMqttAttempt > MQTT_RECONNECT_MS) {
        lastMqttAttempt = now;
        connectMqtt();
      }
    } else {
      mqttClient.loop();
    }

    // Check Wi-Fi connection
    if (WiFi.status() != WL_CONNECTED) {
      wifiConnected = false;
      mqttConnectedFlag = false;
      lcdPrint("WiFi lost!", "Reconnecting...");
      connectWiFi();
    }
  }

  // Handle serial commands
  handleSerial();

  // Handle push button
  handleButton();

  // Small delay to prevent watchdog issues
  delay(10);
}

// ============================================================
// LCD SETUP — auto-detect I2C address
// ============================================================
void setupLCD() {
  Wire.begin(LCD_SDA, LCD_SCL);

  for (int i = 0; i < LCD_ADDR_COUNT; i++) {
    Wire.beginTransmission(LCD_ADDRESSES[i]);
    if (Wire.endTransmission() == 0) {
      lcd = new LiquidCrystal_I2C(LCD_ADDRESSES[i], LCD_COLS, LCD_ROWS);
      lcd->init();
      lcd->backlight();
      Serial.printf("LCD found at 0x%02X\n", LCD_ADDRESSES[i]);
      return;
    }
  }

  Serial.println("WARNING: No LCD found! Continuing without display.");
}

void lcdPrint(const char* line1, const char* line2) {
  if (!lcd) return;
  lcd->clear();
  lcd->setCursor(0, 0);
  lcd->print(line1);
  if (line2 && line2[0] != '\0') {
    lcd->setCursor(0, 1);
    lcd->print(line2);
  }
}

// ============================================================
// SERVO SETUP
// ============================================================
void setupServos() {
  // Allocate timers for servos
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  for (int i = 0; i < 4; i++) {
    if (servoInstalled[i]) {
      servos[i]->setPeriodHertz(50);
      servos[i]->attach(servoPins[i], 500, 2400);
      servos[i]->write(SERVO_CENTER);
      Serial.printf("Servo %d attached on pin %d\n", i + 1, servoPins[i]);
    }
  }

  delay(500); // Let servos reach centre
}

// ============================================================
// BUZZER (passive)
// ============================================================
void setupBuzzer() {
  // Nothing needed — we use tone() and noTone()
}

void buzzSuccess() {
  // Two rising tones
  tone(BUZZER_PIN, 1000, 100);
  delay(120);
  tone(BUZZER_PIN, 1500, 100);
  delay(120);
  noTone(BUZZER_PIN);
}

void buzzError() {
  // Low buzz
  tone(BUZZER_PIN, 300, 300);
  delay(350);
  noTone(BUZZER_PIN);
}

// ============================================================
// LED
// ============================================================
void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    if (i < times - 1) delay(delayMs);
  }
}

// ============================================================
// WI-FI
// ============================================================
void connectWiFi() {
  lcdPrint("Connecting WiFi", WIFI_SSID);
  Serial.printf("Connecting to Wi-Fi: %s\n", WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - start > WIFI_TIMEOUT_MS) {
      Serial.println("\nWi-Fi connection timeout!");
      wifiConnected = false;
      return;
    }
    delay(500);
    Serial.print(".");
    // Blink LED while connecting
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
  }

  Serial.println("\nWi-Fi connected!");
  wifiConnected = true;
  digitalWrite(LED_PIN, HIGH); // Solid LED = connected
}

void startAccessPoint() {
  Serial.println("Starting access point: " AP_SSID);
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASSWORD);
  WiFi.setTxPower(WIFI_POWER_8_5dBm);
  apMode = true;

  IPAddress ip = WiFi.softAPIP();
  Serial.print("AP IP: ");
  Serial.println(ip);
  lcdPrint("Offline mode", "192.168.4.1");
}

// ============================================================
// WEB SERVER
// ============================================================
void setupWebServer() {
  // --- Root: serve the offline dashboard ---
  server.on("/", HTTP_GET, []() {
    #if HAS_DASHBOARD
      server.send_P(200, "text/html", DASHBOARD_HTML);
    #else
      server.send(200, "text/html",
        "<html><body style='background:#0a1628;color:#00d4ff;font-family:sans-serif;text-align:center;padding:40px'>"
        "<h1>SmartCare 360</h1>"
        "<p>Dashboard not embedded. Run tools/embed_web.py first.</p>"
        "</body></html>");
    #endif
  });

  // --- Status endpoint ---
  server.on("/status", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", getStatusJson());
  });

  // --- Dispense endpoint ---
  server.on("/dispense", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");

    if (!server.hasArg("c")) {
      server.send(400, "application/json",
        "{\"ok\":false,\"error\":\"BAD_LETTER\"}");
      return;
    }

    String letterStr = server.arg("c");
    letterStr.toUpperCase();
    char letter = letterStr.charAt(0);

    int outServo = 0;
    bool ok = dispenseCompartment(letter, &outServo);

    JsonDocument doc;
    doc["ok"] = ok;
    doc["letter"] = String(letter);

    if (ok) {
      doc["servo"] = outServo;
    } else {
      if (isBusy) {
        doc["error"] = "BUSY";
      } else if (letter < 'A' || letter > 'H') {
        doc["error"] = "BAD_LETTER";
      } else {
        doc["error"] = "NOT_INSTALLED";
      }
    }

    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
  });

  // --- CORS preflight ---
  server.on("/dispense", HTTP_OPTIONS, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "*");
    server.send(204);
  });
}

String getStatusJson() {
  JsonDocument doc;
  doc["online"] = true;

  JsonArray installed = doc["installed"].to<JsonArray>();
  for (int i = 0; i < 4; i++) {
    installed.add(servoInstalled[i]);
  }

  String result;
  serializeJson(doc, result);
  return result;
}

// ============================================================
// MQTT
// ============================================================
void connectMqtt() {
  if (!wifiConnected) return;

  String clientId = "sc360-esp-" + String(random(0xffff), HEX);
  Serial.printf("Connecting to MQTT: %s:%d\n", MQTT_BROKER, MQTT_PORT);

  // Set Last Will (retained)
  String willPayload = "{\"online\":false}";

  if (mqttClient.connect(clientId.c_str(), nullptr, nullptr,
                         topicStatus.c_str(), 1, true,
                         willPayload.c_str())) {
    Serial.println("MQTT connected!");
    mqttConnectedFlag = true;

    // Subscribe to command topic
    mqttClient.subscribe(topicCmd.c_str(), 1);
    Serial.printf("Subscribed to: %s\n", topicCmd.c_str());

    // Publish retained online status
    publishStatus(true);

    lcdPrint("Cloud ready", WiFi.localIP().toString().c_str());
  } else {
    Serial.printf("MQTT failed, rc=%d\n", mqttClient.state());
    mqttConnectedFlag = false;
  }
}

void publishStatus(bool online) {
  String payload = getStatusJson();
  mqttClient.publish(topicStatus.c_str(), payload.c_str(), true); // retained
  Serial.printf("Published status: %s\n", payload.c_str());
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Parse the JSON command
  String payloadStr;
  payloadStr.reserve(length);
  for (unsigned int i = 0; i < length; i++) {
    payloadStr += (char)payload[i];
  }

  Serial.printf("MQTT msg on %s: %s\n", topic, payloadStr.c_str());

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payloadStr);
  if (err) {
    Serial.printf("JSON parse error: %s\n", err.c_str());
    return;
  }

  // Check this is a command on our /cmd topic
  if (String(topic) != topicCmd) return;

  String id     = doc["id"] | "";
  String letter = doc["letter"] | "";
  String token  = doc["token"] | "";

  // --- Token check ---
  if (token != TOKEN) {
    Serial.println("Bad token! Rejecting command.");
    JsonDocument resp;
    resp["id"] = id;
    resp["ok"] = false;
    resp["error"] = "BAD_TOKEN";
    String out;
    serializeJson(resp, out);
    mqttClient.publish(topicResult.c_str(), out.c_str());
    return;
  }

  // --- Dedup check ---
  if (id.length() > 0 && isDuplicate(id)) {
    Serial.println("Duplicate command ID, ignoring.");
    return;
  }
  if (id.length() > 0) {
    addToDedup(id);
  }

  // --- Validate letter ---
  letter.toUpperCase();
  char c = letter.charAt(0);

  if (c < 'A' || c > 'H') {
    JsonDocument resp;
    resp["id"] = id;
    resp["ok"] = false;
    resp["error"] = "BAD_LETTER";
    String out;
    serializeJson(resp, out);
    mqttClient.publish(topicResult.c_str(), out.c_str());
    return;
  }

  // --- Dispense ---
  int outServo = 0;
  bool ok = dispenseCompartment(c, &outServo);

  // --- Publish result ---
  JsonDocument resp;
  resp["id"] = id;
  resp["ok"] = ok;
  resp["letter"] = String(c);

  if (ok) {
    resp["servo"] = outServo;
  } else {
    if (isBusy) {
      resp["error"] = "BUSY";
    } else {
      resp["error"] = "NOT_INSTALLED";
    }
  }

  String out;
  serializeJson(resp, out);
  mqttClient.publish(topicResult.c_str(), out.c_str());
  Serial.printf("Published result: %s\n", out.c_str());
}

// ============================================================
// DEDUP BUFFER
// ============================================================
bool isDuplicate(const String& id) {
  for (int i = 0; i < DEDUP_BUFFER_SIZE; i++) {
    if (dedupBuffer[i] == id) return true;
  }
  return false;
}

void addToDedup(const String& id) {
  dedupBuffer[dedupIndex] = id;
  dedupIndex = (dedupIndex + 1) % DEDUP_BUFFER_SIZE;
}

// ============================================================
// DISPENSE — the core logic
// ============================================================
// Returns true on success, sets *outServo to the servo number.
// Returns false if busy, letter invalid, or servo not installed.
// Only one servo moves at a time (isBusy flag).
// ============================================================
bool dispenseCompartment(char letter, int* outServo) {
  // Validate letter A-H
  if (letter < 'A' || letter > 'H') {
    Serial.printf("Invalid letter: %c\n", letter);
    return false;
  }

  // Check if busy
  if (isBusy) {
    Serial.println("Busy! Ignoring command.");
    buzzError();
    return false;
  }

  // Look up servo and direction
  int idx = letter - 'A';  // 0-7
  int servoNum = COMP_SERVO[idx];  // 1-4
  char dir = COMP_DIR[idx];        // 'L' or 'R'

  *outServo = servoNum;

  // Check if installed
  if (!servoInstalled[servoNum - 1]) {
    Serial.printf("Servo %d not installed!\n", servoNum);
    buzzError();
    return false;
  }

  // --- Move the servo ---
  isBusy = true;
  digitalWrite(LED_PIN, HIGH);

  Serial.printf("Dispensing: %c → Servo %d, %s\n",
                letter, servoNum, dir == 'L' ? "LEFT" : "RIGHT");

  char lcdLine[17];
  snprintf(lcdLine, sizeof(lcdLine), "Servo %d  [%c]", servoNum, letter);
  lcdPrint("Dispensing...", lcdLine);

  moveServo(servoNum, dir);

  // Success feedback
  buzzSuccess();
  blinkLED(2, 100);
  lcdPrint("Done!", lcdLine);

  Serial.printf("Dispensed: %c\n", letter);

  isBusy = false;
  digitalWrite(LED_PIN, wifiConnected ? HIGH : LOW);

  return true;
}

// ============================================================
// SERVO MOVEMENT
// Swing to side → hold 1 s → back to centre
// ============================================================
void moveServo(int servoNum, char direction) {
  int targetAngle = (direction == 'L') ? SERVO_LEFT : SERVO_RIGHT;
  Servo* s = servos[servoNum - 1];

  // Swing to target
  s->write(targetAngle);
  delay(600); // Time to reach position

  // Hold
  delay(SERVO_HOLD_MS);

  // Return to centre
  s->write(SERVO_CENTER);
  delay(600);
}

// ============================================================
// SERIAL COMMANDS
// ============================================================
// A-H  → dispense compartment
// 1-8  → dispense compartment by number (1=A, 2=B, ... 8=H)
// 0    → run all compartments in sequence
// R    → reset all servos to centre
// ?    → print status
// ============================================================
void handleSerial() {
  if (!Serial.available()) return;

  char cmd = Serial.read();

  // Flush remaining characters
  while (Serial.available()) Serial.read();

  // Uppercase
  if (cmd >= 'a' && cmd <= 'z') cmd -= 32;

  if (cmd >= 'A' && cmd <= 'H') {
    int s = 0;
    dispenseCompartment(cmd, &s);
  }
  else if (cmd >= '1' && cmd <= '8') {
    char letter = 'A' + (cmd - '1');
    int s = 0;
    dispenseCompartment(letter, &s);
  }
  else if (cmd == '0') {
    // Run all compartments
    Serial.println("Running all compartments...");
    lcdPrint("Running all", "A B C D E F G H");
    for (char c = 'A'; c <= 'H'; c++) {
      int s = 0;
      dispenseCompartment(c, &s);
      delay(500);
    }
    lcdPrint("All done!", "");
  }
  else if (cmd == 'R') {
    // Reset all servos to centre
    Serial.println("Resetting all servos to centre...");
    for (int i = 0; i < 4; i++) {
      if (servoInstalled[i]) {
        servos[i]->write(SERVO_CENTER);
      }
    }
    lcdPrint("Servos reset", "Centre (90)");
    buzzSuccess();
  }
  else if (cmd == '?') {
    Serial.println("=== SmartCare 360 Status ===");
    Serial.printf("WiFi: %s\n", wifiConnected ? "Connected" : (apMode ? "AP Mode" : "Disconnected"));
    if (wifiConnected) {
      Serial.printf("IP: %s\n", WiFi.localIP().toString().c_str());
      Serial.printf("MQTT: %s\n", mqttConnectedFlag ? "Connected" : "Disconnected");
    }
    if (apMode) {
      Serial.printf("AP IP: %s\n", WiFi.softAPIP().toString().c_str());
    }
    Serial.printf("Busy: %s\n", isBusy ? "Yes" : "No");
    for (int i = 0; i < 4; i++) {
      Serial.printf("Servo %d: %s\n", i + 1, servoInstalled[i] ? "Installed" : "Not installed");
    }
  }
}

// ============================================================
// PUSH BUTTON — run all compartments
// ============================================================
void handleButton() {
  static bool lastState = HIGH;
  static unsigned long debounce = 0;

  bool state = digitalRead(BUTTON_PIN);

  if (state == LOW && lastState == HIGH && millis() - debounce > 300) {
    debounce = millis();
    Serial.println("Button pressed! Running all compartments...");
    lcdPrint("Button pressed", "Running all...");

    for (char c = 'A'; c <= 'H'; c++) {
      int s = 0;
      dispenseCompartment(c, &s);
      delay(500);
      // Keep MQTT alive during long sequences
      if (mqttClient.connected()) mqttClient.loop();
    }

    lcdPrint("All done!", "");
  }

  lastState = state;
}
