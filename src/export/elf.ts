import { IMPORT_HEAP_BYTES, parseFailure } from "./hex.ts";
import type { ParseOptions, ParseResult } from "./hex.ts";

export interface ElfImage {
  flash: Uint8Array;
  symbols: { name: string; addr: number; size: number; section: string }[];
  sections: { name: string; offset: number; size: number }[];
}

const MAX_ELF_BYTES = 8 * 1024 * 1024;
const MAX_DEBUG_BYTES = 16 * 1024 * 1024;
const MAX_SECTIONS = 64;
const MAX_PROGRAM_HEADERS = 16;
const MAX_NAME_CHARS = 256;
const EHDR_BYTES = 52;
const SHDR_BYTES = 40;
const PHDR_BYTES = 32;
const SYM_BYTES = 16;
const MACHINE_AVR = 83;
const SHT_SYMTAB = 2;
const SHT_NOBITS = 8;
const SHF_COMPRESSED = 0x800;
const PT_LOAD = 1;
const STT_OBJECT = 1;
const STT_FUNC = 2;

interface Section {
  name: string;
  nameOffset: number;
  type: number;
  flags: number;
  offset: number;
  size: number;
  link: number;
}

function cString(bytes: Uint8Array, start: number, end: number): string {
  let out = "";
  for (let i = start; i < end && out.length < MAX_NAME_CHARS; i++) {
    const c = bytes[i] as number;
    if (c === 0) break;
    out += String.fromCharCode(c);
  }
  return out;
}

export function parseElf(bytes: Uint8Array, o: ParseOptions): ParseResult<ElfImage> {
  if (bytes.length > MAX_ELF_BYTES) return parseFailure("elf-too-large", `The ELF file has ${bytes.length} bytes, more than the limit of ${MAX_ELF_BYTES}.`);
  if (o.flashBytes * 2 > IMPORT_HEAP_BYTES) return parseFailure("elf-too-large", "The flash size does not fit the import heap limit.");
  if (bytes.length < EHDR_BYTES || bytes[0] !== 0x7f || bytes[1] !== 0x45 || bytes[2] !== 0x4c || bytes[3] !== 0x46) {
    return parseFailure("elf-unsupported", "The file is not an ELF file.", 0);
  }
  if (bytes[4] !== 1 || bytes[5] !== 1) return parseFailure("elf-unsupported", "Only 32-bit little-endian ELF files are supported.", 4);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint16(18, true) !== MACHINE_AVR) return parseFailure("elf-unsupported", "The ELF file is not for the AVR (machine 83).", 18);

  const phoff = view.getUint32(28, true);
  const shoff = view.getUint32(32, true);
  const phentsize = view.getUint16(42, true);
  const phnum = view.getUint16(44, true);
  const shentsize = view.getUint16(46, true);
  const shnum = view.getUint16(48, true);
  const shstrndx = view.getUint16(50, true);
  if (shnum > MAX_SECTIONS) return parseFailure("elf-too-many-sections", `The ELF file has ${shnum} sections, more than ${MAX_SECTIONS}.`, 48);
  if (phnum > MAX_PROGRAM_HEADERS) return parseFailure("elf-too-many-sections", `The ELF file has ${phnum} program headers, more than ${MAX_PROGRAM_HEADERS}.`, 44);
  if (shnum > 0 && (shentsize !== SHDR_BYTES || shoff + shnum * SHDR_BYTES > bytes.length)) {
    return parseFailure("elf-bad-section", "The section header table is outside the file.", 32);
  }
  if (phnum > 0 && (phentsize !== PHDR_BYTES || phoff + phnum * PHDR_BYTES > bytes.length)) {
    return parseFailure("elf-bad-section", "The program header table is outside the file.", 28);
  }

  const raw: Section[] = [];
  let work = shnum + phnum;
  let debugBytes = 0;
  for (let i = 0; i < shnum; i++) {
    const at = shoff + i * SHDR_BYTES;
    const flags = view.getUint32(at + 8, true);
    const offset = view.getUint32(at + 16, true);
    const size = view.getUint32(at + 20, true);
    const type = view.getUint32(at + 4, true);
    if (flags & SHF_COMPRESSED) return parseFailure("elf-unsupported", "Compressed sections are not supported.", at);
    if (type !== SHT_NOBITS && offset + size > bytes.length) return parseFailure("elf-bad-section", `Section ${i} reaches past the end of the file.`, at);
    raw.push({ name: "", nameOffset: view.getUint32(at, true), type, flags, offset, size, link: view.getUint32(at + 24, true) });
  }

  const names = raw[shstrndx];
  for (const s of raw) {
    if (names && s.nameOffset < names.size) s.name = cString(bytes, names.offset + s.nameOffset, names.offset + names.size);
    if (s.name.startsWith(".debug")) {
      debugBytes += s.size;
      if (debugBytes > MAX_DEBUG_BYTES) return parseFailure("elf-bad-section", "The debug sections are larger than 16 MiB together.");
    } else if (s.size > o.flashBytes && s.type !== SHT_NOBITS) {
      return parseFailure("elf-bad-section", `Section ${s.name} is larger than the flash.`);
    }
  }

  const flash = new Uint8Array(o.flashBytes).fill(0xff);
  let loaded = 0;
  for (let i = 0; i < phnum; i++) {
    const at = phoff + i * PHDR_BYTES;
    if (view.getUint32(at, true) !== PT_LOAD) continue;
    const offset = view.getUint32(at + 4, true);
    const paddr = view.getUint32(at + 12, true);
    const filesz = view.getUint32(at + 16, true);
    if (filesz === 0) continue;
    if (offset + filesz > bytes.length) return parseFailure("elf-bad-section", `Program header ${i} reaches past the end of the file.`, at);
    if (paddr + filesz > o.flashBytes) return parseFailure("elf-bad-section", `Program header ${i} loads past the end of the flash.`, at);
    flash.set(bytes.subarray(offset, offset + filesz), paddr);
    loaded += filesz;
    work += filesz;
  }
  if (loaded === 0) return parseFailure("elf-unsupported", "The ELF file has no loadable segment.");

  const symbols: ElfImage["symbols"] = [];
  const symtab = raw.find((s) => s.type === SHT_SYMTAB);
  const strtab = symtab ? raw[symtab.link] : undefined;
  if (symtab && strtab) {
    const count = Math.floor(symtab.size / SYM_BYTES);
    for (let i = 0; i < count; i++) {
      const at = symtab.offset + i * SYM_BYTES;
      const kind = (bytes[at + 12] as number) & 0x0f;
      if (kind !== STT_FUNC && kind !== STT_OBJECT) continue;
      const nameOffset = view.getUint32(at, true);
      if (nameOffset >= strtab.size) continue;
      const shndx = view.getUint16(at + 14, true);
      symbols.push({
        name: cString(bytes, strtab.offset + nameOffset, strtab.offset + strtab.size),
        addr: view.getUint32(at + 4, true),
        size: view.getUint32(at + 8, true),
        section: raw[shndx]?.name ?? "",
      });
    }
    work += count;
  }
  o.shouldYield?.();

  const sections = raw.slice(1).map((s) => ({ name: s.name, offset: s.offset, size: s.size }));
  return { ok: true, value: { flash, symbols, sections }, workUnits: work };
}
