#include <TinyGPS++.h>
#include <SoftwareSerial.h>

/*
   Arduino Nano / Unoo GPS Tracker (Pure Serial Mode)
   
   Connections:
   GPS VCC -> 5V
   GPS GND -> GND
   GPS TX  -> Pin 3 (Arduino RX)
   GPS RX  -> Pin 4 (Arduino TX)
*/

static const int RXPin = 3, TXPin = 4;
static const uint32_t GPSBaud = 9600;

TinyGPSPlus gps;
SoftwareSerial ss(RXPin, TXPin);

void setup() {
  Serial.begin(115200);
  ss.begin(GPSBaud);
  
  Serial.println(F("Pure GPS Tracker Started"));
  Serial.println(F("Format: GPS:lat,lon"));
}

void loop() {
  while (ss.available() > 0) {
    if (gps.encode(ss.read())) {
      displayInfo();
    }
  }

  if (millis() > 5000 && gps.charsProcessed() < 10) {
    Serial.println(F("No GPS detected: check wiring."));
    delay(2000);
  }
}

void displayInfo() {
  if (gps.location.isValid()) {
    Serial.print(F("GPS:"));
    Serial.print(gps.location.lat(), 6);
    Serial.print(F(","));
    Serial.println(gps.location.lng(), 6);
  } else {
    Serial.println(F("GPS:Waiting for fix..."));
  }
  delay(1000); // Send update every second instead of flooding
}
