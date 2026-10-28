interface PickerWindow {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<FileSystemFileHandle>;
  showOpenFilePicker?: (options: {
    types: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<FileSystemFileHandle[]>;
}

const PROJECT_FILES = [
  { description: "iynk project", accept: { "application/octet-stream": [".iynk", ".iynkz"] } },
];

const pickers = (): PickerWindow => window as unknown as PickerWindow;

async function write(handle: FileSystemFileHandle, bytes: Uint8Array): Promise<void> {
  const writable = await handle.createWritable();
  try {
    await writable.write(bytes as BlobPart);
  } finally {
    await writable.close();
  }
}

function download(bytes: Uint8Array, name: string): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/octet-stream" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Writes `bytes` to a file the user picked, or to `existing` without asking again. Browsers without the File System
 * Access API get a download. Call it from a click handler: both the picker and the download need a user gesture.
 * A cancelled picker rejects with the browser's `AbortError`.
 */
export async function saveToFile(
  bytes: Uint8Array,
  suggestedName: string,
  existing?: FileSystemFileHandle,
): Promise<{ handle?: FileSystemFileHandle; via: "handle" | "download" }> {
  if (existing) {
    await write(existing, bytes);
    return { handle: existing, via: "handle" };
  }
  const { showSaveFilePicker } = pickers();
  if (showSaveFilePicker) {
    const handle = await showSaveFilePicker.call(window, { suggestedName, types: PROJECT_FILES });
    await write(handle, bytes);
    return { handle, via: "handle" };
  }
  download(bytes, suggestedName);
  return { via: "download" };
}

async function readAll(file: File): Promise<{ name: string; bytes: Uint8Array }> {
  return { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
}

function pickWithInput(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".iynk,.iynkz";
    input.addEventListener("change", () => resolve(input.files?.[0] ?? null));
    input.addEventListener("cancel", () => resolve(null));
    input.click();
  });
}

/** Lets the user pick a `.iynk` or `.iynkz` file. Returns null when they cancel. */
export async function openFile(): Promise<{ name: string; bytes: Uint8Array } | null> {
  const { showOpenFilePicker } = pickers();
  if (showOpenFilePicker) {
    try {
      const [handle] = await showOpenFilePicker.call(window, { types: PROJECT_FILES });
      return readAll(await handle.getFile());
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return null;
      throw error;
    }
  }
  const file = await pickWithInput();
  return file ? readAll(file) : null;
}
