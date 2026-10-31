import { LOCALES, type Locale } from "./config";

type Row = readonly [en: string, es: string, fr: string, de: string, zh: string, hi: string];

// Columns follow LOCALES. Acronyms that every language keeps are repeated on purpose.
const GLOSSARY = {
  resistor: ["resistor", "resistencia", "résistance", "Widerstand", "电阻", "प्रतिरोधक"],
  capacitor: ["capacitor", "condensador", "condensateur", "Kondensator", "电容", "संधारित्र"],
  diode: ["diode", "diodo", "diode", "Diode", "二极管", "डायोड"],
  led: ["LED", "LED", "LED", "LED", "LED", "एलईडी"],
  mosfet: ["MOSFET", "MOSFET", "MOSFET", "MOSFET", "MOSFET", "MOSFET"],
  transistor: ["transistor", "transistor", "transistor", "Transistor", "晶体管", "ट्रांजिस्टर"],
  voltage: ["voltage", "tensión", "tension", "Spannung", "电压", "वोल्टेज"],
  current: ["current", "corriente", "courant", "Strom", "电流", "धारा"],
  ground: ["ground", "tierra", "masse", "Masse", "地线", "ग्राउंड"],
  pwm: ["PWM", "PWM", "PWM", "PWM", "PWM", "PWM"],
  "duty-cycle": ["duty cycle", "ciclo de trabajo", "rapport cyclique", "Tastverhältnis", "占空比", "ड्यूटी साइकिल"],
  "motor-driver": ["motor driver", "driver de motor", "pilote de moteur", "Motortreiber", "电机驱动器", "मोटर ड्राइवर"],
  microcontroller: ["microcontroller", "microcontrolador", "microcontrôleur", "Mikrocontroller", "微控制器", "माइक्रोकंट्रोलर"],
  sensor: ["sensor", "sensor", "capteur", "Sensor", "传感器", "सेंसर"],
  servo: ["servo", "servo", "servomoteur", "Servo", "舵机", "सर्वो"],
  "stepper-motor": ["stepper motor", "motor paso a paso", "moteur pas à pas", "Schrittmotor", "步进电机", "स्टेपर मोटर"],
  "brushless-motor": ["brushless motor", "motor sin escobillas", "moteur sans balais", "bürstenloser Motor", "无刷电机", "ब्रशलेस मोटर"],
  encoder: ["encoder", "codificador", "codeur", "Encoder", "编码器", "एनकोडर"],
  esc: ["ESC", "ESC", "ESC", "ESC", "ESC", "ESC"],
  thrust: ["thrust", "empuje", "poussée", "Schub", "推力", "प्रणोद"],
  throttle: ["throttle", "acelerador", "gaz", "Gas", "油门", "थ्रॉटल"],
  "hover-throttle": ["hover throttle", "acelerador de estacionario", "gaz de vol stationnaire", "Schwebegas", "悬停油门", "होवर थ्रॉटल"],
  propeller: ["propeller", "hélice", "hélice", "Propeller", "螺旋桨", "प्रोपेलर"],
  battery: ["battery", "batería", "batterie", "Akku", "电池", "बैटरी"],
  bec: ["BEC", "BEC", "BEC", "BEC", "BEC", "BEC"],
  "voltage-regulator": ["voltage regulator", "regulador de tensión", "régulateur de tension", "Spannungsregler", "稳压器", "वोल्टेज रेगुलेटर"],
  "flight-controller": ["flight controller", "controlador de vuelo", "contrôleur de vol", "Flugcontroller", "飞行控制器", "फ्लाइट कंट्रोलर"],
  imu: ["IMU", "IMU", "IMU", "IMU", "IMU", "IMU"],
  gyroscope: ["gyroscope", "giroscopio", "gyroscope", "Gyroskop", "陀螺仪", "जायरोस्कोप"],
  accelerometer: ["accelerometer", "acelerómetro", "accéléromètre", "Beschleunigungssensor", "加速度计", "एक्सेलेरोमीटर"],
  pid: ["PID", "PID", "PID", "PID", "PID", "PID"],
  firmware: ["firmware", "firmware", "micrologiciel", "Firmware", "固件", "फर्मवेयर"],
  telemetry: ["telemetry", "telemetría", "télémétrie", "Telemetrie", "遥测", "टेलीमेट्री"],
  failsafe: ["failsafe", "modo seguro", "mode de sécurité", "Failsafe", "失控保护", "फेलसेफ"],
  arming: ["arming", "armado", "armement", "Scharfschalten", "解锁", "आर्मिंग"],
  payload: ["payload", "carga útil", "charge utile", "Nutzlast", "有效载荷", "पेलोड"],
  i2c: ["I2C", "I2C", "I2C", "I2C", "I2C", "I2C"],
  spi: ["SPI", "SPI", "SPI", "SPI", "SPI", "SPI"],
  uart: ["UART", "UART", "UART", "UART", "UART", "UART"],
  "baud-rate": ["baud rate", "velocidad en baudios", "débit en bauds", "Baudrate", "波特率", "बॉड रेट"],
  "pull-up-resistor": ["pull-up resistor", "resistencia pull-up", "résistance de rappel", "Pull-up-Widerstand", "上拉电阻", "पुल-अप प्रतिरोधक"],
  breadboard: ["breadboard", "protoboard", "plaque d'essai", "Steckbrett", "面包板", "ब्रेडबोर्ड"],
  "jumper-wire": ["jumper wire", "cable puente", "fil de liaison", "Jumper-Kabel", "跳线", "जंपर तार"],
  "short-circuit": ["short circuit", "cortocircuito", "court-circuit", "Kurzschluss", "短路", "शॉर्ट सर्किट"],
} as const satisfies Record<string, Row>;

export type TermId = keyof typeof GLOSSARY;

export type TermText = { local: string; en: string };

export const TERM_IDS = Object.keys(GLOSSARY) as TermId[];

/** Every glossary term in one language, next to its English word. */
export function termsFor(lang: Locale): Record<TermId, TermText> {
  const column = LOCALES.indexOf(lang);
  return Object.fromEntries(
    TERM_IDS.map((id) => [id, { local: GLOSSARY[id][column], en: GLOSSARY[id][0] }]),
  ) as Record<TermId, TermText>;
}
