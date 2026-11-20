# Wiring Guide – SmartCare 360

## Components

| Component | Qty | Notes |
|-----------|-----|-------|
| ESP32 DevKit V1 (30-pin, Type-C) | 1 | DOIT ESP32 DEVKIT V1 board in Arduino IDE |
| SG90 Micro Servo | 4 | 5 V, ~500 mA stall current each |
| 16×2 I2C LCD | 1 | PCF8574 backpack, address 0x27 or 0x3F |
| Passive Buzzer | 1 | Must be passive (no built-in oscillator) |
| LED (any colour) | 1 | With 220 Ω series resistor |
| Push Button | 1 | Normally open, momentary |
| 220 Ω Resistor | 1 | For the LED |
| Breadboard + Jumper Wires | — | Male-to-male and male-to-female |
| External 5 V / 3 A Power Supply | 1 | **Required** — USB alone cannot power 4 servos |

## Wiring Table

| Component | Component Pin | ESP32 Pin | Notes |
|-----------|--------------|-----------|-------|
| **Servo 1** (A/B) | Signal (orange) | **D18** | |
| | VCC (red) | External **5 V** | ⚠️ NOT from ESP32 3.3 V |
| | GND (brown) | External **GND** | |
| **Servo 2** (C/D) | Signal (orange) | **D19** | |
| | VCC (red) | External **5 V** | |
| | GND (brown) | External **GND** | |
| **Servo 3** (G/H) | Signal (orange) | **D23** | |
| | VCC (red) | External **5 V** | |
| | GND (brown) | External **GND** | |
| **Servo 4** (E/F) | Signal (orange) | **D32** | |
| | VCC (red) | External **5 V** | |
| | GND (brown) | External **GND** | |
| **LCD** | SDA | **D21** | No level shifter needed |
| | SCL | **D22** | |
| | VCC | **5 V** (from Vin or external) | |
| | GND | **GND** | |
| **Passive Buzzer** | + (longer leg) | **D25** | |
| | − (shorter leg) | **GND** | |
| **LED** | Anode (+) | **D26** via 220 Ω | |
| | Cathode (−) | **GND** | |
| **Push Button** | One leg | **D27** | Uses INPUT_PULLUP |
| | Other leg | **GND** | |

## Compartment → Servo → Pin Map

| Compartment | Servo | Pin | Direction | Angle |
|-------------|-------|-----|-----------|-------|
| A | Servo 1 | D18 | Left | 5° |
| B | Servo 1 | D18 | Right | 175° |
| C | Servo 2 | D19 | Left | 5° |
| D | Servo 2 | D19 | Right | 175° |
| E | Servo 4 | D32 | Left | 5° |
| F | Servo 4 | D32 | Right | 175° |
| G | Servo 3 | D23 | Left | 5° |
| H | Servo 3 | D23 | Right | 175° |

## ⚠️ Power Notes

> [!CAUTION]
> **Never power the servos from the ESP32's 3.3 V pin.** Each SG90 can draw up to 500 mA. Four servos = up to 2 A. The ESP32's voltage regulator cannot supply that much current and will overheat or reset.

### Recommended Power Setup

1. Use an **external 5 V / 3 A power supply** (a phone charger with exposed wires, or a bench supply).
2. Connect the power supply's **5 V** to the servo VCC wires and to the **Vin** pin of the ESP32 (this feeds through the ESP32's regulator).
3. Connect the power supply's **GND** to the servo GND wires **and** to the ESP32 **GND**. **All grounds must be shared.**
4. If using USB power for the ESP32 separately, still connect the external supply's GND to the ESP32 GND.

### Power Diagram

```
External 5V PSU ──┬── 5V ──► All servo VCC (red wires)
                  │         ► LCD VCC
                  │         ► ESP32 Vin (optional)
                  │
                  └── GND ──► All servo GND (brown wires)
                             ► LCD GND
                             ► ESP32 GND (MUST connect)
```

## Tips

- Use short jumper wires to reduce voltage drop.
- If a servo jitters at rest, it may be a power issue — add a **100 µF capacitor** across the servo's VCC and GND.
- The LCD contrast is adjustable with the small blue potentiometer on the I2C backpack.
- The firmware auto-detects the LCD I2C address (tries 0x27, 0x3F, 0x20).

