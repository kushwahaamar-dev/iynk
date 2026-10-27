const int MOTOR = 6;  // D6 is a ~ pin, so it can do PWM

void setup() {
  pinMode(MOTOR, OUTPUT);
}

void loop() {
  for (int s = 0; s <= 255; s += 5) {
    analogWrite(MOTOR, s);  // 0 = stopped, 255 = full speed
    delay(40);
  }
  delay(1500);
  analogWrite(MOTOR, 0);
  delay(1500);
}
