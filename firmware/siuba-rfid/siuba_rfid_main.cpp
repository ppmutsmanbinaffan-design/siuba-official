// Kode utama terminal SIUBA RFID. Buka siuba-rfid.ino di Arduino IDE (berkas ini ikut terbuka sebagai tab).
#include <Arduino.h>
#include <SPI.h>
#include <Wire.h>
#include <MFRC522.h>
#include <WiFiManager.h>
#include <ArduinoJson.h>
#include <LiquidCrystal_I2C.h>
#include <LittleFS.h>
#include <time.h>

#if defined(ESP32)
  #include <WiFi.h>
  #include <HTTPClient.h>
  #define BOARD_NAME   "ESP32"
  // ---- Pin ESP32 DevKit ----
  #define PIN_RC522_SS  5    // SDA/SS RC522
  #define PIN_RC522_RST 27   // RST RC522
  // SPI bawaan: SCK 18, MISO 19, MOSI 23 | I2C LCD: SDA 21, SCL 22
  #define PIN_BUZZER    25
  #define PIN_LED_OK    26   // LED hijau (boleh tidak dipasang)
  #define PIN_LED_ERR   33   // LED merah (boleh tidak dipasang)
  #define PIN_CONFIG    0    // tombol BOOT
  #define FS_BEGIN()    LittleFS.begin(true)
#elif defined(ESP8266)
  #include <ESP8266WiFi.h>
  #include <ESP8266HTTPClient.h>
  #define BOARD_NAME   "NodeMCU"
  // ---- Pin NodeMCU v2/v3 ----
  #define PIN_RC522_SS  D8   // SDA/SS RC522 (GPIO15)
  #define PIN_RC522_RST D0   // RST RC522 (GPIO16)
  // SPI bawaan: SCK D5, MISO D6, MOSI D7 | I2C LCD: SDA D2, SCL D1
  #define PIN_BUZZER    D4   // GPIO2 (LED biru papan ikut menyala saat bunyi)
  #define PIN_LED_OK    -1   // NodeMCU kekurangan pin aman: pakai LCD + buzzer
  #define PIN_LED_ERR   -1
  #define PIN_CONFIG    D3   // tombol FLASH (GPIO0)
  #define FS_BEGIN()    LittleFS.begin()
#else
  #error "Pilih papan ESP32 atau NodeMCU (ESP8266)."
#endif

#define FIRMWARE_VERSION   "1.0.0"
#define TZ_OFFSET_SEC      (7 * 3600)       // WIB
#define CARD_DEBOUNCE_MS   3000             // kartu sama dalam 3 detik diabaikan
#define HEARTBEAT_MS       60000UL          // ping server tiap 60 detik
#define QUEUE_FLUSH_MS     15000UL          // coba kirim antrean tiap 15 detik
#define QUEUE_MAX_LINES    800
#define HTTP_TIMEOUT_MS    5000
#define CONFIG_FILE        "/siuba.json"
#define QUEUE_FILE         "/antrean.txt"
#define BUZZER_ACTIVE_HIGH true             // ubah ke false bila buzzer berbunyi terus

// ----------------------------------------------------------------
struct Config {
  char server[96] = "";      // contoh: http://192.168.1.10:8000
  char device[40] = "";      // contoh: GERBANG-01 (sama dengan Kode Perangkat di Device Management)
  char token[96]  = "";      // token alat (sec_live_...) atau NEXABSEN_GLOBAL_KEY
} cfg;

MFRC522 rfid(PIN_RC522_SS, PIN_RC522_RST);
LiquidCrystal_I2C *lcd = nullptr;

bool     clockSynced = false;
int64_t  clockOffsetMs = 0;          // epoch_ms = millis() + offset
uint32_t lastHeartbeat = 0, lastFlush = 0, lastCardAt = 0;
String   lastCardUid;
uint16_t queuedCount = 0;

// ================================================================ util tampilan & bunyi
void out(int pin, bool on) { if (pin >= 0) digitalWrite(pin, on ? HIGH : LOW); }

