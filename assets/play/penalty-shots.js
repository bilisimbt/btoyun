import {clamp,lerp} from './core.js';

export const GOAL={left:307,right:653,top:108,bottom:222};
export const SHOTS={
 place:{name:'Plase',tag:'Kontrol + falso',color:0x57efc8,min:.38,max:.68,charge:1.1,description:'Yeşil bantta bırak. Falso, topun son bölümde yön değiştirmesini sağlar.'},
 power:{name:'Sert şut',tag:'Hız + güç',color:0xffc46a,min:.62,max:.86,charge:.85,description:'Daha hızlı gider. Fazla güç, özellikle üst köşelerde isabeti düşürür.'},
 chip:{name:'Aşırtma',tag:'Yüksek yay',color:0xc49bff,min:.30,max:.55,charge:1.3,description:'Erken atlayan kaleciyi aşmayı dene. Fazla güçte üstten dışarı gidebilir.'}
};

// A camera behind the penalty spot projects the same 11 m flight into the
// illustrated goal. Gravity gives each launch a distinct, continuous arc.
const FOCAL=(GOAL.right-GOAL.left)/7.32*19;
const CAMERA_HEIGHT=(438-GOAL.bottom)/(FOCAL*(1/8-1/19));
const HORIZON=438-FOCAL*CAMERA_HEIGHT/8;
export function projectBall(x,height,z){const depth=8+z;return{x:480+FOCAL*x/depth,y:HORIZON+FOCAL*(CAMERA_HEIGHT-height)/depth,size:FOCAL*.30/depth,groundY:HORIZON+FOCAL*CAMERA_HEIGHT/depth};}
export function makeShot(type,aim,power,spin=0,phase=0,preview=false){
 const style=SHOTS[type]||SHOTS.place,p=clamp(power,0,1),miss=Math.max(style.min-p,0,p-style.max),quality=clamp(1-miss*3.5,0,1);
 const spread=preview?0:(type==='power'?2.5:1)+(1-quality)*(type==='power'?32:18);
 const excess=Math.max(0,p-style.max),low=Math.max(0,style.min-p);
 const target={x:aim.x+Math.sin(phase*7.1)*spread,y:aim.y-Math.max(0,excess)*(type==='chip'?180:type==='power'?94:72)+low*22+Math.cos(phase*5.3)*spread*.35};
 if(preview){target.x=aim.x;target.y=aim.y;}
 // A low shot travels above the grass; its rendered endpoint and goal decision
 // must agree instead of clamping only the animation below the ground.
 target.y=Math.min(GOAL.bottom-8,target.y);
 const duration=type==='power'?lerp(.72,.44,p):type==='chip'?lerp(1.50,1.13,p):lerp(1.12,.78,p);
 return{type,power:p,spin:type==='place'?spin:0,curve:type==='place'?.92:0,quality,target,duration,short:!preview&&p<.10,range:!preview&&p<.10?7.5+p*20:11,worldX:(target.x-480)*19/FOCAL,height:(GOAL.bottom-target.y)*19/FOCAL};
}
// Player shots come from a drag gesture (or the keyboard fallback). The drag
// direction points the shot, its length sets the height, its speed adds pace
// and a sideways bend in the drawn path becomes falso.
export const BALL={x:480,y:438};
const TUNE={
 easy:{gainX:.9,dead:.075,lift:110,spread:0,pace:.84},
 normal:{gainX:1,dead:.055,lift:160,spread:10,pace:.94},
 hard:{gainX:1.06,dead:.04,lift:210,spread:24,pace:1}
};
export function readSwipe(points,scale=1,difficulty='normal'){
 if(!points||points.length<2)return{valid:false,reason:'tiny'};
 const s=points[0],e=points[points.length-1],dx=e.x-s.x,up=s.y-e.y,chord=Math.hypot(dx,up);
 if(chord<22)return{valid:false,reason:'tiny'};
 if(up<16||up<Math.abs(dx)*.3)return{valid:false,reason:'down'};
 const t=TUNE[difficulty]||TUNE.normal;
 let len=0,moved=0,t0=null,t1=s.t,bulge=0,at=.5;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],d=Math.hypot(b.x-a.x,b.y-a.y);
  len+=d;moved+=d;
  if(t0===null&&moved>4)t0=a.t;
  if(d>1.5)t1=b.t;
 }
 for(const p of points){
  // Sideways distance from the straight start→end line at the same height;
  // positive = the path bends to the right.
  const f=(s.y-p.y)/up,side=p.x-(s.x+dx*f);
  if(f>0&&f<1&&Math.abs(side)>Math.abs(bulge)){bulge=side;at=f;}
 }
 const active=Math.max(.06,t1-(t0??s.t)),speed=len/active*scale;
 const spd=clamp((speed-120)/1000,0,1),lenP=clamp(up/300,0,1);
 const power=clamp(.3+.25*lenP+.6*spd,0,1.12);
 // A fast short flick still reaches the goal as a low drive; a slow short
 // drag does not.
 const reach=up+spd*clamp(250-up,0,170);
 const aim={x:BALL.x+dx/up*reach*t.gainX,y:BALL.y-reach};
 const shortRange=reach<190?11*clamp((reach-30)/170,.2,.92):0;
 // Replay the drawn bend on screen: the widest point of the drag (as a share
 // of its height) becomes the flight time where the ball sits at that screen
 // height, and the bulge keeps the same size relative to the flight height.
 const ratio=bulge/up,mag=Math.max(0,Math.abs(ratio)-t.dead)*1.2;
 const f=clamp(at,.2,.85),bendAt=clamp((1/(1/8-f*(1/8-1/19))-8)/11,.15,.7);
 const flightUp=clamp(BALL.y-Math.min(aim.y,GOAL.bottom-8),150,420);
 const bend=Math.sign(ratio)*Math.min(2.4,mag*flightUp*(8+11*bendAt)/FOCAL);
 return{valid:true,aim,power,bend,bendAt,shortRange,speed,ratio,up,dx,chord};
}
export function shotKind(aim,power,shortRange=0){
 // A chip is a soft, high shot through the middle, over the keeper.
 return power>=.78?'power':aim.y<GOAL.top+42&&power<.62&&Math.abs(aim.x-480)<115&&!shortRange?'chip':'place';
}
// bend: sideways bulge in metres (+ = right); bendAt: flight time of its peak.
export function makePlayerShot({aim,power,bend=0,bendAt=.45,shortRange=0,difficulty='normal',phase=0,preview=false}){
 const t=TUNE[difficulty]||TUNE.normal,p=clamp(power,0,1.12),type=shotKind(aim,p,shortRange);
 const excess=Math.max(0,p-.86),spread=preview?0:t.spread*Math.max(0,p-.7);
 const target={x:clamp(aim.x+Math.sin(phase*7.1)*spread,40,920),y:aim.y-excess*t.lift+Math.cos(phase*5.3)*spread*.35};
 target.y=clamp(target.y,0,GOAL.bottom-8);
 const duration=t.pace*(type==='power'?lerp(.62,.42,clamp((p-.78)/.34,0,1)):type==='chip'?lerp(1.5,1.18,clamp(p/.6,0,1)):lerp(1.15,.74,clamp(p/.78,0,1)));
 return{type,power:Math.min(p,1),spin:bend?-bend:0,curve:bend?1:0,bendK:bend?Math.log(.5)/Math.log(clamp(bendAt,.15,.7)):0,quality:clamp(1-excess*3,0,1),target,duration,short:shortRange>0,range:shortRange||11,worldX:(target.x-480)*19/FOCAL,height:(GOAL.bottom-target.y)*19/FOCAL,player:true};
}
export function flightPoint(shot,progress){
 // bendK moves the widest point of the curl to where the drawn path bent most.
 const u=clamp(progress,0,1),shape=shot.bendK?Math.sin(Math.PI*u**shot.bendK):4*u*(1-u),x=shot.worldX*u-shot.spin*shot.curve*shape;
 const height=Math.max(0,shot.height*u+.5*9.81*shot.duration**2*u*(1-u));
 return{...projectBall(x,height,shot.range*u),worldX:x,height,z:shot.range*u};
}
export function goalContact(target){
 const radius=8.8,x=target.x,y=target.y;
 const side=(Math.abs(x-GOAL.left)<=radius||Math.abs(x-GOAL.right)<=radius)&&y>=GOAL.top-radius&&y<=GOAL.bottom+radius;
 const crossbar=Math.abs(y-GOAL.top)<=radius&&x>=GOAL.left-radius&&x<=GOAL.right+radius;
 if(side||crossbar)return'post';
 return x>GOAL.left+radius&&x<GOAL.right-radius&&y>GOAL.top+radius&&y<=GOAL.bottom?'goal':'out';
}
