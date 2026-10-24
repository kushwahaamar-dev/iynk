import type { DroneId, RoboticsId } from "@/content/ids";
import { isBoardId, isDroneId, isRoboticsId } from "@/content/ids";
import type { LabKind } from "@/components/dock/types";
import { boardName } from "./bom";

// What to ask YouTube and Google Events for each item. Queries stay in English:
// that is where most hardware tutorials and meetup listings are.

const DRONE_VIDEOS: Record<DroneId, string> = {
  quad5: "5 inch FPV freestyle drone build",
  whoop: "tiny whoop build and setup",
  cinewhoop: "3 inch cinewhoop build",
  longrange: "7 inch long range FPV drone build",
  racer: "5 inch FPV racing drone build",
  gpscam: "ArduPilot GPS quadcopter build",
  delivery: "ArduPilot delivery drone payload release",
  agrihex: "agricultural spraying drone hexacopter setup",
  wing: "INAV flying wing build",
  vtol: "ArduPilot VTOL quadplane setup",
  swarm: "Crazyflie swarm Python tutorial",
  tricopter: "Betaflight tricopter build",
  octo: "heavy lift octocopter build",
};

const ROBOTICS_VIDEOS: Record<RoboticsId, string> = {
  "uno-r3-build": "Arduino Uno R3 how it works",
  "led-resistor": "LED resistor Ohm's law multimeter",
  "transistor-switch": "TIP120 transistor motor switch Arduino",
  "esp32-s3-build": "ESP32-S3 DevKitC getting started",
  tb6612fng: "TB6612FNG motor driver Arduino tutorial",
  l298n: "L298N motor driver Arduino tutorial",
  a4988: "A4988 stepper driver NEMA 17 current limit",
  pca9685: "PCA9685 servo driver Arduino tutorial",
  mpu6050: "MPU6050 Arduino tutorial complementary filter",
  "hc-sr04": "HC-SR04 ultrasonic sensor Arduino tutorial",
  "qtr-8rc": "QTR-8RC line follower Arduino",
  lm2596: "LM2596 buck converter setup",
  "pi5-ros2": "Raspberry Pi 5 ROS 2 getting started",
};

export function videoQuery(lab: LabKind, itemId: string): string | null {
  if (lab === "drone" && isDroneId(itemId)) return DRONE_VIDEOS[itemId];
  if (lab === "robotics" && isRoboticsId(itemId)) return ROBOTICS_VIDEOS[itemId];
  if (lab === "board" && isBoardId(itemId)) return `${boardName(itemId)} beginner tutorial`;
  return null;
}

/** The kind of meetup that suits each lab. */
export const EVENT_TOPICS: Record<LabKind, string> = {
  drone: "drone FPV",
  robotics: "robotics maker",
  board: "maker electronics Arduino",
};

/** "667 Grand St, Jersey City, NJ 07304" -> "Jersey City, NJ": a place name Google Events understands. */
export function cityOf(address: string): string | null {
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  const region = parts[parts.length - 1].replace(/\s+\d[\d-]*$/, "").trim();
  return region ? `${parts[parts.length - 2]}, ${region}` : parts[parts.length - 2];
}