void buzz(uint16_t onMs, uint16_t offMs = 0, uint8_t times = 1) {
  for (uint8_t i = 0; i < times; i++) {
    digitalWrite(PIN_BUZZER, BUZZER_ACTIVE_HIGH ? HIGH : LOW);
    delay(onMs);
    digitalWrite(PIN_BUZZER, BUZZER_ACTIVE_HIGH ? LOW : HIGH);
    if (offMs) delay(offMs);
  }
}

String fit16(const String &s) {
  String t = s;
  if (t.length() > 16) t = t.substring(0, 16);
  return t;
}

void show(const String &l1, const String &l2 = "") {
  Serial.printf("[LCD] %s | %s\n", l1.c_str(), l2.c_str());
  if (!lcd) return;
  lcd->clear();
  lcd->setCursor(0, 0); lcd->print(fit16(l1));
  lcd->setCursor(0, 1); lcd->print(fit16(l2));
}

void showIdle() {
  String l2 = WiFi.status() == WL_CONNECTED ? "Tempel kartu..." : "Wi-Fi terputus";
  if (queuedCount) l2 = "Antrean: " + String(queuedCount);
  show("SIUBA " + String(cfg.device), l2);
}

void initLcd() {
  Wire.begin();
  for (uint8_t addr : {0x27, 0x3F}) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      lcd = new LiquidCrystal_I2C(addr, 16, 2);
      lcd->init();
      lcd->backlight();
      Serial.printf("LCD I2C ditemukan di 0x%02X\n", addr);
      return;
    }
  }
  Serial.println("LCD tidak ditemukan (opsional) - lanjut tanpa layar.");
}

// ================================================================ pengaturan
bool loadConfig() {
  File f = LittleFS.open(CONFIG_FILE, "r");
  if (!f) return false;
  JsonDocument doc;
  if (deserializeJson(doc, f)) { f.close(); return false; }
  f.close();
  strlcpy(cfg.server, doc["server"] | "", sizeof(cfg.server));
  strlcpy(cfg.device, doc["device"] | "", sizeof(cfg.device));
  strlcpy(cfg.token,  doc["token"]  | "", sizeof(cfg.token));
  return strlen(cfg.server) > 7 && strlen(cfg.device) > 0 && strlen(cfg.token) > 0;
}

void saveConfig() {
  JsonDocument doc;
  doc["server"] = cfg.server;
  doc["device"] = cfg.device;
  doc["token"]  = cfg.token;
  File f = LittleFS.open(CONFIG_FILE, "w");
  if (f) { serializeJson(doc, f); f.close(); }
}

void trimServer() {
  String s = String(cfg.server);
  s.trim();
  while (s.endsWith("/")) s.remove(s.length() - 1);
  if (s.length() && !s.startsWith("http")) s = "http://" + s;
  strlcpy(cfg.server, s.c_str(), sizeof(cfg.server));
}

String apName() {
#if defined(ESP32)
  uint32_t id = (uint32_t)(ESP.getEfuseMac() >> 24);
#else
  uint32_t id = ESP.getChipId();
#endif
  char buf[24];
  snprintf(buf, sizeof(buf), "SIUBA-RFID-%04X", (unsigned)(id & 0xFFFF));
  return String(buf);
}

// Portal pengaturan (HP tersambung ke Wi-Fi alat). force=true: selalu tampil.
void runPortal(bool force) {
  WiFiManager wm;
  WiFiManagerParameter pServer("server", "Alamat server SIUBA (contoh http://192.168.1.10:8000)", cfg.server, sizeof(cfg.server) - 1);
  WiFiManagerParameter pDevice("device", "Kode alat (sama dgn Device Management, contoh GERBANG-01)", cfg.device, sizeof(cfg.device) - 1);
  WiFiManagerParameter pToken("token", "Token alat (dari Device Management)", cfg.token, sizeof(cfg.token) - 1);
  wm.addParameter(&pServer);
  wm.addParameter(&pDevice);
  wm.addParameter(&pToken);
  wm.setTitle("SIUBA RFID");
  wm.setConfigPortalTimeout(300);   // 5 menit lalu mulai ulang
  wm.setConnectTimeout(20);

  String ap = apName();
  show("Mode Pengaturan", ap);
  Serial.printf("Portal pengaturan: sambungkan HP ke Wi-Fi %s lalu buka 192.168.4.1\n", ap.c_str());
  bool ok = force ? wm.startConfigPortal(ap.c_str()) : wm.autoConnect(ap.c_str());

  strlcpy(cfg.server, pServer.getValue(), sizeof(cfg.server));
  strlcpy(cfg.device, pDevice.getValue(), sizeof(cfg.device));
  strlcpy(cfg.token,  pToken.getValue(),  sizeof(cfg.token));
  trimServer();
  saveConfig();

  if (!ok) {
    show("Pengaturan gagal", "Mulai ulang...");
    delay(2000);
    ESP.restart();
  }
}

