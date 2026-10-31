import { runYosys } from '@yowasp/yosys';
window.runYosysTimed = async (src) => {
  const t = performance.now();
  let out = '';
  const files = await runYosys(['-p', 'read_verilog -sv in.v; hierarchy -auto-top; proc; opt; stat; write_json out.json'], { 'in.v': src }, { stdout: (b) => { out += typeof b === 'string' ? b : new TextDecoder().decode(b ?? new Uint8Array()); }, stderr: () => {} });
  return { ms: Math.round(performance.now() - t), bytes: files['out.json'].length };
};
window.ready = true;
