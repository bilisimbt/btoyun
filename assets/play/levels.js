// Road segments describe their visible top edge. Moving features keep explicit anchors.
const road=(points)=>points.slice(1).map((p,i)=>[...points[i],...p]);
export const DRIVE_LEVELS=[
 {name:'İlk denge',zone:0,hint:'Gazı basılı tut. Rampadan sonra frenle yavaşla.',road:road([[0,420],[480,420],[720,340],[950,420],[1750,420]]),end:1640},
 {name:'Dalgalı yol',zone:0,hint:'İnişlerde gazı azalt; aracın açısını koru.',road:road([[0,420],[390,420],[610,350],[800,420],[1020,335],[1230,420],[1870,420]]),end:1760},
 {name:'İlk sıçrama',zone:0,hint:'Rampaya hızla gir, inişten önce gazı bırak.',road:[...road([[0,420],[480,420],[760,305]]),...road([[845,385],[1300,420],[1970,420]])],end:1860},
 {name:'Dar zirve',zone:0,hint:'Zirveye yaklaşırken yavaşla; kontrollü iniş yap.',road:road([[0,420],[420,420],[740,285],[880,285],[1170,420],[2020,420]]),end:1910},
 {name:'Denge köprüsü',zone:1,hint:'Köprüye sakin gir. Ağırlığın köprüyü hareket ettirir.',road:[...road([[0,420],[560,420]]),...road([[1060,420],[2080,420]])],seesaw:{x:810,y:420,w:500},end:1960},
 {name:'Yükselen geçit',zone:1,hint:'Hareketli platform yaklaşınca gaz ver.',road:[...road([[0,420],[570,420]]),...road([[990,390],[2180,420]])],lift:{x:780,y:410,w:430,amplitude:45,period:4},end:2060},
 {name:'Kaygan bölüm',zone:1,hint:'Buzda fren mesafesi uzar. Erken yavaşla.',road:road([[0,420],[400,420],[680,340],[1120,340],[1440,420],[2260,420]]),ice:[2,3],end:2140},
 {name:'İki köprü',zone:1,hint:'İlk köprüde dengeyi kur, ikinciye yeterli hızla ulaş.',road:[...road([[0,420],[470,420]]),...road([[850,420],[1100,370]]),...road([[1480,400],[2340,420]])],seesaw:{x:660,y:420,w:380},lift:{x:1290,y:385,w:380,amplitude:30,period:3.8},end:2220},
 {name:'Usta sıçrama',zone:2,hint:'İlk rampada hız kazan, inişte frenle.',road:[...road([[0,420],[460,420],[750,285]]),...road([[850,370],[1180,370],[1410,420],[2400,420]])],end:2280},
 {name:'Basamaklar',zone:2,hint:'Rampalara kısa gaz dokunuşlarıyla gir.',road:road([[0,420],[400,420],[660,335],[850,335],[1020,275],[1260,275],[1580,420],[2510,420]]),end:2390},
 {name:'Köprüden uçuş',zone:2,hint:'Köprüden sonra hızlan, rampadan dengeli ayrıl.',road:[...road([[0,420],[450,420]]),...road([[830,420],[1020,420],[1300,290]]),...road([[1400,390],[2700,420]])],seesaw:{x:640,y:420,w:380},end:2580},
 {name:'Son parkur',zone:2,hint:'Hız, fren ve iniş açısı: Üç becerini birlikte kullan.',road:[...road([[0,420],[390,420],[620,340],[830,420]]),...road([[1200,420],[1460,310]]),...road([[1560,400],[1880,400],[2110,420],[2850,420]])],lift:{x:1015,y:420,w:370,amplitude:30,period:4.2},ice:[5],end:2730}
];
export const ZONES=[{name:'Başlangıç parkuru',sky:0x173c64,ground:0x3b5468,edge:0xffc36b,far:0x244964},{name:'Köprüler vadisi',sky:0x182f51,ground:0x344f66,edge:0x5ed9ed,far:0x234761},{name:'Ustalık parkuru',sky:0x342746,ground:0x564454,edge:0xe9a878,far:0x4c345c}];
export const TUNNEL_LEVELS=Array.from({length:12},(_,i)=>({name:['İlk ışık','Sağ ve sol','Dönen kapı','Ritimli geçiş','Açıyı oku','İkili kapılar','Mor hat','Yeni yön','Dar açıklık','Işık sarmalı','Keskin dönüş','Neon ustası'][i],count:8+i,speed:17+i*1.35,spacing:25-i*.25,gap:2.2-i*.055,rotation:i<2?0:i<6?.18:.3,palette:i%3}));
