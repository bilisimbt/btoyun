import {W,H,assets,loadPhaser,disposePhaser,clamp,lerp,penaltyWinner,store,TEAMS,text,makeBall} from './core.js';
import {GOAL,SHOTS,makeShot,flightPoint,projectBall,goalContact} from './penalty-shots.js?v=18';

export async function create(host){
 const Phaser=await loadPhaser();if(host.dead)return null;
 return new Promise((resolve,reject)=>{
  const engine=new Phaser.Game({type:Phaser.AUTO,parent:host.q('#pgRender'),width:W,height:H,backgroundColor:'#061824',audio:{noAudio:true},input:{keyboard:false,mouse:false,touch:false},render:{antialias:true},scene:{
   preload(){this.load.image('stadium',assets+'stadium.webp');this.load.image('football',assets+'football.webp');this.load.on('loaderror',()=>reject(Error('Futbol görselleri yüklenemedi. Yeniden dene.')));},
   create(){resolve(new Penalty(host,this,engine));},
   update(time,delta){this.controller?.update(Math.min(delta/1000,.05));}
  }});
 });
}

class Penalty{
 constructor(host,scene,engine){
  this.host=host;this.s=scene;this.engine=engine;scene.controller=this;this.time=0;this.team=0;this.round=0;this.opponent=1;this.mode='practice';this.difficulty='normal';this.phase='menu';this.particles=[];this.trail=[];this.score=0;this.aim={x:480,y:178};
  this.shotType=store.read('penalty-shot','place');if(!SHOTS[this.shotType])this.shotType='place';this.spin=store.read('penalty-spin',1);if(![-1,0,1].includes(this.spin))this.spin=1;
  const atlas=scene.textures.get('football'),width=atlas.source[0].width,height=atlas.source[0].height;
  for(let i=0;i<8;i++){const x=Math.round(i%4*width/4),y=Math.round(Math.floor(i/4)*height/2),x2=Math.round((i%4+1)*width/4),y2=Math.round((Math.floor(i/4)+1)*height/2);const crop=i===0?[0,0,400,443]:i===1?[403,0,484,443]:i===2?[887,0,543,443]:i===3?[1430,0,346,443]:[x,y,x2-x,y2-y];atlas.add(i,0,...crop);}
  scene.add.image(480,160,'stadium').setDisplaySize(1440,960);
  this.net=scene.add.graphics().setDepth(1);this.shadow=scene.add.ellipse(480,442,45,12,0x041824,.45).setDepth(2);
  this.keeper=scene.add.sprite(480,222,'football',0).setOrigin(.5,1).setDisplaySize(110,110).setDepth(3);
  this.striker=scene.add.sprite(378,496,'football',4).setOrigin(.5,1).setDisplaySize(210,210).setDepth(4);
  this.trailGraphics=scene.add.graphics().setDepth(5);makeBall(scene);this.ball=scene.add.image(480,438,'arena-ball').setDisplaySize(36,36).setDepth(6);
  this.marker=scene.add.graphics().setDepth(7);this.fx=scene.add.graphics().setDepth(8);this.power=scene.add.graphics().setDepth(10);
  this.label=text(scene,480,45,'',25).setDepth(11);this.phaseLabel=text(scene,480,79,'',16,'#b6e5e7').setDepth(11);
  this.powerLabel=text(scene,790,259,'',15).setDepth(11).setVisible(false);this.saved=text(scene,480,275,'',26).setDepth(11).setVisible(false);
  this.lastCue=-1;this.attachShotControls();this.updateHud();
 }

