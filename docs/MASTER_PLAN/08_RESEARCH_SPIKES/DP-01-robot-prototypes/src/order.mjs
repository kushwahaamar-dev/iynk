import RAPIER from '@dimforge/rapier3d-deterministic-compat';
import {createHash} from 'node:crypto';
await RAPIER.init();
const DT=1/240;
function run(order,sleep=false,steps=2400){
  const s=1;const world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=DT;
  const gr=world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  world.createCollider(RAPIER.ColliderDesc.cuboid(50,0.5,50).setTranslation(0,-0.5,0).setFriction(0.8),gr);
  const wr=0.05,wh=0.02,hx=0.12,hy=0.04,hz=0.18;
  const ch=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0,wr,0).setCanSleep(sleep));
  world.createCollider(RAPIER.ColliderDesc.cuboid(hx,hy,hz).setDensity(0.5/(8*hx*hy*hz)),ch);
  const wheels=[[-1,-1],[1,-1],[-1,1],[1,1]];const ws=[];
  const rhoW=0.05/(Math.PI*wr*wr*wh);
  // obstacles so order might matter in contact
  const obs=[];
  for(const idx of order){const [sx,sz]=wheels[idx];
    const w=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(sx*(hx+wh/2+0.001),wr,sz*hz*0.7).setRotation({x:0,y:0,z:Math.SQRT1_2,w:Math.SQRT1_2}).setCanSleep(sleep));
    world.createCollider(RAPIER.ColliderDesc.cylinder(wh/2,wr).setDensity(rhoW).setFriction(0.9),w);
    const j=world.createImpulseJoint(RAPIER.JointData.revoluteWithAxes({x:sx*(hx+wh/2+0.001),y:0,z:sz*hz*0.7},{x:0,y:0,z:0},{x:1,y:0,z:0},{x:0,y:-1,z:0}),ch,w,true);
    j.configureMotorModel(RAPIER.MotorModel.ForceBased);j.setMotorMaxForce(0.5);ws.push({w,j,idx});}
  const boxes=[[0.3,0.1,-1.5],[-0.2,0.1,-2.5],[0.1,0.1,-3.2]];
  for(const b of boxes){const o=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(b[0],b[1],b[2]).setCanSleep(sleep));world.createCollider(RAPIER.ColliderDesc.cuboid(0.1,0.1,0.1).setDensity(300).setFriction(0.5),o);obs.push(o);}
  for(let i=0;i<steps;i++){ for(const x of ws)x.j.configureMotorVelocity(-8,10); world.step();}
  const h=createHash('sha256');const f=new Float32Array(7);const u=new Uint8Array(f.buffer);
  const all=[ch,...ws.sort((a,b)=>a.idx-b.idx).map(x=>x.w),...obs];
  for(const b of all){const t=b.translation(),r=b.rotation();f.set([t.x,t.y,t.z,r.x,r.y,r.z,r.w]);h.update(u);}
  return h.digest('hex').slice(0,16)+' chassis z='+ch.translation().z.toFixed(4);
}
console.log('order 0123      ',run([0,1,2,3]));
console.log('order 0123 again',run([0,1,2,3]));
console.log('order 3210      ',run([3,2,1,0]));
console.log('order 1302      ',run([1,3,0,2]));
console.log('sleep on 0123   ',run([0,1,2,3],true));
