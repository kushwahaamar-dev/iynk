// Prototype of the rigid-body multirotor in DRONE_ARCHITECTURE section 5. Illustrative parameters, not a real craft.
const G=9.81;
const P={m:0.65,arm:0.0795,Tmax:12.0,kq:0.016,Ixx:2.5e-3,Iyy:2.5e-3,Izz:4.5e-3,tau:0.03,drag:0.0};
// X quad: positions (x fwd, y left), spin s (+1 CCW seen from above)
const mot=[[-1,-1,+1],[+1,-1,-1],[-1,+1,-1],[+1,+1,+1]].map(([sx,sy,s])=>({x:sx*P.arm,y:sy*P.arm,s}));
function qmul(a,b){return[a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]]}
function rotz(q){const[w,x,y,z]=q;return[2*(x*z+w*y),2*(y*z-w*x),1-2*(x*x+y*y)]} // body z in world
// state: p(3) v(3) q(4) w(3) om(4 = normalised motor speed 0..1)
function deriv(s,u){
  const T=s.om.map(o=>P.Tmax*o*o), Q=s.om.map((o,i)=>mot[i].s*P.kq*P.Tmax*o*o);
  const z=rotz(s.q), Tt=T.reduce((a,b)=>a+b,0);
  const dv=[z[0]*Tt/P.m,z[1]*Tt/P.m,z[2]*Tt/P.m-G];
  let tx=0,ty=0,tz=0;mot.forEach((m,i)=>{tx+=m.y*T[i];ty+=-m.x*T[i];tz+=-Q[i]});
  const [wx,wy,wz]=s.w;
  const dw=[(tx-(P.Izz-P.Iyy)*wy*wz)/P.Ixx,(ty-(P.Ixx-P.Izz)*wx*wz)/P.Iyy,(tz-(P.Iyy-P.Ixx)*wx*wy)/P.Izz];
  const dq=qmul(s.q,[0,wx/2,wy/2,wz/2]);
  const dom=s.om.map((o,i)=>(u[i]-o)/P.tau);
  return{p:s.v,v:dv,q:dq,w:dw,om:dom};
}
const add=(s,d,h)=>({p:s.p.map((x,i)=>x+h*d.p[i]),v:s.v.map((x,i)=>x+h*d.v[i]),q:s.q.map((x,i)=>x+h*d.q[i]),w:s.w.map((x,i)=>x+h*d.w[i]),om:s.om.map((x,i)=>x+h*d.om[i])});
function rk4(s,u,h){const k1=deriv(s,u),k2=deriv(add(s,k1,h/2),u),k3=deriv(add(s,k2,h/2),u),k4=deriv(add(s,k3,h),u);
  const f=(a,b,c,d)=>a.map((_,i)=>(a[i]+2*b[i]+2*c[i]+d[i])/6);
  const dd={p:f(k1.p,k2.p,k3.p,k4.p),v:f(k1.v,k2.v,k3.v,k4.v),q:f(k1.q,k2.q,k3.q,k4.q),w:f(k1.w,k2.w,k3.w,k4.w),om:f(k1.om,k2.om,k3.om,k4.om)};
  const n=add(s,dd,h);const nq=Math.hypot(...n.q);n.q=n.q.map(x=>x/nq);return n}
const eul=(s,u,h)=>{const n=add(s,deriv(s,u),h);const nq=Math.hypot(...n.q);n.q=n.q.map(x=>x/nq);return n};
const hoverU=Math.sqrt(P.m*G/(4*P.Tmax));
function run(dt,step,steps,gains){
  let s={p:[0,0,1],v:[0,0,0],q:[1,0,0,0],w:[0,0,0],om:[hoverU,hoverU,hoverU,hoverU]};
  let integ=0,prevErr=0,dfilt=0;const log=[];
  const sp=0.1; // setpoint 100 deg/s roll rate commanded at t=0.1
  let nextCtl=0;let u=[hoverU,hoverU,hoverU,hoverU];
  for(let k=0;k<steps;k++){
    const t=k*dt;
    if(t>=nextCtl-1e-12){ // 1 kHz control
      const r=t>=0.1?100*Math.PI/180:0; const e=r-s.w[0]; integ+=e*0.001; const d=(e-prevErr)/0.001; prevErr=e; dfilt+=0.3*(d-dfilt);
      const out=gains.kp*e+gains.ki*integ+gains.kd*dfilt;
      // mixer: roll torque via y offsets; motors with y>0 push roll positive
      u=mot.map(m=>Math.min(1,Math.max(0,hoverU+(m.y>0?1:-1)*out)));
      nextCtl+=0.001;}
    s=step(s,u,dt);
    log.push([t,s.w[0],s.q.slice(),s.p.slice()]);
  }
  return{log,s};
}
const gains={kp:0.012,ki:0.05,kd:0.00001};
const T=1.0;
const hz=run(0.001,rk4,Math.round(T/0.001),gains);
const ref=run(0.0001,rk4,Math.round(T/0.0001),gains);
const eu=run(0.001,eul,Math.round(T/0.001),gains);
// step response metrics
const tgt=100*Math.PI/180;let t10=null,t90=null,pk=0;
for(const [t,w] of hz.log){if(t<0.1)continue;if(t10===null&&w>=0.1*tgt)t10=t-0.1;if(t90===null&&w>=0.9*tgt)t90=t-0.1;pk=Math.max(pk,w)}
console.log('hover u',hoverU.toFixed(4),'hover thrust frac of max (u^2)',(hoverU**2).toFixed(4),'T:W',(4*P.Tmax/(P.m*G)).toFixed(2));
console.log('rise 10-90 ms',((t90-t10)*1000).toFixed(1),'overshoot %',((pk/tgt-1)*100).toFixed(1));
const fin=a=>a.s;const d=(a,b)=>Math.hypot(...a.s.w.map((x,i)=>x-b.s.w[i]));
console.log('final w RK4@1kHz',hz.s.w.map(x=>x.toFixed(4)).join(','),'ref@10kHz',ref.s.w.map(x=>x.toFixed(4)).join(','));
console.log('|dw| RK4 1kHz vs ref',d(hz,ref).toExponential(2),' Euler 1kHz vs ref',d(eu,ref).toExponential(2));
console.log('roll angle deg RK4',(2*Math.atan2(hz.s.q[1],hz.s.q[0])*180/Math.PI).toFixed(2),'ref',(2*Math.atan2(ref.s.q[1],ref.s.q[0])*180/Math.PI).toFixed(2));
// determinism: same run twice, bit compare
const a=run(0.001,rk4,1000,gains),b=run(0.001,rk4,1000,gains);
console.log('bit-identical rerun',JSON.stringify(a.s)===JSON.stringify(b.s));
// timing
const t0=process.hrtime.bigint();run(0.001,rk4,60000,gains);const t1=process.hrtime.bigint();
console.log('us per step (incl PID, logging)',(Number(t1-t0)/1e3/60000).toFixed(2));
// kT/kQ consistency with calculator-style hover throttle: sqrt(W/(n*Tmax))
console.log('hover throttle sqrt(AUW/(n*Tmax))',Math.sqrt(P.m*G/(4*P.Tmax)).toFixed(4));
// drag-free free fall energy sanity
