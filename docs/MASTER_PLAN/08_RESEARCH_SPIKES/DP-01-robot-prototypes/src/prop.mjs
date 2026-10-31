const rho=1.225;
function motorProp({Kv,R,I0,D,Ct,Cp},Vbat,duty,Ri=0){
  const ke=60/(2*Math.PI*Kv), kt=ke;
  const kT=Ct*rho*D**4/(4*Math.PI**2), kQ=Cp*rho*D**5/(8*Math.PI**3);
  // battery sag couples: iterate fixed 3 passes (deterministic)
  let V=Vbat*duty, w=0, I=0;
  for(let k=0;k<3;k++){
    const b=kt*ke/R, c=kt*(V/R-I0);
    w=c>0?(-b+Math.sqrt(b*b+4*kQ*c))/(2*kQ):0;
    I=(V-ke*w)/R; // motor current
    const Vp=Vbat-Ri*I*duty; V=Vp*duty;
  }
  return{w,rpm:w*60/(2*Math.PI),T:kT*w*w,I,Q:kQ*w*w,Pmech:kQ*w**3};
}
const p={Kv:1750,R:0.045,I0:1.6,D:0.1295,Ct:0.20,Cp:0.14};
for(const duty of [0.3,0.5,0.7,1.0]){const r=motorProp(p,16.0,duty,0.02);console.log('duty',duty,'rpm',r.rpm.toFixed(0),'T N',r.T.toFixed(2),'gf',(r.T/9.81*1000).toFixed(0),'I A',r.I.toFixed(1))}
// Check Newton alt: residual of torque balance
const r=motorProp(p,16,1,0);const ke=60/(2*Math.PI*p.Kv);const kQ=p.Cp*rho*p.D**5/(8*Math.PI**3);
console.log('torque residual',(ke*(16/p.R-ke*r.w/p.R-p.I0)-kQ*r.w**2).toExponential(2));
