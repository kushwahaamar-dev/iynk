export type Api = { base: string; fetch: typeof fetch };

export type Page<T> = { items: T[]; nextCursor: string | null };

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    requestId: string;
    retryAfterSeconds?: number;
    truncated?: boolean;
  };
};

export type ServerInfo = {
  audience: string;
  name?: string;
  software: { name: "iynk-server" };
  apiVersions: number[];
  apiVersion: string;
  minClient?: string;
  enrollment: "code" | "closed";
  features: {
    identities: boolean;
    buddies: boolean;
    shares: boolean;
    rooms: boolean;
    assets: boolean;
    aiRelay: boolean;
    searchProxy: boolean;
    compile: boolean;
    tools: boolean;
  };
  limits: {
    documentBytes: number;
    assetBytes: number;
    peersPerRoom: number;
    buddiesPerIdentity?: number;
  };
  wsUrl?: string;
};

export type DeletionStatus = { status: "scheduled"; requestedAt: string; effectiveAt: string };

export type Identity = {
  id: string;
  deviceId: string;
  displayName: string;
  color?: string;
  locale: string;
  keyThumbprint: string;
  showOnline: boolean;
  showActivity: boolean;
  createdAt: string;
  deletion?: DeletionStatus | null;
};

export type IdentityPatch = Partial<Pick<Identity, "displayName" | "color" | "locale" | "showOnline" | "showActivity">>;

export type AccessToken = {
  token: string;
  tokenType: "Bearer";
  identityId: string;
  sessionId: string;
  expiresAt: string;
};

export type Session = {
  id: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  client?: string;
  current?: boolean;
};

export type Pairing = {
  id: string;
  label?: string;
  from: string;
  status: "open" | "redeemed" | "revoked" | "expired";
  createdAt: string;
  expiresAt: string;
  codeExpiresAt?: string | null;
  redeemedAt?: string | null;
  redeemedBy?: string | null;
};

export type PairingCreate = { label?: string; ttlSeconds?: number };

export type PairingCreated = Pairing & { token: string; url: string; code: string };

export type PairingRef = { token: string } | { code: string };

export type PairingPeek = { from: { displayName: string; color?: string }; expiresAt: string };

export type Buddy = {
  identityId: string;
  deviceId: string;
  displayName: string;
  color?: string;
  keyThumbprint: string;
  alias?: string;
  pairedAt: string;
  online?: boolean | null;
  activity?: { roomId: string; title: string } | null;
};

export class ClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string | null;

  constructor(code: string, status: number, requestId: string | null = null) {
    super(code);
    this.name = "ClientError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

export class NeedsEnrolment extends Error {
  constructor() {
    super("needs_enrolment");
    this.name = "NeedsEnrolment";
  }
}

export class EnrolmentClosed extends Error {
  constructor() {
    super("enrolment_closed");
    this.name = "EnrolmentClosed";
  }
}

export class InsecureContext extends Error {
  constructor() {
    super("insecure_context");
    this.name = "InsecureContext";
  }
}

export class KeysUnsupported extends Error {
  constructor() {
    super("keys_unsupported");
    this.name = "KeysUnsupported";
  }
}

export class ServerUnreachable extends Error {
  constructor() {
    super("server_unreachable");
    this.name = "ServerUnreachable";
  }
}

export class SigningInputMismatch extends Error {
  constructor() {
    super("signing_input_mismatch");
    this.name = "SigningInputMismatch";
  }
}
