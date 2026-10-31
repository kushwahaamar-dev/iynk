// UI string namespaces (D5). Each lives in src/i18n/messages/<lang>/<ns>.json,
// and the English file defines the keys every other language must have.

export const NAMESPACES = ["common", "shell", "boardlab", "robotics", "dronelab", "drone", "dronebuild", "droneparts", "flight", "ai", "search", "together", "hw", "studio", "home", "studioHome", "studioEdit", "studioInspect", "studioWire", "studioCode", "studioRun", "studioModels", "aiProviders", "aiInsight", "aiEffects", "fidelity", "instruments", "run", "faults", "parteditor", "partpack", "partinfo"] as const;

export type Namespace = (typeof NAMESPACES)[number];

export type Messages = {
  common: typeof import("./messages/en/common.json");
  shell: typeof import("./messages/en/shell.json");
  boardlab: typeof import("./messages/en/boardlab.json");
  robotics: typeof import("./messages/en/robotics.json");
  dronelab: typeof import("./messages/en/dronelab.json");
  drone: typeof import("./messages/en/drone.json");
  dronebuild: typeof import("./messages/en/dronebuild.json");
  droneparts: typeof import("./messages/en/droneparts.json");
  flight: typeof import("./messages/en/flight.json");
  ai: typeof import("./messages/en/ai.json");
  search: typeof import("./messages/en/search.json");
  together: typeof import("./messages/en/together.json");
  hw: typeof import("./messages/en/hw.json");
  studio: typeof import("./messages/en/studio.json");
  home: typeof import("./messages/en/home.json");
  studioHome: typeof import("./messages/en/studioHome.json");
  studioEdit: typeof import("./messages/en/studioEdit.json");
  studioInspect: typeof import("./messages/en/studioInspect.json");
  studioWire: typeof import("./messages/en/studioWire.json");
  studioCode: typeof import("./messages/en/studioCode.json");
  studioRun: typeof import("./messages/en/studioRun.json");
  studioModels: typeof import("./messages/en/studioModels.json");
  aiProviders: typeof import("./messages/en/aiProviders.json");
  aiInsight: typeof import("./messages/en/aiInsight.json");
  aiEffects: typeof import("./messages/en/aiEffects.json");
  fidelity: typeof import("./messages/en/fidelity.json");
  instruments: typeof import("./messages/en/instruments.json");
  run: typeof import("./messages/en/run.json");
  faults: typeof import("./messages/en/faults.json");
  parteditor: typeof import("./messages/en/parteditor.json");
  partpack: typeof import("./messages/en/partpack.json");
  partinfo: typeof import("./messages/en/partinfo.json");
};

/** The namespaces the Studio owns; its page passes all of them down together. */
export const STUDIO_NAMESPACES = ["studio", "studioHome", "studioEdit", "studioInspect", "studioWire", "studioCode", "studioRun", "studioModels", "fidelity", "instruments", "run", "faults", "parteditor", "partinfo"] as const;

export type StudioNamespace = (typeof STUDIO_NAMESPACES)[number];

export type StudioMessages = { [K in StudioNamespace]: Messages[K] };

/** The common strings the shell's client components render (FigureFrame and friends). */
export type CommonClientMessages = Messages["common"]["client"];

/** Content prose lives per lab: src/i18n/content/<lang>/<lab>/<id>.json. */
export const CONTENT_LABS = ["boards", "robotics", "drones"] as const;

export type ContentLab = (typeof CONTENT_LABS)[number];