 attachShotControls(){
  const panel=document.createElement('section');panel.className='pg-shot-lab';panel.setAttribute('aria-label','Şut tekniği');
  const paths={place:'M3 22 Q6 4 24 7 M19 3 L25 7 L20 12',power:'M3 22 L25 5 M18 5 L25 5 L25 12 M2 13 L8 7 M11 25 L17 19',chip:'M3 23 Q14 -7 25 22 M19 18 L25 23 L28 17'};
  panel.innerHTML=`<div class="pg-shot-types" role="group" aria-label="Şut çeşidi">${Object.entries(SHOTS).map(([id,s],i)=>`<button data-shot="${id}" aria-pressed="false"><svg viewBox="0 0 30 28" aria-hidden="true"><path d="${paths[id]}"/></svg><span><b>${s.name}</b><small>${s.tag} · ${i+1}</small></span></button>`).join('')}</div><div class="pg-spin-row"><span>Plase falsosu</span><div role="group" aria-label="Falso yönü"><button data-spin="-1" aria-pressed="false">↶ Sol</button><button data-spin="0" aria-pressed="false">Düz</button><button data-spin="1" aria-pressed="false">Sağ ↷</button></div></div><p id="pgShotHint"></p><div class="pg-shot-meter" id="pgShotMeter" hidden><span id="pgShotPower">Güç</span><div class="pg-power-track"><i class="pg-power-sweet"></i><i class="pg-power-fill"></i></div></div>`;
  hostInsert(this.host,panel);this.shotPanel=panel;
  panel.querySelectorAll('[data-shot]').forEach(b=>b.onclick=()=>this.selectShot(b.dataset.shot));
  panel.querySelectorAll('[data-spin]').forEach(b=>b.onclick=()=>{if(!this.canChoose()||this.shotType!=='place')return;this.spin=Number(b.dataset.spin);store.write('penalty-spin',this.spin);this.host.audio.play('click');this.syncShotUI(true);this.host.q('.pg-render').focus({preventScroll:true});});
  for(const [key,label] of [['left','Sola nişan al'],['right','Sağa nişan al'],['up','Yukarı nişan al'],['down','Aşağı nişan al']])this.host.q(`[data-pg-key="${key}"]`)?.setAttribute('aria-label',label);
  window.addEventListener('keydown',e=>{if(this.host.paused||!this.host.root.contains(document.activeElement)||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.repeat)return;const id={'1':'place','2':'power','3':'chip'}[e.key];if(id){e.preventDefault();this.selectShot(id);}}, {signal:this.host.abort.signal});
  this.syncShotUI(true);
 }
 canChoose(){return !this.host.paused&&this.turn==='shoot'&&this.phase==='aim'&&!this.hold;}
 selectShot(id){if(!SHOTS[id]||!this.canChoose())return;this.shotType=id;store.write('penalty-shot',id);this.host.audio.play('click');this.syncShotUI(true);this.host.q('.pg-render').focus({preventScroll:true});}
 syncShotUI(force=false){
  const state=[this.shotType,this.spin,this.turn,this.phase,!!this.hold,this.host.paused].join(':');if(!force&&state===this.uiState)return;this.uiState=state;
  const choose=this.canChoose();this.shotPanel.hidden=this.phase==='menu';
  this.shotPanel.querySelectorAll('[data-shot]').forEach(b=>{b.disabled=!choose;b.setAttribute('aria-pressed',String(b.dataset.shot===this.shotType));});
  this.shotPanel.querySelectorAll('[data-spin]').forEach(b=>{b.disabled=!choose||this.shotType!=='place';b.setAttribute('aria-pressed',String(Number(b.dataset.spin)===this.spin));});
  this.host.q('#pgShotMeter').hidden=!this.hold;
  this.host.q('#pgShotHint').textContent=this.phase==='result'?this.feedback:this.turn==='save'?'Kalecisin: turuncu hedefi izle. Yönünü seçip Kurtar’a bas veya kaleye dokun. Erken atlayınca aşırtmaya açık kalırsın.':SHOTS[this.shotType].description;
  const b=this.host.q('[data-pg-key="action"]');b.querySelector('b').textContent=this.turn==='save'?'Kurtar':'Şut';b.querySelector('small').textContent=this.turn==='save'?'Yön seç, bas':'Basılı tut, bırak';
 }

