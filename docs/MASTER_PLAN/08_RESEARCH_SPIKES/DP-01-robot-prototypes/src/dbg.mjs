import RAPIER from '@dimforge/rapier3d-deterministic-compat';
await RAPIER.init();
const DT=1/240;
for(const mode of ['accum','reset','impulse']){
  const world=new RAPIER.World({x:0,y:0,z:0});world.timestep=DT;
  const r=0.05,h=0.02,rho=1000;
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setCanSleep(false));
  world.createCollider(RAPIER.ColliderDesc.cylinder(h/2,r).setDensity(rho),body);
  const I=body.principalInertia(); 
  const tau=0.01;
  for(let i=0;i<240;i++){
    if(mode==='accum') body.addTorque({x:0,y:tau,z:0},true);
    if(mode==='reset'){body.resetTorques(true);body.addTorque({x:0,y:tau,z:0},true);}
    if(mode==='impulse') body.applyTorqueImpulse({x:0,y:tau*DT,z:0},true);
    world.step();}
  console.log(mode,'omega',body.angvel().y.toFixed(3),'mass',body.mass().toFixed(5),'principal I',JSON.stringify(I),'analytic omega',(tau/(0.5*0.15707963*r*r)).toFixed(3));
}
