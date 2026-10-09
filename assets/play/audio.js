import {store,clamp} from './core.js';
export class EffectsAudio{
 constructor(){this.muted=store.read('muted',false);this.volume=store.read('volume',.45);this.voices=new Set();this.ctx=null;}
 unlock(){try{this.ctx??=new(window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{})}catch{}}
 setMuted(value){this.muted=value;store.write('muted',value);if(value)this.stop();else this.unlock();}
 setVolume(value){this.volume=clamp(Number(value),0,1);store.write('volume',this.volume);}
 play(kind,intensity=1){
  const c=this.ctx;if(this.muted||!c||c.state!=='running'||!this.volume)return;
  const config={kick:[140,65,.13,'noise'],net:[330,120,.18,'noise'],save:[160,90,.12,'noise'],post:[950,440,.25,'triangle'],whistle:[1800,2100,.16,'sine'],win:[600,1100,.28,'triangle'],hit:[130,55,.18,'noise'],land:[100,50,.1,'noise'],engine:[55+intensity*40,65+intensity*50,.07,'sawtooth'],whoosh:[500,1700,.1,'noise'],pass:[800,1150,.09,'sine'],click:[550,750,.07,'sine']}[kind]||[400,600,.1,'sine'];
  const [from,to,duration,type]=config,now=c.currentTime,gain=c.createGain();let source;
  if(type==='noise'){const buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1);source=c.createBufferSource();source.buffer=buffer;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(from*5,now);filter.frequency.exponentialRampToValueAtTime(to*3,now+duration);source.connect(filter);filter.connect(gain);source._filter=filter;}
  else{source=c.createOscillator();source.type=type;source.frequency.setValueAtTime(from,now);source.frequency.exponentialRampToValueAtTime(to,now+duration);source.connect(gain);}
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,this.volume*.2*(kind==='engine'?.3:1)*clamp(intensity,.1,1)),now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);gain.connect(c.destination);this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();source._filter?.disconnect();gain.disconnect()};source.start(now);source.stop(now+duration+.01);
 }
 stop(){for(const s of this.voices){try{s.stop()}catch{}}this.voices.clear();}
 destroy(){this.stop();this.ctx?.close().catch(()=>{});this.ctx=null;}
}
