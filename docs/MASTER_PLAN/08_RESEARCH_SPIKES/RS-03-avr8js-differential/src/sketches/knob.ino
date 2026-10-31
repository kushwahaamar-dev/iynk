const int POT = A0;
const int LED = 9;

void setup() {
  Serial.begin(9600);
  pinMode(LED, OUTPUT);
}

void loop() {
  int value = analogRead(POT);  // 0-1023
  analogWrite(LED, value / 4);  // 0-255
  Serial.println(value);
  delay(50);
}
