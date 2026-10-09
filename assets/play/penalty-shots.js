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
export function flightPoint(shot,progress){
 const u=clamp(progress,0,1),x=shot.worldX*u-shot.spin*shot.curve*4*u*(1-u);
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
