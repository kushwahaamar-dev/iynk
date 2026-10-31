import RAPIER from '@dimforge/rapier3d-deterministic-compat';
await RAPIER.init();
const DT=1/240;
// ---- Test A: torque applied to a free wheel, analytic alpha = tau/I
function testA(s){
  const world=new RAPIER.World({x:0,y:0,z:0});world.timestep=DT;
  const r=0.05*s,h=0.02*s,rho=1000/(s**3); // kg/m3 -> density per scaled unit^3
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setCanSleep(false));
  // wheel axis = y (cylinder default axis y)
  world.createCollider(RAPIER.ColliderDesc.cylinder(h/2,r).setDensity(rho),body);
  const m=rho*Math.PI*r*r*h; const I=0.5*m*r*r; // analytic about axis, in scaled units
  const tau=0.01*s*s; // N m -> scaled
  const N=240; // 1 s
  for(let i=0;i<N;i++){body.applyTorqueImpulse({x:0,y:tau*DT,z:0},true);world.step();}
  const w=body.angvel().y; const alpha=tau/I; const expect=alpha*N*DT;
  return{scale:s,mass_kg:m,omega:w,expect,errPct:((w-expect)/expect*100)};
}
for(const s of [1,10]) console.log('A',JSON.stringify(testA(s)));
// ---- Test B: 4 wheel robot straight drive 10 s
function testB(s,{chassisKg=0.5}={}){
  const world=new RAPIER.World({x:0,y:-9.81*s,z:0});world.timestep=DT;
  const gr=world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  world.createCollider(RAPIER.ColliderDesc.cuboid(50*s,0.5*s,50*s).setTranslation(0,-0.5*s,0).setFriction(0.8),gr);
  const wr=0.05*s,wh=0.02*s,hx=0.12*s,hy=0.04*s,hz=0.18*s;
  const chVol=8*hx*hy*hz,chRho=chassisKg/(chVol/(s**3))/(s**3)*1; // density per scaled unit^3 so mass=chassisKg
  const rhoC=chassisKg/chVol, rhoW=(0.05)/(Math.PI*wr*wr*wh);
  const y0=wr; // chassis axle height
  const ch=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0,y0,0).setCanSleep(false));
  world.createCollider(RAPIER.ColliderDesc.cuboid(hx,hy,hz).setDensity(rhoC),ch);
  const ws=[];
  for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
    const w=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(sx*(hx+wh/2+0.001*s),y0,sz*hz*0.7).setRotation({x:0,y:0,z:Math.SQRT1_2,w:Math.SQRT1_2}).setCanSleep(false));
    world.createCollider(RAPIER.ColliderDesc.cylinder(wh/2,wr).setDensity(rhoW).setFriction(0.9),w);
    // revolute about world x axis
    const j=world.createImpulseJoint(RAPIER.JointData.revoluteWithAxes({x:sx*(hx+wh/2+0.001*s),y:0,z:sz*hz*0.7},{x:0,y:0,z:0},{x:1,y:0,z:0},{x:0,y:-1,z:0}),ch,w,true);
    j.configureMotorModel(RAPIER.MotorModel.ForceBased);j.setMotorMaxForce(0.5*s*s);
    ws.push({w,j,sx});
  }
  const omega=-8; // rad/s; sign so robot goes +z? determine
  const trace=[];
  for(let i=0;i<2400;i++){
    for(const x of ws){x.j.configureMotorVelocity(omega,10);}
    world.step();
    if(i%240===239){const t=ch.translation(),q=ch.rotation();trace.push([+(i+1)*DT,t.x/s,t.y/s,t.z/s]);}
  }
  const t=ch.translation(),q=ch.rotation();
  const yaw=2*Math.atan2(q.y,q.w)*180/Math.PI;
  return{scale:s,final_m:[t.x/s,t.y/s,t.z/s].map(v=>+v.toFixed(4)),yawDeg:+yaw.toFixed(3),
    travelled_m:Math.hypot(t.x,t.z)/s,lateralPctOfTravel:+(Math.abs(t.x)/Math.max(1e-9,Math.abs(t.z))*100).toFixed(3)}
}
for(const s of [1,10]) console.log('B',JSON.stringify(testB(s)));
