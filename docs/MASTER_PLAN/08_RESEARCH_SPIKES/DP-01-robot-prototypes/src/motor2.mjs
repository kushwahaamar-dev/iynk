const M={R:2.5,L:1.2e-3,k:0.012,J:6e-6,b:2e-6,Vb:6.0};
function fine(duty,T,mode,fpwm=490,h=5e-6){let i=0,w=0;const P=1/fpwm;
  for(let t=0;t<T;t+=h){const on=((t%P)/P)<duty;const v=on?M.Vb:0;
    i+=h*(v-M.R*i-M.k*w)/M.L;if(mode==='coast'&&i<0&&!on)i=0;
    w+=h*(M.k*i-M.b*w)/M.J}
  return w}
// per-PWM-cycle closed form, speed constant inside one cycle
function cycles(duty,T,mode,fpwm=490){const P=1/fpwm,tau=M.L/M.R;let w=0,i0=0;
  for(let n=0;n<Math.round(T*fpwm);n++){
    const ton=duty*P,toff=P-ton;let q=0; // integral of i over the cycle
    const Ia=(M.Vb-M.k*w)/M.R; const e1=Math.exp(-ton/tau);
    const i1=Ia+(i0-Ia)*e1; q+=Ia*ton+(i0-Ia)*tau*(1-e1);
    const Ib=-M.k*w/M.R; 
    if(mode==='slow'||i1<=0&&false){ const e2=Math.exp(-toff/tau); q+=Ib*toff+(i1-Ib)*tau*(1-e2); i0=Ib+(i1-Ib)*e2; }
    else { // coast: current decays to zero then stays 0
      let t0=i1>0? tau*Math.log((i1-Ib)/(-Ib)):0; if(!(t0>0))t0=0; const tt=Math.min(t0,toff);
      q+=Ib*tt+(i1-Ib)*tau*(1-Math.exp(-tt/tau)); i0=t0<toff?0:Ib+(i1-Ib)*Math.exp(-toff/tau); }
    const iavg=q/P; w+=P*(M.k*iavg-M.b*w)/M.J; }
  return w}
function avgV(duty,T,hs=1/240){let w=0;for(let t=0;t<T;t+=hs){const v=duty*M.Vb;const c=(M.k*M.k/M.R+M.b)/M.J,a=(M.k*v/M.R)/M.J;const e=Math.exp(-c*hs);w=a/c+(w-a/c)*e;}return w}
for(const mode of ['slow','coast']) for(const d of [0.25,0.5,0.75]){
  const f=fine(d,0.3,mode),c=cycles(d,0.3,mode),a=avgV(d,0.3);
  console.log(mode.padEnd(5),'duty',d,'fine',f.toFixed(1),'cycle-closed-form',c.toFixed(1),((c-f)/f*100).toFixed(2)+'%','duty-avg V model',a.toFixed(1),((a-f)/f*100).toFixed(1)+'%');}
let t0=process.hrtime.bigint();cycles(0.5,10,'coast');let t1=process.hrtime.bigint();console.log('closed-form cost per PWM cycle ns',Number(t1-t0)/4900);
