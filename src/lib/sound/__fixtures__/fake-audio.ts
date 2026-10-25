// A stand-in AudioContext for tests: it records the sources each sound starts and stops.

class Param {
  value = 0;
  setValueAtTime(value: number) {
    this.value = value;
    return this;
  }
  exponentialRampToValueAtTime(value: number) {
    this.value = value;
    return this;
  }
  setTargetAtTime(value: number) {
    this.value = value;
    return this;
  }
}

class Node {
  connect<T>(next: T): T {
    return next;
  }
}

export type Started = { kind: "osc" | "noise"; type?: string; hz?: number; stopped: boolean };

export class FakeAudioContext {
  static made: FakeAudioContext[] = [];
  state: "suspended" | "running" = "suspended";
  currentTime = 0;
  sampleRate = 8000;
  destination = new Node();
  started: Started[] = [];

  constructor() {
    FakeAudioContext.made.push(this);
  }

  resume() {
    this.state = "running";
    return Promise.resolve();
  }

  createGain() {
    return Object.assign(new Node(), { gain: new Param() });
  }

  createBiquadFilter() {
    return Object.assign(new Node(), { type: "lowpass", frequency: new Param(), Q: new Param() });
  }

  createBuffer(channels: number, length: number) {
    const data = new Float32Array(length);
    return { numberOfChannels: channels, length, getChannelData: () => data };
  }

  createOscillator() {
    const record: Started = { kind: "osc", stopped: false };
    const osc = Object.assign(new Node(), {
      type: "sine",
      frequency: new Param(),
      start: () => {
        record.type = osc.type;
        record.hz = osc.frequency.value;
        this.started.push(record);
      },
      stop: () => {
        record.stopped = true;
      },
    });
    return osc;
  }

  createBufferSource() {
    const record: Started = { kind: "noise", stopped: false };
    return Object.assign(new Node(), {
      buffer: null,
      start: () => this.started.push(record),
      stop: () => {
        record.stopped = true;
      },
    });
  }
}

export const fakeContext = () => new FakeAudioContext() as unknown as AudioContext;
