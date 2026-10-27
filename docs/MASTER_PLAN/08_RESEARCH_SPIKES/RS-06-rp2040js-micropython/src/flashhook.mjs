// Emulates the bootrom flash_range_erase ('RE') and flash_range_program ('RP') routines in JS
// by intercepting the program counter, because rp2040js does not model the QSPI/SSI flash chip.
export function hookFlash(mcu, stats = {}) {
  const rom = new Uint16Array(mcu.bootrom.buffer);
  let p = rom[0x14 / 2] / 2; // function table pointer
  const addr = {};
  for (;; p += 2) {
    const code = rom[p]; if (!code) break;
    addr[String.fromCharCode(code & 255, code >> 8)] = rom[p + 1] & ~1;
  }
  stats.table = addr;
  stats.erase = 0; stats.program = 0; stats.bytesProgrammed = 0;
  const core = mcu.core;
  const orig = core.executeInstruction.bind(core);
  core.executeInstruction = () => {
    const pc = core.PC;
    if (pc === addr.RE) {
      const off = core.registers[0], cnt = core.registers[1];
      mcu.flash.fill(0xff, off, off + cnt);
      stats.erase++;
      core.PC = core.registers[14] & ~1;
      return 40;
    }
    if (pc === addr.RP) {
      const off = core.registers[0], src = core.registers[1], cnt = core.registers[2];
      for (let i = 0; i < cnt; i++) mcu.flash[off + i] &= mcu.readUint8(src + i);
      stats.program++; stats.bytesProgrammed += cnt;
      core.PC = core.registers[14] & ~1;
      return 40;
    }
    return orig();
  };
  return stats;
}
