// SimLab Together on the client (HX-CONTRACT H7.1). Import from here only.

export { RoomProvider, useIdentity, useRoom, useTogether, type Together } from "./provider";
export { createRoom, parseRoomInput, roomLink, transportKind } from "./config";
export { probeRoom, type ProbeResult } from "./probe";
export { isHydrating } from "./store-sync";
export { isRoomId, MAX_CHAT_LENGTH, MAX_NAME_LENGTH, ROLES } from "./protocol";
export { PEER_COLORS, saveIdentity, type Identity } from "./identity";
export type { ChatMsg, CursorPoint, Peer, Role, RoomApi, RoomEnd, RoomStatus, SystemEvent } from "./types";
export type { TransportKind } from "./transport";
