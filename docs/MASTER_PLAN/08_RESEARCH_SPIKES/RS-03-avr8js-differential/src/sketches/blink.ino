const int LED_PIN = 13;

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(500);  // how long it stays on
  digitalWrite(LED_PIN, LOW);
  delay(500);  // how long it stays off
}