// Tombol BOOT/FLASH dibaca SETELAH alat menyala (menahannya saat dinyalakan membuat ESP masuk mode unggah).
// Layar menampilkan ajakan 3 detik; tahan tombol 2 detik untuk membuka pengaturan.
bool configButtonHeld() {
  pinMode(PIN_CONFIG, INPUT_PULLUP);
  show("Tahan BOOT/FLASH", "utk pengaturan");
  uint32_t window = millis();
  while (millis() - window < 3000) {
    if (digitalRead(PIN_CONFIG) == LOW) {
      uint32_t start = millis();
      while (digitalRead(PIN_CONFIG) == LOW) {
        if (millis() - start > 2000) { buzz(80); return true; }
        delay(20);
      }
    }
    delay(20);
  }
  return false;
}

// Sambung ke Wi-Fi tersimpan tanpa memblokir: bila belum tersambung, alat tetap menerima tap (masuk antrean).
void connectSavedWifi() {
  show("Sambung Wi-Fi...", "");
  WiFi.begin();
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) delay(250);
}

// ================================================================ jam
String u64str(uint64_t v) {   // printf %llu tidak dijamin ada di semua core
  char buf[24]; int i = 22; buf[23] = 0;
  if (!v) return "0";
  while (v && i >= 0) { buf[i--] = '0' + (v % 10); v /= 10; }
  return String(&buf[i + 1]);
}

uint64_t nowEpochMs() { return (uint64_t)((int64_t)millis() + clockOffsetMs); }

void syncClockFromHeader(const String &hdr) {
  if (hdr.length() < 12) return;
  int64_t serverMs = atoll(hdr.c_str());
  if (serverMs < 1700000000000LL) return;
  clockOffsetMs = serverMs - (int64_t)millis();
  clockSynced = true;
}

// "2026-11-18T07:02:15+07:00"
String isoWib(uint64_t epochMs) {
  time_t t = (time_t)(epochMs / 1000) + TZ_OFFSET_SEC;
  struct tm tmv;
  gmtime_r(&t, &tmv);
  char buf[32];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S+07:00", &tmv);
  return String(buf);
}

// ================================================================ HTTP
// return: kode HTTP (>0) atau negatif bila jaringan gagal. body berisi respons.
int postJson(const String &path, const String &payload, String &body) {
  if (WiFi.status() != WL_CONNECTED) return -1;
  WiFiClient client;
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  if (!http.begin(client, String(cfg.server) + path)) return -2;
  const char *keep[] = {"X-Server-Time"};
  http.collectHeaders(keep, 1);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Accept", "application/json");
  http.addHeader("X-DEVICE-TOKEN", cfg.token);
  http.addHeader("X-GLOBAL-KEY", cfg.token);   // bila yang diisi adalah NEXABSEN_GLOBAL_KEY
  int code = http.POST(payload);
  if (code > 0) {
    body = http.getString();
    syncClockFromHeader(http.header("X-Server-Time"));
  }
  http.end();
  return code;
}

String tapPayload(const String &uid, uint64_t epochMs, bool hasTime) {
  JsonDocument doc;
  doc["uid"] = uid;
  doc["device_id"] = cfg.device;
  doc["firmware"] = FIRMWARE_VERSION;
  if (hasTime) doc["tapped_at"] = isoWib(epochMs);
  String s;
  serializeJson(doc, s);
  return s;
}

