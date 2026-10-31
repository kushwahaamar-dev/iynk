// DC motor + wheel load. Illustrative N20-class numbers (UNSOURCED): R 2.5 ohm, L 1.2 mH, ke=kt 0.012 V s/rad, J 2e-6 kg m2 rotor+gear reflected 6e-6, b 2e-6.
const M={R:2.5,L:1.2e-3,k:0.012,J:6e-6,b:2e-6,Vb:6.0};
const tauE=M.L/M.R, tauM=M.J*M.R/(M.k*M.k);
console.log('L/R ms',(tauE*1e3).toFixed(3),'tau_m ms',(tauM*1e3).toFixed(2),'mech step ms',(1000/240).toFixed(3),'L/R < 2 steps?',tauE<2/240);
// reference: fine electrical+mechanical, PWM 490 Hz, duty d, h=5 us
function fine(duty,T,fpwm=490,h=5e-6){let i=0,w=0;const P=1/fpwm;let tw=0;const out=[];
  for(let t=0;t<T;t+=h){const on=((t%P)/P)<duty;const v=on?M.Vb:0;
    // freewheel: when off, current decays through diode (v_term ~ 0), if i>0 ; keep i>=0
    const di=(v-M.R*i-M.k*w)/M.L;i+=di*h;if(i<0)i=0;
    const dw=(M.k*i-M.b*w)/M.J;w+=dw*h;out.push(w)}
  return w;}
// coarse: 240 Hz, duty-averaged voltage, inductance-free algebraic armature current
function coarse(duty,T,hs=1/240){let w=0;for(let t=0;t<T;t+=hs){const v=duty*M.Vb;const i=(v-M.k*w)/M.R; // algebraic
    // exact discretisation of mech ODE with constant v over step: w' = (k*(v-k w)/R - b w)/J = a - c w
    const c=(M.k*M.k/M.R+M.b)/M.J,a=(M.k*v/M.R)/M.J;const e=Math.exp(-c*hs);w=a/c+(w-a/c)*e;}return w}
// coarse explicit lag version: current from previous speed (one-step lag), forward Euler
function lagged(duty,T,hs=1/240){let w=0,i=0;for(let t=0;t<T;t+=hs){i=(duty*M.Vb-M.k*w)/M.R;w+=hs*(M.k*i-M.b*w)/M.J;}return w}
for(const d of [0.25,0.5,1.0]){const T=0.3;const f=fine(d,T);const c=coarse(d,T);const l=lagged(d,T);
 console.log('duty',d,'fine rad/s',f.toFixed(2),'coarse-exact',c.toFixed(2),'err %',((c-f)/f*100).toFixed(2),'lagged-euler',l.toFixed(2),'err %',((l-f)/f*100).toFixed(2));}
// stability of lagged euler: hs*c must be < 2
const c=(M.k*M.k/M.R+M.b)/M.J;console.log('hs*c (lagged Euler stable if <2):',(c/240).toFixed(2));
