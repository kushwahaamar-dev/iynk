import { afterEach, describe, expect, it, vi } from "vitest";
import { openFile, saveToFile } from "./files";

const bytes = new Uint8Array([1, 2, 3]);
const picker = window as unknown as Record<string, unknown>;

afterEach(() => {
  delete picker.showSaveFilePicker;
  delete picker.showOpenFilePicker;
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
  vi.restoreAllMocks();
});

function fakeHandle() {
  const written: Uint8Array[] = [];
  const close = vi.fn(async () => {});
  const handle = {
    createWritable: async () => ({ write: async (b: Uint8Array) => void written.push(b), close }),
  } as unknown as FileSystemFileHandle;
  return { handle, written, close };
}

describe("saveToFile", () => {
  it("downloads through an anchor with a blob URL when there is no picker", async () => {
    const createObjectURL = vi.fn(() => "blob:iynk-test");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });

    const result = await saveToFile(bytes, "blink.iynk");

    expect(result).toEqual({ via: "download" });
    expect(clicked).toHaveLength(1);
    expect(clicked[0].href).toBe("blob:iynk-test");
    expect(clicked[0].download).toBe("blink.iynk");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:iynk-test");
  });

  it("writes through the handle the picker returns", async () => {
    const { handle, written, close } = fakeHandle();
    const show = vi.fn(async () => handle);
    picker.showSaveFilePicker = show;

    const result = await saveToFile(bytes, "blink.iynk");

    expect(result).toEqual({ handle, via: "handle" });
    expect(show).toHaveBeenCalledWith(expect.objectContaining({ suggestedName: "blink.iynk" }));
    expect(written).toEqual([bytes]);
    expect(close).toHaveBeenCalled();
  });

  it("writes to an existing handle without opening the picker", async () => {
    const { handle, written } = fakeHandle();
    const show = vi.fn();
    picker.showSaveFilePicker = show;

    const result = await saveToFile(bytes, "blink.iynk", handle);

    expect(result).toEqual({ handle, via: "handle" });
    expect(show).not.toHaveBeenCalled();
    expect(written).toEqual([bytes]);
  });

  it("closes the file when the write fails", async () => {
    const close = vi.fn(async () => {});
    const handle = {
      createWritable: async () => ({
        write: async () => {
          throw new Error("disk full");
        },
        close,
      }),
    } as unknown as FileSystemFileHandle;
    await expect(saveToFile(bytes, "blink.iynk", handle)).rejects.toThrow("disk full");
    expect(close).toHaveBeenCalled();
  });
});

describe("openFile", () => {
  const fileOf = (content: number[], name: string) => {
    const file = new File([new Uint8Array(content)], name);
    Object.defineProperty(file, "arrayBuffer", { value: async () => new Uint8Array(content).buffer });
    return file;
  };

  it("reads the picked file through the picker", async () => {
    const file = fileOf([9, 8], "a.iynk");
    picker.showOpenFilePicker = async () => [{ getFile: async () => file }];
    expect(await openFile()).toEqual({ name: "a.iynk", bytes: new Uint8Array([9, 8]) });
  });

  it("returns null when the picker is cancelled", async () => {
    picker.showOpenFilePicker = async () => {
      throw new DOMException("cancelled", "AbortError");
    };
    expect(await openFile()).toBeNull();
  });

  it("falls back to a file input", async () => {
    const file = fileOf([5], "b.iynkz");
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (this: HTMLInputElement) {
      Object.defineProperty(this, "files", { value: [file] });
      this.dispatchEvent(new Event("change"));
    });
    expect(await openFile()).toEqual({ name: "b.iynkz", bytes: new Uint8Array([5]) });
  });

  it("returns null when the input is cancelled", async () => {
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (this: HTMLInputElement) {
      this.dispatchEvent(new Event("cancel"));
    });
    expect(await openFile()).toBeNull();
  });
});