void heartbeat() {
  JsonDocument doc;
  doc["device_id"] = cfg.device;
  doc["firmware"] = FIRMWARE_VERSION;
  doc["board"] = BOARD_NAME;
  doc["queued"] = queuedCount;
  String payload, body;
  serializeJson(doc, payload);
  int code = postJson("/api/v1/iot/ping", payload, body);
  Serial.printf("Ping server: HTTP %d\n", code);
  if (code == 403) show("Alat Blm Aktif", String(cfg.device));
  else if (code == 401) show("Token Salah!", "Cek Device Mgmt");
  else if (code == 503 && body.indexOf("IOT_KEY_NOT_CONFIGURED") >= 0) show("Server Blm Diset!", "Isi GLOBAL_KEY");
  if (code == 401 || code == 403 || code == 503) delay(2500);
}

// ================================================================ antrean offline
uint16_t countQueue() {
  File f = LittleFS.open(QUEUE_FILE, "r");
  if (!f) return 0;
  uint16_t n = 0;
  while (f.available()) { if (f.read() == '\n') n++; }
  f.close();
  return n;
}

bool enqueue(const String &uid) {
  if (queuedCount >= QUEUE_MAX_LINES) return false;
  File f = LittleFS.open(QUEUE_FILE, "a");
  if (!f) return false;
  // UID,epochMs,1/0 (jam sudah tersinkron?)
  f.print(uid); f.print(','); f.print(u64str(nowEpochMs())); f.print(','); f.println(clockSynced ? 1 : 0);
  f.close();
  queuedCount++;
  return true;
}

// Kirim antrean dari yang terlama. Berhenti saat jaringan gagal.
void flushQueue() {
  if (!queuedCount || WiFi.status() != WL_CONNECTED) return;
  File f = LittleFS.open(QUEUE_FILE, "r");
  if (!f) { queuedCount = 0; return; }
  String rest;
  uint16_t sent = 0;
  bool stop = false;
  while (f.available()) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (!line.length()) continue;
    if (stop || sent >= 20) { rest += line + "\n"; continue; }
    int c1 = line.indexOf(','), c2 = line.indexOf(',', c1 + 1);
    String uid = line.substring(0, c1);
    uint64_t ms = strtoull(line.substring(c1 + 1, c2).c_str(), nullptr, 10);
    bool hasTime = line.substring(c2 + 1).toInt() == 1;
    String body;
    int code = postJson("/api/v1/iot/rfid-tap", tapPayload(uid, ms, hasTime), body);
    if (code <= 0 || code >= 500 || code == 401 || code == 429) {   // jaringan/server/kunci bermasalah -> coba lagi nanti
      stop = true;
      rest += line + "\n";
    } else {
      sent++;   // 2xx / 4xx: sudah diputuskan server (tercatat atau ditolak)
    }
  }
  f.close();
  File w = LittleFS.open(QUEUE_FILE, "w");
  if (w) { w.print(rest); w.close(); }
  queuedCount = countQueue();
  if (sent) {
    Serial.printf("Antrean terkirim: %u, sisa: %u\n", sent, queuedCount);
    show("Antrean terkirim", String(sent) + " tap, sisa " + String(queuedCount));
    delay(1200);
    showIdle();
  }
}

