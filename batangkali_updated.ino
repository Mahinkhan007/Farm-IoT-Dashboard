#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <DHT.h>

// ─── WiFi ──────────────────────────────────────────────────────────────────────
const char* ssid     = "HUAWEI";
const char* password = "farm2025";

// ─── NEW Supabase — direct REST API (no edge function needed) ──────────────────
const char* SUPABASE_URL     = "https://fmlikxwuvqdypbhmwvou.supabase.co/rest/v1/sensor_readings";
const char* SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtbGlreHd1dnFkeXBiaG13dm91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzAwODIsImV4cCI6MjA5MTE0NjA4Mn0.RSHUr34uel6js-T2QNLQ8Rw8dXuUB9XFkRmLAQstq1A";

// ─── Node identity — CHANGE THESE for each ESP32 before flashing ───────────────
//
//   ESP32 #   ESP_ID    ZONE
//   ───────   ──────    ──────
//     1       "esp-1"   "Zone A"
//     2       "esp-2"   "Zone B"
//     3       "esp-3"   "Zone C"
//     4       "esp-4"   "Zone D"
//     5       "esp-5"   "Zone E"
//     6       "esp-6"   "Zone F"
//
const char* ESP_ID    = "esp-1";          // ← change for each node
const char* ZONE      = "Zone A";         // ← change for each node
const char* LAND_NAME = "Batang Kali";    // same for all 6 nodes

// ─── Timer (30 minutes) ────────────────────────────────────────────────────────
const unsigned long timerDelay = 30UL * 60UL * 1000UL;
unsigned long lastTime = 0 - timerDelay;  // send immediately on boot

// ─── Onboard LED ───────────────────────────────────────────────────────────────
#define LED 2

// ─── Soil Moisture Pins ────────────────────────────────────────────────────────
#define SensorPin_1 34
#define SensorPin_2 35
#define SensorPin_3 32
#define SensorPin_4 33

const int dryValue_1 = 3000, wetValue_1 = 1600;
const int dryValue_2 = 3000, wetValue_2 = 1600;
const int dryValue_3 = 3000, wetValue_3 = 1600;
const int dryValue_4 = 3000, wetValue_4 = 1600;

// ─── DHT22 Pins ────────────────────────────────────────────────────────────────
#define DHT_PIN_1  26
#define DHT_PIN_2  27
#define DHT_TYPE   DHT22
DHT dht1(DHT_PIN_1, DHT_TYPE);
DHT dht2(DHT_PIN_2, DHT_TYPE);

// ─── Helpers ───────────────────────────────────────────────────────────────────
int clampInt(int v, int lo, int hi) { return (v < lo) ? lo : (v > hi) ? hi : v; }

void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries++ < 60) {
    delay(500); Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi OK, IP: "); Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi failed (will retry).");
  }
}

// ─── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(LED, OUTPUT);
  ensureWiFi();
  dht1.begin();
  dht2.begin();
  Serial.printf("Node: %s | Zone: %s | Land: %s\n", ESP_ID, ZONE, LAND_NAME);
  Serial.println("First reading on boot; then every 30 minutes.");
}

// ─── Main Loop ─────────────────────────────────────────────────────────────────
void loop() {
  ensureWiFi();

  if (WiFi.status() == WL_CONNECTED && millis() - lastTime >= timerDelay) {

    // ── Read Soil Moisture ──────────────────────────────────────────────────────
    int raw_1 = analogRead(SensorPin_1);
    int soilPct_1 = clampInt(map(raw_1, wetValue_1, dryValue_1, 100, 0), 0, 100);

    int raw_2 = analogRead(SensorPin_2);
    int soilPct_2 = clampInt(map(raw_2, wetValue_2, dryValue_2, 100, 0), 0, 100);

    int raw_3 = analogRead(SensorPin_3);
    int soilPct_3 = clampInt(map(raw_3, wetValue_3, dryValue_3, 100, 0), 0, 100);

    int raw_4 = analogRead(SensorPin_4);
    int soilPct_4 = clampInt(map(raw_4, wetValue_4, dryValue_4, 100, 0), 0, 100);

    // ── Read DHT22 Sensors ──────────────────────────────────────────────────────
    float temperature_1 = dht1.readTemperature();
    float humidity_1    = dht1.readHumidity();
    float temperature_2 = dht2.readTemperature();
    float humidity_2    = dht2.readHumidity();

    if (isnan(temperature_1)) temperature_1 = 0;
    if (isnan(humidity_1))    humidity_1    = 0;
    if (isnan(temperature_2)) temperature_2 = 0;
    if (isnan(humidity_2))    humidity_2    = 0;

    // ── Serial debug ────────────────────────────────────────────────────────────
    Serial.println("--- Sensor Readings ---");
    Serial.printf("Soil 1: %d%%  Soil 2: %d%%  Soil 3: %d%%  Soil 4: %d%%\n",
                  soilPct_1, soilPct_2, soilPct_3, soilPct_4);
    Serial.printf("Temp1: %.1f°C  Hum1: %.1f%%\n", temperature_1, humidity_1);
    Serial.printf("Temp2: %.1f°C  Hum2: %.1f%%\n", temperature_2, humidity_2);
    Serial.println("-----------------------");

    // ── Build JSON body ─────────────────────────────────────────────────────────
    // Includes esp_id, land_name and zone so the dashboard knows which node/farm
    String body = String("{") +
      "\"esp_id\":\""    + ESP_ID    + "\"," +
      "\"land_name\":\"" + LAND_NAME + "\"," +
      "\"zone\":\""      + ZONE      + "\"," +
      "\"soil_1\":"  + String(soilPct_1)      + "," +
      "\"soil_2\":"  + String(soilPct_2)      + "," +
      "\"soil_3\":"  + String(soilPct_3)      + "," +
      "\"soil_4\":"  + String(soilPct_4)      + "," +
      "\"temp_1\":"  + String(temperature_1, 1) + "," +
      "\"hum_1\":"   + String(humidity_1, 1)    + "," +
      "\"temp_2\":"  + String(temperature_2, 1) + "," +
      "\"hum_2\":"   + String(humidity_2, 1)    +
    "}";

    // ── POST to Supabase REST API ────────────────────────────────────────────────
    WiFiClientSecure client;
    client.setInsecure();  // skip cert verify (fine for IoT)

    HTTPClient http;
    if (!http.begin(client, SUPABASE_URL)) {
      Serial.println("HTTP begin() failed");
      delay(2000);
      return;
    }

    http.addHeader("Content-Type",  "application/json");
    http.addHeader("apikey",        SUPABASE_ANON_KEY);
    http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
    http.addHeader("Prefer",        "return=minimal");   // don't return the inserted row

    int code = http.POST(body);
    String resp = http.getString();

    Serial.printf("POST → %d\n", code);
    if (resp.length()) Serial.println("Response: " + resp);

    // Blink LED on success (HTTP 201 = created)
    if (code == 201) {
      for (int i = 0; i < 3; i++) {
        digitalWrite(LED, HIGH); delay(200);
        digitalWrite(LED, LOW);  delay(200);
      }
      Serial.println("✓ Data sent to Supabase.");
    } else {
      Serial.println("✗ Send failed. Check WiFi / API key / table RLS.");
    }

    http.end();
    lastTime = millis();

    if (code == 429) delay(30000);  // back off if rate-limited
  }

  delay(100);
}
