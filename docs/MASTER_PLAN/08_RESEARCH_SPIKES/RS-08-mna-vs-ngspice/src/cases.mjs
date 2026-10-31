// The 20 DC circuits, one neutral description each. Both the bench-solve circuit and the SPICE netlist are generated
// from this, so the two sides cannot drift apart. Node names: GND, board nets (5V, 3V3, VIN, D13, D12, D11, ...) and
// free names (each becomes one breadboard column strip).
// part kinds: R(n1,n2,ohms) LED(a,k,color) D(a,k) TIP(b,c,e) Q22(b,c,e) MOT(p,m,load) POT(n1,w,n3,pos,ohms)
export const cases = [
  { id: 'C01', title: 'Divider 10k/10k from 5V', power: 'usb', pins: {}, parts: [
    { id: 'R1', k: 'R', n: ['5V', 'A'], ohms: 10000 }, { id: 'R2', k: 'R', n: ['A', 'GND'], ohms: 10000 }] },
  { id: 'C02', title: 'Three-resistor divider 1k/2.2k/4.7k, two taps', power: 'usb', pins: {}, parts: [
    { id: 'R1', k: 'R', n: ['5V', 'A'], ohms: 1000 }, { id: 'R2', k: 'R', n: ['A', 'B'], ohms: 2200 }, { id: 'R3', k: 'R', n: ['B', 'GND'], ohms: 4700 }] },
  { id: 'C03', title: 'Divider 1k/1k from a pin (25 ohm source), 1k load on the tap', power: 'usb', pins: { D12: 1 }, parts: [
    { id: 'R1', k: 'R', n: ['D12', 'A'], ohms: 1000 }, { id: 'R2', k: 'R', n: ['A', 'GND'], ohms: 1000 }, { id: 'R3', k: 'R', n: ['A', 'GND'], ohms: 1000 }] },
  { id: 'C04', title: 'Potentiometer 10k at 30 percent, 2.2k load on the wiper', power: 'usb', pins: {}, parts: [
    { id: 'POT1', k: 'POT', n: ['5V', 'W', 'GND'], pos: .3, ohms: 10000 }, { id: 'R1', k: 'R', n: ['W', 'GND'], ohms: 2200 }] },
  { id: 'C05', title: 'Wheatstone bridge 1k/2k/2k/3.3k with 10k bridge resistor', power: 'usb', pins: {}, parts: [
    { id: 'R1', k: 'R', n: ['5V', 'A'], ohms: 1000 }, { id: 'R2', k: 'R', n: ['A', 'GND'], ohms: 2000 },
    { id: 'R3', k: 'R', n: ['5V', 'B'], ohms: 2000 }, { id: 'R4', k: 'R', n: ['B', 'GND'], ohms: 3300 }, { id: 'R5', k: 'R', n: ['A', 'B'], ohms: 10000 }] },
  { id: 'C06', title: 'Red LED, 220 ohm, from D13', power: 'usb', pins: { D13: 1 }, parts: [
    { id: 'R1', k: 'R', n: ['D13', 'A'], ohms: 220 }, { id: 'LED1', k: 'LED', n: ['A', 'GND'], color: 'red' }] },
  { id: 'C07', title: 'Red LED, 100 ohm, from D13', power: 'usb', pins: { D13: 1 }, parts: [
    { id: 'R1', k: 'R', n: ['D13', 'A'], ohms: 100 }, { id: 'LED1', k: 'LED', n: ['A', 'GND'], color: 'red' }] },
  { id: 'C08', title: 'Red LED, 10k, from D13 (dim)', power: 'usb', pins: { D13: 1 }, parts: [
    { id: 'R1', k: 'R', n: ['D13', 'A'], ohms: 10000 }, { id: 'LED1', k: 'LED', n: ['A', 'GND'], color: 'red' }] },
  { id: 'C09', title: 'Blue LED, 220 ohm, from 5V rail', power: 'usb', pins: {}, parts: [
    { id: 'R1', k: 'R', n: ['5V', 'A'], ohms: 220 }, { id: 'LED1', k: 'LED', n: ['A', 'GND'], color: 'blue' }] },
  { id: 'C10', title: 'Red LED straight on D13, no resistor (first solve, before it burns)', power: 'usb', pins: { D13: 1 }, parts: [
    { id: 'LED1', k: 'LED', n: ['D13', 'GND'], color: 'red' }] },
  { id: 'C11', title: 'Two red LEDs in parallel, one shared 150 ohm', power: 'usb', pins: { D13: 1 }, parts: [
    { id: 'R1', k: 'R', n: ['D13', 'A'], ohms: 150 }, { id: 'LED1', k: 'LED', n: ['A', 'GND'], color: 'red' }, { id: 'LED2', k: 'LED', n: ['A', 'GND'], color: 'red' }] },
  { id: 'C12', title: 'Red and blue LEDs in parallel, one shared 150 ohm', power: 'usb', pins: { D13: 1 }, parts: [
    { id: 'R1', k: 'R', n: ['D13', 'A'], ohms: 150 }, { id: 'LED1', k: 'LED', n: ['A', 'GND'], color: 'red' }, { id: 'LED2', k: 'LED', n: ['A', 'GND'], color: 'blue' }] },
  { id: 'C13', title: 'Diode clamp: D13 high through 1k, 1N4007 to the 3V3 rail', power: 'usb', pins: { D13: 1 }, parts: [
    { id: 'R1', k: 'R', n: ['D13', 'A'], ohms: 1000 }, { id: 'DIO1', k: 'D', n: ['A', '3V3'] }] },
  { id: 'C14', title: '1N4007 in series with 1k from 5V', power: 'usb', pins: {}, parts: [
    { id: 'R1', k: 'R', n: ['5V', 'A'], ohms: 1000 }, { id: 'DIO1', k: 'D', n: ['A', 'GND'] }] },
  { id: 'C15', title: 'TIP120 low-side motor switch, 1k base from D6, motor on 5V, flyback diode', power: 'usb', pins: { D6: 1 }, parts: [
    { id: 'R1', k: 'R', n: ['D6', 'B'], ohms: 1000 }, { id: 'Q1', k: 'TIP', n: ['B', 'C', 'GND'] },
    { id: 'MOT1', k: 'MOT', n: ['5V', 'C'], load: 'prop' }, { id: 'DIO1', k: 'D', n: ['C', '5V'] }] },
  { id: 'C16', title: '2N2222 saturated, 1k base from D6, 100 ohm load on 5V', power: 'usb', pins: { D6: 1 }, parts: [
    { id: 'R1', k: 'R', n: ['D6', 'B'], ohms: 1000 }, { id: 'Q1', k: 'Q22', n: ['B', 'C', 'GND'] }, { id: 'R2', k: 'R', n: ['5V', 'C'], ohms: 100 }] },
  { id: 'C17', title: '2N2222 in the active region, 220k base from 5V, 1k load', power: 'usb', pins: {}, parts: [
    { id: 'R1', k: 'R', n: ['5V', 'B'], ohms: 220000 }, { id: 'Q1', k: 'Q22', n: ['B', 'C', 'GND'] }, { id: 'R2', k: 'R', n: ['5V', 'C'], ohms: 1000 }] },
  { id: 'C18', title: 'Battery with 2 ohm internal resistance (VIN rail, 9 V jack) into a 47 ohm load', power: 'jack', pins: {}, parts: [
    { id: 'RINT', k: 'R', n: ['VIN', 'A'], ohms: 2 }, { id: 'R1', k: 'R', n: ['A', 'GND'], ohms: 47 }] },
  { id: 'C19', title: 'Rail under load: 3V3 rail (0.5 ohm source) into 22 ohm', power: 'usb', pins: {}, parts: [
    { id: 'R1', k: 'R', n: ['3V3', 'GND'], ohms: 22 }] },
  { id: 'C20', title: 'Brownout: stalled motor on the 5V rail through a TIP120 (driven by 1k from D6)', power: 'usb', pins: { D6: 1 }, parts: [
    { id: 'R1', k: 'R', n: ['D6', 'B'], ohms: 1000 }, { id: 'Q1', k: 'TIP', n: ['B', 'C', 'GND'] }, { id: 'MOT1', k: 'MOT', n: ['5V', 'C'], load: 'stalled' }] },
];