// ================================================================ tap kartu
String readUid() {
  String uid;
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

void feedbackOk(bool late) {
  out(PIN_LED_OK, true);
  if (late) buzz(80, 80, 2); else buzz(120);
  delay(late ? 1300 : 1500);
  out(PIN_LED_OK, false);
}

void feedbackFail() {
  out(PIN_LED_ERR, true);
  buzz(700);
  delay(1100);
  out(PIN_LED_ERR, false);
}

void handleCard(const String &uid) {
  Serial.printf("Kartu: %s\n", uid.c_str());
  show("Memproses...", uid);
  String body;
  int code = postJson("/api/v1/iot/rfid-tap", tapPayload(uid, nowEpochMs(), clockSynced), body);

  if (code <= 0 || code >= 500 || code == 429 || code == 401) {
    // Server/Wi-Fi tidak terjangkau, kunci server belum diset, atau token salah: simpan di alat (tidak hilang)
    String why = code == 401 ? "Token Salah!" : code == 503 && body.indexOf("IOT_KEY_NOT_CONFIGURED") >= 0 ? "Server Blm Diset!" : "Tersimpan Offline";
    if (enqueue(uid)) {
      show(why, "Antrean: " + String(queuedCount));
      buzz(60, 60, 3);
    } else {
      show("Antrean Penuh!", "Hubungi admin");
      feedbackFail();
    }
    delay(1200);
    return;
  }

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, body);
  String msg  = err ? String("HTTP ") + code : String(doc["message"] | "Gagal!");
  String name = err ? "" : String(doc["data"]["name"] | "");
  String act  = err ? "" : String(doc["action"] | "");
  bool success = !err && (doc["success"] | false);

  if (act == "RESET_CONFIG") {   // kartu teknisi (NEXABSEN_MASTER_ADMIN_UID)
    show("Kartu Teknisi", "Buka pengaturan");
    buzz(100, 100, 2);
    runPortal(true);
    ESP.restart();
  }

  show(msg, name.length() ? name : uid);
  if (success) {
    String status = err ? "" : String(doc["status"] | "");
    feedbackOk(msg.indexOf("TELAT") >= 0 || status == "late");
  } else {
    feedbackFail();
  }
}

// ================================================================ setup / loop
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.printf("\nSIUBA RFID %s (%s)\n", FIRMWARE_VERSION, BOARD_NAME);

  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, BUZZER_ACTIVE_HIGH ? LOW : HIGH);
  if (PIN_LED_OK >= 0) pinMode(PIN_LED_OK, OUTPUT);
  if (PIN_LED_ERR >= 0) pinMode(PIN_LED_ERR, OUTPUT);

  initLcd();
  show("SIUBA RFID", "v" FIRMWARE_VERSION " " BOARD_NAME);

  if (!FS_BEGIN()) Serial.println("LittleFS gagal - antrean offline tidak tersedia.");
  bool haveCfg = loadConfig();
  queuedCount = countQueue();

  SPI.begin();
  rfid.PCD_Init();
  delay(50);
  byte ver = rfid.PCD_ReadRegister(MFRC522::VersionReg);
  Serial.printf("RC522 versi: 0x%02X %s\n", ver, (ver == 0x00 || ver == 0xFF) ? "(TIDAK TERDETEKSI - cek kabel)" : "");
  if (ver == 0x00 || ver == 0xFF) {
    show("RC522 tdk ada!", "Cek kabel SPI");
    buzz(1500);
    delay(2000);
  }

  WiFi.mode(WIFI_STA);
  WiFi.persistent(true);
  if (!haveCfg || configButtonHeld()) {
    runPortal(true);
  } else {
    connectSavedWifi();
  }
  WiFi.setAutoReconnect(true);

  if (WiFi.status() == WL_CONNECTED) {
    show("Wi-Fi OK", WiFi.localIP().toString());
    buzz(80);
  } else {
    show("Wi-Fi belum ada", "Tap tetap disimpan");
    buzz(60, 60, 3);
  }
  delay(1200);
  heartbeat();
  lastHeartbeat = millis();
  flushQueue();
  showIdle();
}

void loop() {
  uint32_t now = millis();

  if (now - lastHeartbeat > HEARTBEAT_MS) {
    lastHeartbeat = now;
    heartbeat();
    showIdle();
  }
  if (queuedCount && now - lastFlush > QUEUE_FLUSH_MS) {
    lastFlush = now;
    flushQueue();
  }

  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    delay(30);
    return;
  }
  String uid = readUid();
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  if (uid == lastCardUid && now - lastCardAt < CARD_DEBOUNCE_MS) return;
  lastCardUid = uid;
  lastCardAt = now;

  handleCard(uid);
  showIdle();
}