 menu(){
  this.phase='menu';this.host.message('');this.host.overlay('Penaltı Arenası','Kaleciyi oku. Şutunu seç, köşeyi hedefle ve doğru güçle vur.',[['Antrenman',()=>this.begin('practice')],['Kupaya başla',()=>this.begin('cup')]],`<div class="pg-options"><label>Takımın<select id="pgTeam">${TEAMS.map((t,i)=>`<option value="${i}">${t}</option>`).join('')}</select></label><label>Zorluk<select id="pgDifficulty"><option value="easy">Kolay</option><option value="normal" selected>Normal</option><option value="hard">Usta</option></select></label></div><p><b>Plase · Sert şut · Aşırtma</b><br>Fareyle kalede bir nokta seç veya yön tuşlarını kullan.<br>Şut’a basılı tut; yeşil güç bandında bırak.</p>`);this.syncShotUI(true);
 }
 begin(mode){this.team=Number(this.host.q('#pgTeam')?.value??this.team);this.difficulty=this.host.q('#pgDifficulty')?.value??this.difficulty;this.mode=mode;this.round=0;this.score=0;this.resetMatch();this.host.play();this.syncShotUI(true);}
 resetMatch(){this.opponent=(this.team+this.round+1)%8;this.lastCue=-1;this.a=0;this.b=0;this.na=0;this.nb=0;this.shotsA=[];this.shotsB=[];this.turn='shoot';this.nextTurn();this.updateHud();}
 restart(){this.menu();}
 updateHud(){this.host.hud([['Sen / Rakip',`${this.a||0} : ${this.b||0}`],['Tur',this.mode==='cup'?['Çeyrek final','Yarı final','Final'][this.round]:'Antrenman'],['Puan',this.score],['Cihaz rekoru',store.read('penalty-best',0)]]);}
 nextTurn(){
  this.phase='aim';this.t=0;this.skipResumeFrame=false;this.hold=false;this.powerValue=0;this.shot=null;this.runup=null;this.trail=[];this.trailGraphics.clear();this.ball.setPosition(480,438).setDisplaySize(36,36).setAngle(0).setVisible(true);this.shadow.setPosition(480,442).setScale(1).setAlpha(.45);
  this.keeperHome=480;this.standKeeper();this.striker.setFrame(4).setPosition(378,496).setVisible(true).setTint(this.turn==='shoot'?0xffffff:0xa9c6ff);
  this.saved.setVisible(false);this.net.clear();this.marker.clear();this.power.clear();this.powerLabel.setVisible(false);this.lockedAim=null;this.dive=null;this.aiDive=null;this.aim={x:575,y:171};this.keeperAim={x:480,y:178};
  this.label.setText(TEAMS[this.team]+'  /  '+TEAMS[this.opponent]);this.phaseLabel.setText(this.na>=5&&this.nb>=5?'Ani ölüm · Eşit sayıda atış':'Beş penaltı · Şut ve kurtarış');
  this.host.message(this.turn==='shoot'?'ŞUT SENDE · Şut çeşidini ve hedefini seç':'KALE SENDE · Kaleciyi doğru zamanda hareket ettir');
  this.host.status(this.turn==='shoot'?'1: Plase · 2: Sert şut · 3: Aşırtma. Fare / yön tuşları: nişan. Boşluk: basılı tut ve bırak.':'Turuncu hedef belirince yönünü seç, Boşluk’a bas veya kaleye dokun.');
  if(this.turn==='save'){
   const type=['place','power','chip'][(this.na+this.round)%3],power=lerp(SHOTS[type].min,SHOTS[type].max,.25+Math.random()*.5);
   const aim=type==='chip'?{x:480+(Math.random()-.5)*90,y:136+Math.random()*15}:{x:GOAL.left+23+Math.random()*(GOAL.right-GOAL.left-46),y:GOAL.top+20+Math.random()*(GOAL.bottom-GOAL.top-34)};
   this.opponentShot=makeShot(type,aim,power,Math.random()<.5?-1:1,this.time);this.target=this.opponentShot.target;
   this.cueDelay=this.difficulty==='hard'?.70:this.difficulty==='easy'?1.3:1;this.launchDelay=this.cueDelay+(this.difficulty==='hard'?.24:this.difficulty==='easy'?.62:.42);
  }
  this.syncShotUI(true);
 }

