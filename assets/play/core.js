export const W=960,H=540;
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function seeded(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export function penaltyWinner(a,b,na,nb){
  if(na<=5&&nb<=5){if(a>b+5-nb)return 'player';if(b>a+5-na)return 'opponent';}
  if(na>=5&&nb>=5&&na===nb&&a!==b)return a>b?'player':'opponent';
  return null;
}
export const TEAM_COLORS=['#38e1bd','#598dff','#ffb648','#c495ff','#ff726d','#57d2ff','#bfd953','#fc93bf'];
export const TEAMS=['Turkuaz Spor','Mavi Şimşek','Altın Kartal','Mor Yıldız','Ateş Spor','Kuzey Rüzgârı','Yeşil Zirve','Pembe Ufuk'];
export const assets=new URL('./art/',import.meta.url).href;
let phaserPromise;
export function loadPhaser(){
  if(window.Phaser)return Promise.resolve(window.Phaser);
  return phaserPromise??=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('./vendor/phaser.min.js',import.meta.url);s.onload=()=>resolve(window.Phaser);s.onerror=()=>{phaserPromise=null;s.remove();reject(Error('Oyun motoru yüklenemedi. Yeniden dene.'))};document.head.append(s)});
}
export function disposePhaser(game){if(!game||game.pendingDestroy)return;game.destroy(true);if(game.pendingDestroy)game.runDestroy();}
export const store={
  read(key,fallback){try{return JSON.parse(localStorage.getItem('btoyun-play-'+key))??fallback}catch{return fallback}},
  write(key,value){try{localStorage.setItem('btoyun-play-'+key,JSON.stringify(value))}catch{}},
  record(id,score){const value=Math.max(this.read(id+'-best',0),Math.round(score));this.write(id+'-best',value);return value}
};
export function text(scene,x,y,value,size=22,color='#ffffff',align='center'){
  return scene.add.text(x,y,value,{fontFamily:'system-ui, sans-serif',fontSize:size+'px',fontStyle:'bold',color,align,stroke:'#071b2d',strokeThickness:3}).setOrigin(align==='left'?0:.5,.5);
}
export function makeBall(scene){
  if(scene.textures.exists('arena-ball'))return;
  const g=scene.make.graphics({x:0,y:0,add:false});g.fillStyle(0xeaf7fa);g.fillCircle(24,24,23);g.lineStyle(2,0x75909d);g.strokeCircle(24,24,23);g.fillStyle(0x1b3449);g.fillPoints([{x:24,y:14},{x:34,y:21},{x:30,y:33},{x:18,y:33},{x:14,y:21}],true);g.lineStyle(2,0x577888);for(let i=0;i<5;i++){const a=i*Math.PI*2/5-Math.PI/2;g.lineBetween(24+Math.cos(a)*12,24+Math.sin(a)*12,24+Math.cos(a)*22,24+Math.sin(a)*22)}g.generateTexture('arena-ball',48,48);g.destroy();
}
