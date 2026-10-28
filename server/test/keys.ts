import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { deriveDeviceId, deriveIdentityId, keyThumbprint, toBase64Url } from "../../src/protocol/identity.ts";

export type DeviceKey = {
  spki: Uint8Array;
  thumbprint: string;
  deviceId: string;
  identityId: string;
  privateKey: KeyObject;
  sign(input: string): string;
};

export function makeDeviceKey(): DeviceKey {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const spki = new Uint8Array(publicKey.export({ format: "der", type: "spki" }));
  return {
    spki,
    thumbprint: keyThumbprint(spki),
    deviceId: deriveDeviceId(spki),
    identityId: deriveIdentityId(spki),
    privateKey,
    sign: (input) => toBase64Url(new Uint8Array(sign("sha256", Buffer.from(input, "utf8"), { key: privateKey, dsaEncoding: "ieee-p1363" }))),
  };
}