 input(key,down){if(this.host.paused)return;if(key==='action'){if(this.turn==='shoot'&&this.phase==='aim'){if(down)this.startHold();else if(this.hold)this.release();}else if(this.turn==='save'&&down)this.doDive(this.keeperAim);}}
 inGoal(pos){return pos&&pos.x>=GOAL.left-28&&pos.x<=GOAL.right+28&&pos.y>=GOAL.top-22&&pos.y<=GOAL.bottom+22;}
 setAim(pos){if(this.inGoal(pos))this.aim={x:clamp(pos.x,GOAL.left-18,GOAL.right+18),y:clamp(pos.y,GOAL.top-15,GOAL.bottom-9)};}
 startHold(pos){if(this.turn!=='shoot'||this.phase!=='aim'||this.hold)return;this.setAim(pos);this.lockedAim={...this.aim};this.hold=true;this.holdTime=0;this.powerValue=0;this.syncShotUI(true);}
 release(){if(!this.hold||this.phase!=='aim')return;this.hold=false;this.shot=makeShot(this.shotType,this.lockedAim,this.powerValue,this.spin,this.time);this.target=this.shot.target;this.startRunup();}
 pointer(type,pos,id=0){
  if(this.host.paused)return;const source='surface:'+id;
  if(type==='up'||type==='cancel'){this.host.press('action',false,source,type==='cancel');return;}
  if(this.turn==='shoot'&&this.phase==='aim'){
   if(type==='move'&&!this.hold)this.setAim(pos);
   if(type==='down'){this.startHold(pos);this.host.press('action',true,source);}
  }else if(this.turn==='save'&&type==='down'&&this.inGoal(pos))this.doDive({x:clamp(pos.x,GOAL.left+14,GOAL.right-14),y:clamp(pos.y,GOAL.top+14,GOAL.bottom-10)});
 }
 cancelInput(key){if(key&&key!=='action')return;this.hold=false;this.powerValue=0;this.power.clear();this.powerLabel.setVisible(false);if(this.shotPanel)this.host.q('#pgShotMeter').hidden=true;}
 resume(){this.skipResumeFrame=true;}
 startRunup(){this.phase='runup';this.runup={age:0,duration:this.shot.type==='power'?.34:.28};this.power.clear();this.powerLabel.setVisible(false);this.host.message(`${SHOTS[this.shot.type].name.toLocaleUpperCase('tr-TR')} · ${Math.round(this.shot.power*100)}% güç`);this.syncShotUI(true);}
 doDive(pos){if(this.turn!=='save'||this.dive||!['aim','runup','flight'].includes(this.phase))return;this.dive={x:pos.x,y:pos.y,start:this.t,from:this.keeperHome};this.host.audio.play('save',.25);}
 launch(){this.phase='flight';this.flightTime=0;this.flightDuration=this.shot.duration;this.flightStart=this.t;this.hold=false;this.power.clear();this.marker.clear();this.powerLabel.setVisible(false);this.striker.setFrame(6).setPosition(400,496);this.host.audio.play('kick',this.shot.type==='power'?1:.65);this.host.message('');this.syncShotUI(true);}

