// ============================================================
// SmartCare 360 – Firmware Configuration
// ============================================================
// Pin assignments, servo angles, timings, compartment map.
// Edit hardware settings here — the main .ino reads from this.
// ============================================================

#ifndef CONFIG_H
#define CONFIG_H

// ----------------------------------------------------------
// SERVO PINS
// ----------------------------------------------------------
#define SERVO1_PIN  18   // Compartments A (left) and B (right)
#define SERVO2_PIN  19   // Compartments C (left) and D (right)
#define SERVO3_PIN  23   // Compartments G (left) and H (right)
#define SERVO4_PIN  32   // Compartments E (left) and F (right)

// ----------------------------------------------------------
// SERVO ANGLES (degrees)
// ----------------------------------------------------------
#define SERVO_LEFT    5    // Left side position
#define SERVO_CENTER  90   // Centre / resting position
#define SERVO_RIGHT   175  // Right side position

// ----------------------------------------------------------
// TIMINGS (milliseconds)
// ----------------------------------------------------------
#define SERVO_HOLD_MS     1000   // How long to hold at the side
#define WIFI_TIMEOUT_MS   15000  // Max time to try Wi-Fi connection
#define MQTT_RECONNECT_MS 5000   // Delay between MQTT reconnect attempts

// ----------------------------------------------------------
// PERIPHERALS
// ----------------------------------------------------------
#define BUZZER_PIN    25   // Passive buzzer
#define LED_PIN       26   // Status LED (220 Ω resistor)
#define BUTTON_PIN    27   // Push button (INPUT_PULLUP, active LOW)

// ----------------------------------------------------------
// LCD (I2C)
// ----------------------------------------------------------
#define LCD_SDA       21
#define LCD_SCL       22
#define LCD_COLS      16
#define LCD_ROWS      2

// Common I2C addresses for 16×2 LCD modules
// The firmware will try each in order until one responds.
static const uint8_t LCD_ADDRESSES[] = { 0x27, 0x3F, 0x20 };
#define LCD_ADDR_COUNT 3

// ----------------------------------------------------------
// SERVO INSTALLED FLAGS
// Set to false if a servo is not physically connected.
// Commands for missing servos return NOT_INSTALLED.
// ----------------------------------------------------------
#define SERVO1_INSTALLED  true
#define SERVO2_INSTALLED  true
#define SERVO3_INSTALLED  true
#define SERVO4_INSTALLED  true

// ----------------------------------------------------------
// COMPARTMENT MAP
// Maps letter (A-H) to servo number (1-4) and direction.
// 'L' = left (5°), 'R' = right (175°)
// ----------------------------------------------------------
// A → Servo 1, Left       B → Servo 1, Right
// C → Servo 2, Left       D → Servo 2, Right
// E → Servo 4, Left       F → Servo 4, Right
// G → Servo 3, Left       H → Servo 3, Right

// These are defined as arrays indexed by (letter - 'A')
//                         A  B  C  D  E  F  G  H
static const int COMP_SERVO[] = { 1, 1, 2, 2, 4, 4, 3, 3 };
static const char COMP_DIR[]  = {'L','R','L','R','L','R','L','R'};

// ----------------------------------------------------------
// ACCESS POINT (offline fallback)
// ----------------------------------------------------------
#define AP_SSID     "SMARTCARE360"
#define AP_PASSWORD "smartcare360"

// ----------------------------------------------------------
// MQTT TOPICS (prefix)
// Full topic = "smartcare360/<DEVICE_ID>/cmd" etc.
// ----------------------------------------------------------
#define MQTT_TOPIC_PREFIX "smartcare360/"
#define MQTT_PORT         1883

// ----------------------------------------------------------
// DUPLICATE COMMAND BUFFER
// Keep the last N command IDs to prevent double dispensing.
// ----------------------------------------------------------
#define DEDUP_BUFFER_SIZE 5

#endif // CONFIG_H