 update(dt){
  if(this.host.paused)return;if(this.skipResumeFrame){this.skipResumeFrame=false;dt=0;}this.time+=dt;this.t+=dt;this.fx.clear();this.animateParticles(dt);
  if(this.phase==='aim'){
   if(this.turn==='shoot'){
    this.keeperHome=480+Math.sin(this.time*1.8+this.opponent*.6)*28;this.standKeeper();
    if(!this.hold){this.steer(this.aim,dt,145,100);this.drawAim();}
    else{this.holdTime+=dt;this.powerValue=.5-.5*Math.cos(this.holdTime*Math.PI/SHOTS[this.shotType].charge);this.drawAim();this.drawPower();}
   }else{
    this.steer(this.keeperAim,dt,190,130);
    if(this.t>=this.cueDelay){this.drawMarker(this.target,0xffbd66);this.fx.lineStyle(2,0x64f9de,.9);this.fx.strokeCircle(this.keeperAim.x,this.keeperAim.y,11);if(this.lastCue!==this.na+this.nb){this.host.audio.play('whistle',.4);this.lastCue=this.na+this.nb;}this.host.message(`RAKİP: ${SHOTS[this.opponentShot.type].name.toLocaleUpperCase('tr-TR')} · Kurtarış zamanını seç!`);}
    if(this.dive)this.drawKeeper(this.dive,this.t-this.dive.start);else this.standKeeper();
    if(this.t>=this.launchDelay){this.shot=this.opponentShot;this.startRunup();}
   }
  }else if(this.phase==='runup'){
   this.runup.age+=dt;const p=clamp(this.runup.age/this.runup.duration,0,1);this.striker.setFrame(5).setPosition(lerp(378,400,p),496-Math.sin(p*Math.PI)*6);
   if(this.turn==='save'&&this.dive)this.drawKeeper(this.dive,this.t-this.dive.start);
   if(p>=1)this.launch();
  }else if(this.phase==='flight'){
   this.flightTime+=dt;const p=clamp(this.flightTime/this.flightDuration,0,1),point=flightPoint(this.shot,p);this.placeBall(point,p);
   if(this.turn==='shoot'){this.reactKeeper(p);if(this.aiDive)this.drawKeeper(this.aiDive,this.flightTime-this.aiDive.delay);else this.standKeeper();}
   else if(this.dive)this.drawKeeper(this.dive,this.t-this.dive.start);else this.standKeeper();
   if(p>=1)this.resolveShot();
  }else if(this.phase==='result'){
   this.animateResult(this.t-this.resultAt);
   if(this.t>this.resultAt+1.65){const winner=penaltyWinner(this.a,this.b,this.na,this.nb);if(winner)this.endMatch(winner);else{this.turn=this.turn==='shoot'?'save':'shoot';this.nextTurn();}}
  }
  this.syncShotUI();
 }
 steer(pos,dt,horizontal,vertical){const keys=this.host.keys;pos.x=clamp(pos.x+(Number(keys.has('right'))-Number(keys.has('left')))*horizontal*dt,GOAL.left-18,GOAL.right+18);pos.y=clamp(pos.y+(Number(keys.has('down'))-Number(keys.has('up')))*vertical*dt,GOAL.top-15,GOAL.bottom-9);}
 placeBall(point,p){
  this.ball.setPosition(point.x,point.y).setDisplaySize(point.size,point.size).setAngle(this.shot.spin?p*this.shot.spin*1500:p*(this.shot.type==='chip'?400:950));this.shadow.setPosition(point.x,point.groundY+3).setScale(point.size/36).setAlpha(clamp(.44-point.height*.10,.10,.44));
  if(this.host.quality!=='low'){this.trail.push({x:point.x,y:point.y});if(this.trail.length>16)this.trail.shift();this.trailGraphics.clear();for(let i=1;i<this.trail.length;i++){this.trailGraphics.lineStyle(2,SHOTS[this.shot.type].color,i/this.trail.length*.45);this.trailGraphics.lineBetween(this.trail[i-1].x,this.trail[i-1].y,this.trail[i].x,this.trail[i].y);}}
 }
 reactKeeper(p){
  if(this.aiDive)return;const reaction={easy:.32,normal:.23,hard:.16}[this.difficulty];if(this.flightTime<reaction)return;
  const anticipation=clamp({easy:.42,normal:.72,hard:.91}[this.difficulty]+Math.cos(this.time*1.7+this.opponent)*.09,.3,.97),shot=this.shot;
  const estimateX=shot.worldX-shot.spin*shot.curve*4*(1-p)*(1-anticipation);
  let x=projectBall(estimateX,0,11).x,y=shot.target.y;
  // A central chip can punish an early commitment to a side. A disciplined
  // keeper in the highest difficulty stays upright more often.
  if(shot.type==='chip'&&Math.abs(x-480)<58&&Math.abs(this.keeperHome-480)>(this.difficulty==='hard'?24:8)){x=480+Math.sign(this.keeperHome-480)*110;y=185;}
  this.aiDive={x:clamp(x,GOAL.left+15,GOAL.right-15),y:clamp(y,GOAL.top+12,GOAL.bottom-12),delay:this.flightTime,from:this.keeperHome};
 }
 standKeeper(){this.keeper.setFrame(0).setPosition(this.keeperHome||480,222).setDisplaySize(110,110);this.keeperState={x:this.keeperHome||480,y:180,rx:27,ry:43};}
 saveWindow(){return this.difficulty==='easy'?1.55:this.difficulty==='hard'?1.08:1.3;}
 drawKeeper(dive,age){
  if(age<.07){this.standKeeper();return;}const home=dive.from??480,travel=.23+Math.abs(dive.x-home)/530,raw=clamp((age-.07)/travel,0,1),p=raw*raw*(3-2*raw);
  const late=clamp((age-this.saveWindow()*.75)/.34,0,1),x=lerp(home,dive.x,p),y=lerp(180,dive.y,p)+late*37;
  if(age>this.saveWindow()+.25){this.standKeeper();return;}
  const left=dive.x<home-25,right=dive.x>home+25,frame=left?1:right?2:3;
  this.keeper.setFrame(frame).setDisplaySize(left||right?152:90,110).setPosition(x+(left?68:right?-52:0),y+(left?65:right?65:101));
  this.keeperState={x,y,rx:31-late*8,ry:28-late*5};
 }

 resolveShot(){
  if(this.phase==='result')return;const contact=this.shot.short?'short':goalContact(this.target),k=this.keeperState;
  const speedPenalty=this.shot.type==='power'?4:0,rx=k.rx+8-speedPenalty,ry=k.ry+8-speedPenalty;
  const saved=contact==='goal'&&((this.target.x-k.x)/rx)**2+((this.target.y-k.y)/ry)**2<=1;
  const goal=contact==='goal'&&!saved,result=goal?'goal':saved?'save':contact;
  this.resultKind=result;this.phase='result';this.resultAt=this.t;this.trailGraphics.clear();this.trail=[];this.marker.clear();this.saved.setVisible(true).setText(goal?'GOL!':saved?'KURTARIŞ!':contact==='post'?'DİREK!':contact==='short'?'ZAYIF ŞUT':'DIŞARI!').setColor(goal?'#65ffd6':'#ffc782');
  this.host.audio.play(goal?'net':contact==='post'?'post':saved?'save':'whoosh');
  if(this.turn==='shoot'){this.na++;this.shotsA.push(goal);if(goal){this.a++;this.score+=100+(this.shot.quality>.95?15:0)+(this.shot.type==='chip'?20:this.shot.spin?10:0);this.striker.setFrame(7).setPosition(378,496);}}
  else{this.nb++;this.shotsB.push(goal);if(goal)this.b++;else this.score+=80;}
  if(goal)this.burst(this.target.x,this.target.y,0x55eebd,22);else if(contact==='post')this.burst(this.target.x,this.target.y,0xffd172,14);else if(saved){this.fx.lineStyle(3,0x6df4dc);this.fx.strokeCircle(k.x,k.y,22);this.burst(k.x,k.y,0xc3f6ff,8);}
  const s=SHOTS[this.shot.type];this.feedback=contact==='short'?'Şut kaleye ulaşmadı. Gücü yeşil banda kadar artır.':this.shot.quality<.7?`${s.name}: güç bandını kaçırdın. Bir sonraki vuruşta yeşil aralıkta bırak.`:saved?'Kaleci bu köşeye yetişti. Diğer köşeyi, falso yönünü veya aşırtmayı dene.':goal?'İyi vuruş! Kalecinin konumuyla şut tekniğini birlikte değerlendir.':contact==='post'?'Direğe çok yakındı. Hedefi biraz kalenin içine taşı.':'Hedefini kalenin içine taşı ve güç bandını takip et.';
  const resultText=`${s.name} · ${goal?'Gol':saved?'Kurtarıldı':contact==='post'?'Direk':contact==='short'?'Zayıf vuruş':'Dışarı'} · Sen ${this.a} : ${this.b} Rakip`;
  this.host.message(resultText);this.host.status(this.feedback);this.updateHud();this.phaseLabel.setText(`Sen: ${this.shotsA.map(v=>v?'●':'○').join(' ')}    Rakip: ${this.shotsB.map(v=>v?'●':'○').join(' ')}`);this.syncShotUI(true);if(!this.host.reduced)this.s.cameras.main.shake(80,.002);
 }
 animateResult(age){
  const shot=this.shot,q=clamp(age,0,1.2),bounce=this.resultKind==='post'||this.resultKind==='save',z=bounce?shot.range-q*2.6:shot.range+q*2.1;
  const x=shot.worldX+(bounce?(this.target.x<480?.8:-.8)*q:0),height=Math.max(0,shot.height-q*q*2.6)+(bounce?Math.abs(Math.sin(q*7))*.22:0),point=projectBall(x,height,z);
  this.ball.setPosition(point.x,point.y).setDisplaySize(point.size,point.size).setAngle(this.ball.angle+7);this.shadow.setPosition(point.x,point.groundY).setScale(point.size/36).setAlpha(.28);
  if(this.resultKind==='goal'){this.net.clear();const amplitude=Math.exp(-age*3)*5;this.net.lineStyle(1.5,0xd6fff1,.55);for(let i=0;i<9;i++){const xx=GOAL.left+i*(GOAL.right-GOAL.left)/8;this.net.beginPath();this.net.moveTo(xx,GOAL.top);this.net.lineTo(xx+Math.sin(age*18+i)*amplitude,lerp(GOAL.top,GOAL.bottom,.55));this.net.lineTo(xx,GOAL.bottom);this.net.strokePath();}}
 }

 drawAim(){
  const aim=this.hold?this.lockedAim:this.aim,style=SHOTS[this.shotType],preview=makeShot(this.shotType,aim,(style.min+style.max)/2,this.spin,0,true);this.marker.clear();
  if(this.host.quality!=='low'){this.marker.fillStyle(style.color,.36);for(let i=1;i<20;i++){const pt=flightPoint(preview,i/20);this.marker.fillCircle(pt.x,pt.y,1.5);}}
  const safe=goalContact(aim)==='goal';this.drawMarker(aim,safe?style.color:0xffa18c,false);this.phaseLabel.setText(`${style.name}${this.shotType==='place'?' · '+(this.spin<0?'Sol falso':this.spin>0?'Sağ falso':'Düz vuruş'):''} · Kalede bir noktayı hedefle`);
 }
 drawMarker(pos,color,clear=true){if(clear)this.marker.clear();this.marker.lineStyle(2.5,color,.95);this.marker.strokeCircle(pos.x,pos.y,13);this.marker.lineBetween(pos.x-19,pos.y,pos.x+19,pos.y);this.marker.lineBetween(pos.x,pos.y-19,pos.x,pos.y+19);}
 drawPower(){
  const g=this.power,x=754,y=289,p=this.powerValue,s=SHOTS[this.shotType],good=p>=s.min&&p<=s.max;g.clear();g.fillStyle(0x071b30,.86);g.fillRoundedRect(x-25,y-22,132,168,12);g.fillStyle(0x334b60);g.fillRoundedRect(x,y,26,120,5);g.fillStyle(s.color,.25);g.fillRect(x-3,y+120*(1-s.max),32,120*(s.max-s.min));g.fillStyle(good?0x49eabc:p>s.max?0xff9b87:0x8cbada);g.fillRoundedRect(x,y+120*(1-p),26,120*p,4);g.lineStyle(2,s.color);g.strokeRect(x-3,y+120*(1-s.max),32,120*(s.max-s.min));
  this.powerLabel.setVisible(true).setText(`${Math.round(p*100)}% GÜÇ`);const fill=this.host.q('.pg-power-fill'),band=this.host.q('.pg-power-sweet');fill.style.width=p*100+'%';fill.style.background=good?'#57efc8':p>s.max?'#ffad99':'#80b8df';band.style.left=s.min*100+'%';band.style.width=(s.max-s.min)*100+'%';this.host.q('#pgShotPower').textContent=`${Math.round(p*100)}% · ${good?'Şimdi bırak!':p>s.max?'Fazla güç':'Gücü artır'}`;
 }
 endMatch(winner){
  store.record('penalty',this.score);this.updateHud();if(winner==='player'){this.host.audio.play('win');if(this.mode==='cup'&&this.round<2){this.host.overlay(this.round===0?'Yarı finale çıktın!':'Finaldesin!',`${this.a} : ${this.b} · Bir sonraki rakip seni bekliyor.`,[['Sonraki maç',()=>{this.round++;this.resetMatch();this.host.play();this.syncShotUI(true);}],['Takım seçimi',()=>this.menu()]]);this.host.reward(this.round===0?'penalty-semi':'penalty-final',`${this.a} : ${this.b} · ${this.score} puan`);return;}if(this.mode==='cup')store.write('penalty-cups',store.read('penalty-cups',0)+1);}
  this.host.overlay(winner==='player'?(this.mode==='cup'?'Kupa senin!':'Maçı kazandın!'):'Yeni bir deneme',`${this.a} : ${this.b} · ${this.score} puan. ${winner==='player'?'Şut çeşitlerini ve zamanlamayı iyi kullandın.':'Kalecinin konumuna göre şutunu değiştir.'}`,[['Tekrar oyna',()=>{this.round=0;this.score=0;this.resetMatch();this.host.play();this.syncShotUI(true);}],['Takım seçimi',()=>this.menu()]]);if(winner==='player')this.host.reward(this.mode==='cup'?'penalty-cup':'penalty-match',`${this.a} : ${this.b} · ${this.score} puan`);
 }
 burst(x,y,color,n){for(let i=0;i<(this.host.quality==='low'?6:n);i++)this.particles.push({x,y,vx:(Math.random()-.5)*160,vy:-50-Math.random()*110,life:.7,color});}
 animateParticles(dt){this.particles=this.particles.filter(p=>p.life>0);for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=190*dt;this.fx.fillStyle(p.color,clamp(p.life,0,1));this.fx.fillRect(p.x,p.y,3,3);}}
 destroy(){this.shotPanel.remove();disposePhaser(this.engine);this.particles=[];}
}
function hostInsert(host,panel){host.q('.pg-controls').before(panel);}
