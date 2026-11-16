import {initializeApp} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {getAuth,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,sendEmailVerification,sendPasswordResetEmail,onAuthStateChanged,reload,getIdTokenResult} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {getFunctions,httpsCallable,connectFunctionsEmulator} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js";
import {firebaseConfig} from "./firebase-config.js";
import {getFirestore,collection,doc,addDoc,getDocs,getDoc,setDoc,runTransaction,query,where,updateDoc,serverTimestamp,limit} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
const $=s=>document.querySelector(s),app=$("#app"),modal=$("#modal"),body=$("#modalBody");
let auth=null,functions=null,db=null,current=null,user=null,cases=[],cards=[],quests=[],weights=[],page="home",busy=false;
const fmt=n=>Number(n||0).toLocaleString("ru-RU");
const escape=s=>String(s??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
const toast=m=>{const el=document.createElement("div");el.className="toast";el.textContent=m;$("#toast").append(el);setTimeout(()=>el.remove(),4500)};
const err=e=>{const msg=[e.code||"",e.message||String(e)].filter(Boolean).join(" · ").replace(/^Firebase: /,"").slice(0,320);toast(msg);console.error("[VIDNESD]",e)};
// Free Spark demo. Game progress is stored locally, not protected from editing.
const DEMO_CASES=Array.from({length:16},(_,i)=>({id:"case"+i,name:["Starter","Neon Dreams","Cosmic","Wildlife","Ocean","Fantasy","Stardust","Mystic","Phoenix","Moonlight","Cyber","Galaxy","Crystal","Royal","Eclipse","Infinity"][i],emoji:["🎁","🌈","🪐","🦊","🌊","🐉","🌠","🔮","🔥","🌙","🤖","🌌","💎","👑","🌑","♾️"][i],price:[100,180,250,350,450,550,650,750,900,1100,1300,1500,1750,2000,2400,3000][i],tier:Math.min(3,Math.floor(i/4))}));
const EXTRA_CASES=[
["Aurora","🌌",420,1],["Jungle Relics","🌿",520,1],["Deep Space","🚀",800,2],["Pixel World","👾",950,2],
["Golden Age","🏆",1200,2],["Frozen Kingdom","❄️",1450,2],["Dark Matter","🕳️",1800,3],["Dragon Realm","🐲",2100,3],
["Arcade Legends","🕹️",260,0],["Candy Dreams","🍬",300,0],["Ocean Depths","🐙",600,1],["Royal Vault","🏰",2700,3],
["Neon City","🌃",1050,2],["Mythic Forest","🍄",700,1],["Time Machine","⏳",1650,3],["Celestial","☀️",3200,3]
];
EXTRA_CASES.push(...[["Void Signal","📡",340,0],["Paper Kingdom","📜",390,0],["Pixel Garden","🌱",470,1],["Arctic Pulse","🧊",580,1],["Circuit Lab","🧪",720,1],["Ancient Temple","🏛️",880,2],["Lunar Station","🛸",980,2],["Shadow Realm","🌘",1150,2],["Obsidian","🖤",1400,2],["Prismatic","🔷",1600,3],["Sunken City","🏝️",1850,3],["Golden Orbit","🪙",2200,3],["Celestial Gate","🚪",2500,3],["Eternal Bloom","🌺",2750,3],["Singularity","🌀",3100,3],["Final Horizon","🌄",3500,3]]);
EXTRA_CASES.push(...[["Forest Echo","🍃",420,1],["Circuit Breaker","🔌",680,1],["Lava Core","🌋",1100,2],["Crystal Cave","🪨",1350,2],["Retro Waves","📼",300,0],["Star Harbor","⚓",790,1],["Night Bazaar","🏮",1700,3],["Cloud Citadel","☁️",2100,3],["Fossil Lab","🦕",380,0],["Skyfall","🌠",2450,3],["Arcane Library","📚",970,2],["Nebula Forge","⚒️",2900,3],["Deep Jungle","🦜",540,1],["Amber Vault","🟠",1500,2],["Electric Dream","💡",760,1],["Dream Portal","🚪",3300,3]]);
DEMO_CASES.push(...EXTRA_CASES.map(([name,emoji,price,tier],i)=>({id:"case"+(16+i),name,emoji,price,tier})));
// Special cases: rarity restrictions and value bands are part of the actual drop pool.
const SPECIAL_CASES=[
 ["Rare Focus","🔵",380,[12,76,11,1],12,3900],
 ["Epic Vault","🟣",1250,[12,18,66,4],12,3900],
 ["Legendary Vault","👑",3600,[8,12,30,50],12,3900],
 ["High Roller","🎲",850,[70,0,0,30],12,3900],
 ["Budget Box","📦",90,[100,0,0,0],12,40],
 ["Premium Rare","💠",650,[8,75,15,2],12,3900],
 ["Epic or Legend","🌌",2200,[10,15,55,20],12,3900],
 ["All or Nothing","⚡",1300,[85,0,0,15],12,3900],
 ["Golden Legends","🏆",4200,[5,10,25,60],12,3900],
 ["Crystal Mix","🔮",980,[0,35,55,10],85,3900],
 ["Lucky Discovery","🍀",500,[30,40,25,5],12,3900],
 ["Collector Elite","🪐",1900,[10,15,65,10],12,3900]
];
DEMO_CASES.push(...SPECIAL_CASES.map(([name,emoji,price,odds,minValue,maxValue],i)=>({id:"case"+(64+i),name,emoji,price,tier:0,odds,minValue,maxValue,special:true})));
// Expansion pack: themed cases with varied prices and rarity distributions.
const EXPANSION_CASES=[
 ["Midnight Metro","🚇",160,[82,15,2.7,.3]],["Botanical Lab","🪴",240,[78,18,3.5,.5]],
 ["Clockwork City","⚙️",340,[72,22,5,1]],["Desert Mirage","🏜️",460,[66,26,7,1]],
 ["Coral Sanctuary","🪸",560,[61,29,9,1]],["Digital Ruins","💾",690,[56,31,11,2]],
 ["Storm Observatory","🌩️",810,[52,32,13,3]],["Frozen Harbor","🧊",930,[49,33,15,3]],
 ["Emerald Jungle","🦎",1080,[45,34,17,4]],["Phantom Carnival","🎪",1230,[42,34,19,5]],
 ["Neon Underworld","🛸",1380,[40,33,21,6]],["Crimson Citadel","🏯",1550,[37,34,22,7]],
 ["Lost Archive","📖",1740,[34,33,25,8]],["Deep Ocean Vault","🐚",1930,[32,32,26,10]],
 ["Solar Dominion","🌞",2160,[29,32,27,12]],["Astral Cathedral","⛪",2390,[26,30,29,15]],
 ["Mechanical Eden","🦾",2650,[24,29,30,17]],["Twilight Throne","🪑",2890,[21,29,31,19]],
 ["Dream Dimension","💭",3150,[19,27,32,22]],["Eclipse Protocol","🌒",3490,[17,25,33,25]],
 ["Ancient Relics","🏺",410,[60,32,7,1]],["Lucky Circuit","🎰",750,[75,12,10,3]],
 ["Void Emperor","🕳️",3750,[14,23,33,30]],["Last Universe","🌌",4400,[12,20,33,35]]
];
DEMO_CASES.push(...EXPANSION_CASES.map(([name,emoji,price,odds],i)=>({id:"case"+(76+i),name,emoji,price,tier:0,odds,special:true,minValue:12,maxValue:3900})));
const DEMO_EMOJI=["🌙","☄️","🦊","🦋","🪐","🐉","🦄","🌸","🌊","⚡","💎","🔮","🧿","🦉","🐺","🦁","🌌","🔥","🍀","🌈","🦅","🐈","🪷","🧊","🌠","🎭","🪼","🦈","🌻","🎐","🧬","🛰️"];
const DEMO_NAMES=["Moonlight","Comet","Fox Spirit","Nebula Wing","Saturn","Ancient Dragon","Unicorn","Sakura","Tidal","Thunder","Crystal","Oracle","Eye of Cosmos","Night Owl","Silver Wolf","Solar Lion","Galaxy","Phoenix","Lucky Clover","Prism","Sky Hunter","Starlit Cat","Lotus","Glacier","Starfall","Phantom","Deep Sea","Ocean King","Sunflower","Wind Chime","Genesis","Voyager"];
const DEMO_RARITIES=["common","rare","epic","legendary"],DEMO_VALUES={common:25,rare:90,epic:350,legendary:1300};
const DEMO_CARDS=DEMO_EMOJI.map((emoji,i)=>({id:"card"+i,emoji,name:DEMO_NAMES[i],rarity:DEMO_RARITIES[i%4],value:DEMO_VALUES[DEMO_RARITIES[i%4]]}));
const EXTRA_CARDS=[
["Solar Flare","🌞"],["Red Panda","🐼"],["Storm Rider","🌪️"],["Magic Scroll","📜"],["Starlight","⭐"],["Cyber Core","🦾"],["Royal Crown","👑"],["Cosmic Egg","🥚"],
["Ancient Key","🗝️"],["Snow Spirit","☃️"],["Night Raven","🐦‍⬛"],["Meteorite","☄️"],["Sea Pearl","🦪"],["Neon Blade","🗡️"],["Arcade Ghost","👻"],["Golden Mask","🎭"],
["Mystic Lantern","🏮"],["Crystal Ball","🔮"],["Forest Guardian","🌳"],["Sky Castle","🏰"],["Phoenix Feather","🪶"],["Black Hole","🕳️"],["Pixel Heart","💟"],["Thunder Cloud","⛈️"],
["Magic Compass","🧭"],["Deep Coral","🪸"],["Moon Rabbit","🐇"],["Royal Gem","💍"],["Sunset","🌅"],["Galaxy Fox","🦊"],["Dragon Fire","🐲"],["Infinity Star","✨"]
];
EXTRA_CARDS.push(...[["Frost Wolf","🐺"],["Sun Compass","🧭"],["Ancient Rune","🪬"],["Glowing Mushroom","🍄"],["Obsidian Golem","🗿"],["Electric Fox","🦊"],["Cloud Serpent","🐍"],["Ruby Shard","♦️"],["Silver Crown","👑"],["Ocean Compass","🧭"],["Star Clock","🕰️"],["Golden Leaf","🍁"],["Shadow Owl","🦉"],["Arcane Orb","🔮"],["Neon Butterfly","🦋"],["Comet Trail","☄️"],["Forest Spirit","🌲"],["Pixel Crown","👑"],["Night Bloom","🌹"],["Moon Crystal","💠"],["Dragon Scale","🐲"],["Void Lantern","🏮"],["Sun Totem","🗿"],["Glacier Heart","🩵"],["Astral Fox","🦊"],["Royal Falcon","🦅"],["Time Relic","⏳"],["Storm Pearl","🦪"],["Nova Ring","💍"],["Dream Feather","🪶"],["Eclipse Mask","🎭"],["Infinity Core","♾️"]]);
DEMO_CARDS.push(...EXTRA_CARDS.map(([name,emoji],i)=>({id:"card"+(32+i),name,emoji,rarity:DEMO_RARITIES[i%4],value:DEMO_VALUES[DEMO_RARITIES[i%4]]})));
const MORE_CARDS=[["Amber Moth","🦋"],["Quantum Seed","🌱"],["Pearl Dragon","🐲"],["Iron Meteor","☄️"],["Velvet Rose","🌹"],["Frost Crown","👑"],["Coral Fox","🦊"],["Copper Golem","🗿"],["Sapphire Tide","🌊"],["Silent Bell","🔔"],["Solar Kite","🪁"],["Crimson Raven","🐦‍⬛"],["Arctic Rune","❄️"],["Phantom Key","🗝️"],["Neon Tiger","🐯"],["Jade Lantern","🏮"],["Twilight Deer","🦌"],["Royal Meteor","🌠"],["Circuit Dragon","🐉"],["Crystal Bloom","🌷"],["Stellar Whale","🐋"],["Pixel Knight","🛡️"],["Lunar Falcon","🦅"],["Obsidian Crown","👑"],["Storm Lotus","🪷"],["Gold Comet","☄️"],["Nebula Eye","👁️"],["Forest Crown","🍀"],["Ruby Moon","🌙"],["Solar Golem","🗿"],["Echo Shell","🐚"],["Mystic Map","🗺️"],["Azure Flame","🔥"],["Clockwork Owl","🦉"],["Silver Lotus","🪷"],["Ember Wolf","🐺"],["Prism Dragon","🐲"],["Ghost Lantern","🏮"],["Jungle Orb","🔮"],["Diamond Compass","🧭"],["Frozen Fox","🦊"],["Ancient Crown","👑"],["Moonlit Pearl","🦪"],["Sky Serpent","🐍"],["Copper Star","⭐"],["Shadow Relic","🪬"],["Golden Butterfly","🦋"],["Nova Feather","🪶"],["Sunken Mask","🎭"],["Aurora Shard","💎"],["Astral Ring","💍"],["Pixel Phoenix","🐦"],["Ocean Crown","👑"],["Void Crystal","🔷"],["Dragon Pearl","🐉"],["Night Compass","🧭"],["Crystal Falcon","🦅"],["Cosmic Rose","🌹"],["Solar Pearl","🦪"],["Dream Totem","🗿"],["Storm Crystal","💠"],["Golden Raven","🐦‍⬛"],["Eternal Rune","🪬"],["Final Star","🌟"]];
DEMO_CARDS.push(...MORE_CARDS.map(([name,emoji],i)=>({id:"card"+(96+i),name,emoji,rarity:DEMO_RARITIES[i%4],value:0})));
// Each card has an individual value within its rarity, not a fixed tier price.
const VALUE_BANDS={common:[12,75],rare:[85,260],epic:[290,990],legendary:[1050,3900]};
for(let i=0;i<DEMO_CARDS.length;i++){const c=DEMO_CARDS[i],band=VALUE_BANDS[c.rarity],range=band[1]-band[0]+1;c.value=band[0]+((i*97+i*i*13+41)%range)}
// Expansion pack: 64 collectible cards; stable IDs preserve existing inventories.
const EXPANSION_CARDS=[
 ["Moonlit Tram","🚋"],["Copper Sparrow","🐦"],["Ivy Automaton","🤖"],["Desert Glass","🏜️"],
 ["Coral Crown","🪸"],["Circuit Orchid","🌺"],["Storm Telescope","🔭"],["Frozen Anchor","⚓"],
 ["Jade Chameleon","🦎"],["Carnival Phantom","🎭"],["Neon Scorpion","🦂"],["Crimson Fortress","🏰"],
 ["Forgotten Manuscript","📜"],["Abyssal Compass","🧭"],["Solar Monarch","👑"],["Astral Cathedral","⛪"],
 ["Mechanical Lotus","🪷"],["Twilight Scepter","🪄"],["Dream Architect","🧑‍🚀"],["Eclipse Engine","⚙️"],
 ["Ancient Amphora","🏺"],["Lucky Capacitor","🔋"],["Void Emperor","🌑"],["Universe Seed","🌱"],
 ["Railway Ghost","👻"],["Emerald Beetle","🪲"],["Amber Circuit","💡"],["Mirage Falcon","🦅"],
 ["Tidal Lantern","🏮"],["Quantum Orchid","🌷"],["Thunder Relic","⚡"],["Icebound Leviathan","🐋"],
 ["Jungle Monolith","🗿"],["Masquerade Moon","🌙"],["Cyber Hydra","🐉"],["Scarlet Obelisk","🔺"],
 ["Arcane Codex","📕"],["Oceanic Trident","🔱"],["Helios Crown","☀️"],["Celestial Harp","🎼"],
 ["Clockwork Stag","🦌"],["Dusk Phoenix","🔥"],["Lucid Portal","🚪"],["Black Star Reactor","🌟"],
 ["Sandstorm Rose","🌹"],["Fortune Dice","🎲"],["Null Serpent","🐍"],["Infinite Horizon","🌄"],
 ["Subway Signal","🚦"],["Glass Firefly","✨"],["Copper Gear","⚙️"],["Dune Wanderer","🐪"],
 ["Pearl Seahorse","🐠"],["Digital Lotus","💠"],["Lightning Fox","🦊"],["Polar Guardian","🐻‍❄️"],
 ["Jade Panther","🐆"],["Spectral Carousel","🎠"],["Neon Samurai","🥷"],["Ruby Sentinel","🛡️"],
 ["Eternal Chronicle","📚"],["Abyssal Kraken","🐙"],["Sunforge Dragon","🐲"],["Cosmic Sovereign","🪐"]
];
DEMO_CARDS.push(...EXPANSION_CARDS.map(([name,emoji],i)=>({id:"card"+(160+i),name,emoji,rarity:DEMO_RARITIES[i%4],value:0})));
for(let i=160;i<DEMO_CARDS.length;i++){
 const card=DEMO_CARDS[i],band=VALUE_BANDS[card.rarity];
 card.value=band[0]+((i*131+i*i*17+79)%(band[1]-band[0]+1));
}
const DEMO_WEIGHTS=[[75,20,4.5,.5],[65,26,8,1],[53,32,13,2],[42,35,19,4]];
function caseOdds(c){return c.odds||DEMO_WEIGHTS[c.tier]}
function casePool(c,rarity){return DEMO_CARDS.filter(card=>card.rarity===rarity&&(!c.special||(card.value>=c.minValue&&card.value<=c.maxValue)))}
function caseAvailable(c){return DEMO_RARITIES.flatMap((rarity,i)=>caseOdds(c)[i]>0?casePool(c,rarity):[])}
function upgradeRewards(total){return DEMO_CARDS.filter(c=>c.value>total&&c.value<=total*4)}
function upgradeOdds(total,rewards){
 if(!rewards.length)return {chance:0,average:0};
 const weights=rewards.map(c=>1/Math.pow(c.value/total,1.7));
 const sum=weights.reduce((a,b)=>a+b,0);
 const average=rewards.reduce((n,c,i)=>n+c.value*weights[i],0)/sum;
 return {chance:Math.round(Math.min(65,Math.max(8,80*total/average))*100)/100,average};
}
const DEMO_QUESTS=[{id:"open3",name:"Открой 3 кейса",target:3,reward:180,field:"opens"},{id:"open10",name:"Открой 10 кейсов",target:10,reward:350,field:"opens"},{id:"collect5",name:"Собери 5 карточек",target:5,reward:250,field:"collected"},{id:"level5",name:"Набери 500 XP",target:500,reward:500,field:"xp"}];
const demoKey=()=> "vidnesd_demo_v1_"+current.uid;
const randomInt=n=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return Math.floor(a[0]/4294967296*n)};
function demoRead(){try{return JSON.parse(localStorage.getItem(demoKey()))}catch{return null}}
let leaderboardSync=Promise.resolve();
function syncLeaderboard(u){
 if(!db||!current||!verified())return;
 const uid=current.uid;
 const data={nick:String(u.nick||"Collector").slice(0,20),xp:Math.max(0,Math.floor(Number(u.xp)||0)),opens:Math.max(0,Math.floor(Number(u.opens)||0)),updatedAt:serverTimestamp()};
 leaderboardSync=leaderboardSync.catch(()=>{}).then(()=>setDoc(doc(db,"leaderboard",uid),data)).catch(e=>console.warn("Leaderboard sync:",e));
}
let cloudSync=Promise.resolve();
let cloudReady=false;
function cloudSnapshot(u){
 const {operations,...state}=u;
 return {...state,operations:{},uid:current.uid};
}
function demoWrite(u){
 localStorage.setItem(demoKey(),JSON.stringify(u));
 syncLeaderboard(u);
 if(!cloudReady||!db||!current||!verified())return;
 const uid=current.uid,snapshot=cloudSnapshot(u);
 cloudSync=cloudSync.catch(()=>{}).then(()=>setDoc(doc(db,"gameProfiles",uid),{state:snapshot,updatedAt:serverTimestamp()})).catch(e=>{console.warn("[VIDNESD] Cloud save failed",e);toast("Не удалось сохранить прогресс в облаке")});
}
async function restoreCloudProgress(){
 if(!db||!current||!verified())return;
 const uid=current.uid,remote=doc(db,"gameProfiles",uid),local=demoRead();
 try{
  const snapshot=await getDoc(remote);
  if(snapshot.exists()){
   const state=snapshot.data().state;
   if(state&&state.uid===uid&&state.inventory&&typeof state.balance==="number"){
    const merged={...state,operations:local?.operations||{}};
    localStorage.setItem(demoKey(),JSON.stringify(merged));
   }
  }else if(local){
   await setDoc(remote,{state:cloudSnapshot(local),updatedAt:serverTimestamp()});
  }
  cloudReady=true;
 }catch(e){cloudReady=false;console.warn("[VIDNESD] Cloud restore failed",e);toast("Облачный прогресс недоступен. Проверь Firestore Rules")}
}
async function call(name,data={}){
 if(!verified())throw Error("Подтверди электронную почту");
 let u=demoRead();
 if(!u){u={uid:current.uid,nick:(current.email||"Collector").split("@")[0].slice(0,20),balance:1000,xp:0,opens:0,collected:0,inventory:{},claimed:{},lastDaily:"",createdAt:Date.now(),operations:{}};demoWrite(u)}
 if(name==="bootstrap")return {user:u,cases:DEMO_CASES,cards:[...DEMO_CARDS,...(u.customCards||[])],quests:DEMO_QUESTS,weights:DEMO_WEIGHTS};
 if(name==="leaderboard")return {leaders:[],demo:true};
 if(name==="saveShowcase"){const ids=Array.isArray(data.ids)?data.ids:[];if(ids.length>5||new Set(ids).size!==ids.length||ids.some(id=>!u.inventory[id]))throw Error("Можно выставить до 5 принадлежащих тебе карточек");u.showcase=ids;demoWrite(u);return {showcase:ids}}
 if(name==="craftCard"){
  if(u.pendingCraft)throw Error("Сначала заверши предыдущий крафт");
  const ids=Array.isArray(data.sourceIds)?data.sourceIds:[];
  if(ids.length!==3||new Set(ids).size!==3)throw Error("Нужны 3 разные карточки");
  const materials=ids.map(id=>[...DEMO_CARDS,...(u.customCards||[])].find(c=>c.id===id));
  if(materials.some(c=>!c||!u.inventory[c.id]))throw Error("Карточка отсутствует");
  const rarity=materials[0].rarity;
  if(!materials.every(c=>c.rarity===rarity))throw Error("Все материалы должны быть одной редкости");
  const tier=DEMO_RARITIES.indexOf(rarity),value=materials.reduce((n,c)=>n+c.value,0);
  const luck=Math.max(5,Math.min(85,Math.round(18+value/(value+350)*55+tier*4)));
  const pool=DEMO_CARDS.filter(c=>DEMO_RARITIES.indexOf(c.rarity)>=Math.max(0,tier-2)&&DEMO_RARITIES.indexOf(c.rarity)<=Math.min(3,tier+1));
  const legendary=rarity==="legendary";
  const won=legendary?{id:"unique_"+crypto.randomUUID(),name:"Уникальный артефакт #"+String(Date.now()).slice(-7),emoji:"🌟",rarity:"legendary",value:Math.round(value*1.2),unique:true,creator:current.uid}:pool[randomInt(pool.length)];
  for(const id of ids){u.inventory[id]--;if(!u.inventory[id])delete u.inventory[id]}
  u.pendingCraft={cardId:won.id,uniqueCard:legendary?won:null,luck,clicks:0,broken:false,materials:ids};
  u.collected=Object.keys(u.inventory).length;u.showcase=(u.showcase||[]).filter(id=>u.inventory[id]);demoWrite(u);
  return {pendingCraft:u.pendingCraft,inventory:u.inventory,collected:u.collected,showcase:u.showcase};
 }
 if(name==="craftTap"){
  const p=u.pendingCraft;if(!p)throw Error("Нет активного крафта");
  if(p.clicks>=3)throw Error("Крафт уже завершён");
  const click=p.clicks+1;
  const risk=Math.max(3,Math.min(95,Math.round((100-p.luck)*[.16,.38,.65][click-1])));
  const broken=randomInt(100)<risk;
  p.clicks=click;p.broken=broken;
  let card=null,finished=broken||click===3;
  if(finished){
   if(!broken){card=p.uniqueCard||DEMO_CARDS.find(c=>c.id===p.cardId);if(p.uniqueCard)u.customCards=[...(u.customCards||[]),card];u.inventory[card.id]=(u.inventory[card.id]||0)+1}
   u.pendingCraft=null;
  }
  u.collected=Object.keys(u.inventory).length;demoWrite(u);
  return {click,risk,broken,finished,card,pendingCraft:u.pendingCraft,inventory:u.inventory,collected:u.collected};
 }
 if(name==="createCustomCard"){
  const name=String(data.name||"").trim(),emoji=String(data.emoji||"💠").trim(),price=2500;
  if(name.length<3||name.length>28||emoji.length>8||/[<>]/.test(name+emoji))throw Error("Название 3–28 символов, значок до 8 символов");
  if(u.balance<price)throw Error("Нужно 2 500 VC для создания");
  if((u.customCards||[]).length>=20)throw Error("Лимит 20 авторских карточек");
  const card={id:"custom_"+crypto.randomUUID(),name,emoji,rarity:"rare",value:500,creator:current.uid,custom:true};
  u.balance-=price;u.customCards=[...(u.customCards||[]),card];u.inventory[card.id]=1;u.collected=Object.keys(u.inventory).length;demoWrite(u);
  return {card,balance:u.balance,inventory:u.inventory,collected:u.collected};
 }
 if(name==="freeVC"){const owner=current.uid==="3gXPMPACBeftCtoSGqC6mL5T2iw2",reward=owner?10000:3000,wait=20*60*1000,now=Date.now();if(!owner&&now-(u.lastFreeVC||0)<wait)throw Error("Следующий бонус через "+Math.ceil((wait-(now-u.lastFreeVC))/60000)+" мин");u.balance+=reward;if(!owner)u.lastFreeVC=now;demoWrite(u);return {balance:u.balance,reward,nextAt:owner?0:now+wait}};
 if(name==="claimDaily"){const day=new Date().toISOString().slice(0,10);if(u.lastDaily===day)throw Error("Сегодня награда уже получена");u.balance+=150;u.lastDaily=day;demoWrite(u);return {balance:u.balance,lastDaily:day,reward:150}}
 if(name==="claimQuest"){const q=DEMO_QUESTS.find(x=>x.id===data.questId);if(!q)throw Error("Задание не найдено");if(u.claimed[q.id])throw Error("Награда уже получена");if(u[q.field]<q.target)throw Error("Задание ещё не выполнено");u.claimed[q.id]=true;u.balance+=q.reward;demoWrite(u);return {balance:u.balance,claimed:u.claimed,reward:q.reward}}
 if(name==="sellCard"){const card=[...DEMO_CARDS,...(u.customCards||[])].find(x=>x.id===data.cardId);if(!card||!u.inventory[card.id])throw Error("Карточка отсутствует");u.inventory[card.id]--;if(!u.inventory[card.id])delete u.inventory[card.id];u.balance+=card.value;u.collected=Object.keys(u.inventory).length;u.showcase=(u.showcase||[]).filter(id=>u.inventory[id]);demoWrite(u);return {inventory:u.inventory,balance:u.balance,collected:u.collected,showcase:u.showcase}}
 if(name==="upgradeCard"){
  const selected=Array.isArray(data.sourceIds)?data.sourceIds:[];
  if(!selected.length||selected.length>5)throw Error("Выбери от 1 до 5 карточек");
  const counts={};for(const id of selected)counts[id]=(counts[id]||0)+1;
  let total=0;
  for(const [id,count] of Object.entries(counts)){
   const card=[...DEMO_CARDS,...(u.customCards||[])].find(x=>x.id===id);
   if(!card||Number(u.inventory[id]||0)<count)throw Error("Недостаточно карточек");
   total+=card.value*count;
  }
  const rewards=upgradeRewards(total);
  if(!rewards.length)throw Error("Нет предметов дороже выбранных материалов. Уменьши сумму.");
  const {chance}=upgradeOdds(total,rewards),roll=randomInt(1000000)/10000,success=roll<chance;
  let card=null;
  if(success){
   const weights=rewards.map(c=>1/Math.pow(c.value/total,1.7));
   let n=randomInt(1000000)/1000000*weights.reduce((a,b)=>a+b,0);
   card=rewards[rewards.length-1];
   for(let i=0;i<rewards.length;i++){n-=weights[i];if(n<0){card=rewards[i];break}}
  }
  for(const [id,count] of Object.entries(counts)){u.inventory[id]-=count;if(!u.inventory[id])delete u.inventory[id]}
  if(card)u.inventory[card.id]=(u.inventory[card.id]||0)+1;
  u.collected=Object.keys(u.inventory).length;u.showcase=(u.showcase||[]).filter(id=>u.inventory[id]);demoWrite(u);
  return {inventory:u.inventory,collected:u.collected,showcase:u.showcase,card,chance,roll,success,total};
 }
 if(name==="openCase"){
  const cs=DEMO_CASES.find(x=>x.id===data.caseId);if(!cs)throw Error("Кейс не найден");
  if(u.operations[data.operationId])return u.operations[data.operationId];
  if(u.balance<cs.price)throw Error("Недостаточно VC");
  const roll=randomInt(1000000)/10000,w=caseOdds(cs);let rarity=0,total=0;
  for(let i=0;i<w.length;i++){total+=w[i];if(roll<total){rarity=i;break}}
  const pool=casePool(cs,DEMO_RARITIES[rarity]);if(!pool.length)throw Error("Для этой редкости нет карточек");const card=pool[randomInt(pool.length)];
  u.balance-=cs.price;u.xp+=20;u.opens++;u.inventory[card.id]=(u.inventory[card.id]||0)+1;u.collected=Object.keys(u.inventory).length;
  const result={card,caseId:cs.id,balance:u.balance,xp:u.xp,opens:u.opens,inventory:u.inventory};
  u.operations[data.operationId]=result;
  if(Object.keys(u.operations).length>100)u.operations=Object.fromEntries(Object.entries(u.operations).slice(-100));
  demoWrite(u);return result
 }
 throw Error("Неизвестная операция")
}
const lock=async fn=>{if(busy)return;busy=true;document.body.classList.add("loading");try{await fn()}catch(e){err(e)}finally{busy=false;document.body.classList.remove("loading")}};
const verified=()=>current?.emailVerified===true;
async function refreshVerification(u){
 try{await reload(u);await u.getIdToken(true);return u.emailVerified===true}
 catch(e){console.warn("[VIDNESD] Email verification refresh failed",e);return false}
}
function show(html){body.innerHTML=html;modal.classList.remove("hidden")}
function close(){modal.classList.add("hidden");body.innerHTML=""}
$("#authBtn").onclick=()=>{if(current){if(!auth)return toast("Авторизация ещё загружается");lock(async()=>{await signOut(auth);current=null;user=null;page="home";close();render();toast("Вы вышли из аккаунта")})}else if(auth)authModal();else toast("Подключение к Firebase ещё не завершено")};
$("#closeModal").onclick=close;modal.addEventListener("click",e=>{if(e.target===modal)close()});
const cardView=(c,count=0)=>'<div class="tile rarity-'+c.rarity+'"><div class="cardart"><span>'+c.emoji+'</span></div><div class="tag">'+c.rarity+'</div><b>'+escape(c.name)+'</b><p>'+fmt(c.value)+' VC'+(count?' · ×'+count:'')+'</p>'+(count?'<button class="secondary sell" data-id="'+c.id+'">Продать одну</button>':'')+'</div>';
function caseView(c){return '<div class="case"><div class="case-art">'+c.emoji+'</div><div class="tag">'+(c.special?"Особый кейс":"Коллекция "+(c.tier+1))+'</div><h3>'+escape(c.name)+'</h3><div class="price">✦ '+fmt(c.price)+' VC</div><button class="primary open" data-id="'+c.id+'">Открыть кейс</button></div>'}
function stats(){return '<div class="stats"><div class="stat"><span class="muted">Баланс</span><b>'+fmt(user?.balance)+' VC</b></div><div class="stat"><span class="muted">Открытий</span><b>'+fmt(user?.opens)+'</b></div><div class="stat"><span class="muted">Опыт</span><b>'+fmt(user?.xp)+' XP</b></div></div>'}
function render(){document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===page));$("#balance").textContent=fmt(user?.balance);$("#authBtn").textContent=current?"Выйти":"Войти";
if(!user){app.innerHTML='<section class="hero"><div><div class="eyebrow">COLLECT · DISCOVER · LEVEL UP</div><h1>Твоя вселенная карточек</h1><p>Собирай уникальные коллекции, открывай бесплатные игровые кейсы, выполняй задания и поднимайся в рейтинге.</p><div class="actions"><button class="primary" id="join">Начать путешествие</button></div></div><div class="hero-art">💠</div></section><h2>Коллекционный мир</h2><div class="grid">'+["🌙","🐉","💎","🪐"].map((e,i)=>cardView({emoji:e,name:["Moonlight","Dragon","Crystal","Saturn"][i],rarity:["common","rare","epic","legendary"][i],value:0}).replace("0 VC","Коллекционная карточка")).join("")+'</div>';$("#join").onclick=()=>current?verifyModal():authModal();return}
if(page==="home"){app.innerHTML='<section class="hero"><div><div class="eyebrow">WELCOME TO VIDNESD</div><h1>Открой свой Cardverse</h1><p>Собирай карточки, повышай уровень и открывай новые коллекции. Все награды исключительно игровые.</p><div class="actions"><button class="primary go" data-go="cases">Открыть кейсы</button><button class="secondary daily">Ежедневный бонус +150 VC</button><button class="secondary free-vc">'+(current.uid==="3gXPMPACBeftCtoSGqC6mL5T2iw2"?"Получить +10 000 VC · Владелец":Date.now()-(user.lastFreeVC||0)<1200000?"Бонус через "+Math.ceil((1200000-(Date.now()-user.lastFreeVC))/60000)+" мин":"Получить +3 000 VC · каждые 20 мин")+'</button></div></div><div class="hero-art">🪐</div></section>'+stats()+'<h2>Популярные кейсы</h2><div class="grid">'+cases.slice(0,8).map(caseView).join("")+'</div>'}
if(page==="cases")app.innerHTML='<div class="section-head"><div><div class="eyebrow">CARD PACKS</div><h1>Все кейсы</h1><p>76 тематических наборов. Шансы редкости показаны перед открытием.</p></div></div><div class="grid">'+cases.map(caseView).join("")+'</div>';
if(page==="inventory"){const owned=cards.filter(c=>user.inventory?.[c.id]>0);app.innerHTML='<div class="eyebrow">MY COLLECTION</div><h1>Инвентарь</h1><p>Собрано '+owned.length+' из '+cards.length+' видов карточек</p>'+(owned.length?'<div class="grid">'+owned.map(c=>cardView(c,user.inventory[c.id])).join("")+'</div>':'<div class="empty">Пока пусто. Открой первый кейс, чтобы получить карточку.</div>')}
if(page==="trades"){renderTrades();return}
if(page==="workshop"){renderWorkshop();return}
if(page==="craft"){renderCraft();return}
if(page==="upgrade"){renderUpgrade();return}
if(page==="quests"){app.innerHTML='<div class="eyebrow">REWARDS</div><h1>Задания</h1><p>Получай бесплатные VC за достижения и активность.</p>'+quests.map(q=>{const val=user[q.field]||0,done=user.claimed?.[q.id];return '<div class="quest"><div><strong>'+escape(q.name)+'</strong><span class="muted">'+Math.min(val,q.target)+' / '+q.target+' · +'+q.reward+' VC</span></div><button class="'+(done?'secondary':'primary')+' claim" data-id="'+q.id+'" '+(done||val<q.target?'disabled':'')+'>'+(done?'Получено':val>=q.target?'Забрать':'В процессе')+'</button></div>'}).join("")}
if(page==="profile"){app.innerHTML='<div class="eyebrow">PLAYER PROFILE</div><h1>◈ '+escape(user.nick)+'</h1><p>Здесь можно изменить ник. Он будет обновлён в поиске игроков и лидерборде.</p><p>Подтверждённая почта: '+escape(current.email)+'</p><form id="nickForm" class="form"><label>Твой уникальный ник (3–20 символов, латиница, цифры, _)<input name="nick" required minlength="3" maxlength="20" value="'+escape(user.nick||'')+'"></label><button class="primary" type="submit">Сохранить ник</button></form>'+stats()+'<h2>Достижения</h2><div class="grid">'+[{t:"Первый кейс",n:1},{t:"Коллекционер",n:10},{t:"Мастер кейсов",n:50},{t:"Легенда",n:100}].map(x=>'<div class="stat"><b>'+(user.opens>=x.n?'🏆':'🔒')+'</b>'+x.t+'<p>Открытий: '+x.n+'</p></div>').join("")+'</div>'}
if(page==="leaders"){app.innerHTML='<div class="eyebrow">TOP COLLECTORS</div><h1>Лидерборд VIDNESD</h1><p>Общий рейтинг по XP и открытиям. Данные синхронизируются с Firestore, но пока не защищены от накрутки.</p><div class="stats"><div class="stat"><span class="muted">Твой XP (локально)</span><b>'+fmt(user.xp)+'</b></div><div class="stat"><span class="muted">Твои открытия (локально)</span><b>'+fmt(user.opens)+'</b></div></div><div class="actions"><button class="secondary" id="sortXp">По XP</button><button class="secondary" id="sortOpens">По открытиям</button></div><div id="leaders">Загружаем рейтинг...</div>';$("#sortXp").onclick=()=>selectLeaderboardSort("xp");$("#sortOpens").onclick=()=>selectLeaderboardSort("opens");loadLeaders()}
bind();if(page==="profile"){$("#nickForm").onsubmit=e=>{e.preventDefault();lock(async()=>{await saveNickname(new FormData(e.target).get("nick"));toast("Ник сохранён");render()})};const showcase=$("#editShowcase");if(showcase)showcase.onclick=editShowcase}}
function bind(){document.querySelectorAll(".open").forEach(b=>b.onclick=()=>openCase(b.dataset.id));document.querySelectorAll(".sell").forEach(b=>b.onclick=()=>sell(b.dataset.id));document.querySelectorAll(".claim").forEach(b=>b.onclick=()=>claim(b.dataset.id));document.querySelectorAll(".daily").forEach(b=>b.onclick=daily);document.querySelectorAll(".free-vc").forEach(b=>b.onclick=freeVC);document.querySelectorAll(".go").forEach(b=>b.onclick=()=>{page=b.dataset.go;render()})}
document.querySelectorAll("#nav button").forEach(b=>b.onclick=()=>{page=b.dataset.page;render()});
async function handleAuthButton(){if(!auth){toast("Авторизация ещё загружается. Повтори попытку.");return}if(!current){authModal();return}await lock(async()=>{await signOut(auth);current=null;user=null;page="home";close();render();toast("Вы вышли из аккаунта")})}
$("#authBtn").onclick=handleAuthButton;

function editShowcase(){
 const owned=cards.filter(c=>user.inventory?.[c.id]);const chosen=new Set(user.showcase||[]);
 show('<h2>Витрина коллекции</h2><p>Выбери не больше 5 карточек. В текущей версии витрина хранится в этом браузере.</p><div class="showcase-picker">'+owned.map(c=>'<label><input type="checkbox" data-showcase="'+c.id+'" '+(chosen.has(c.id)?"checked":"")+'><span>'+c.emoji+' '+escape(c.name)+'</span></label>').join("")+'</div><button class="primary" id="saveShowcase">Сохранить</button>');
 $("#saveShowcase").onclick=()=>lock(async()=>{const ids=[...document.querySelectorAll("[data-showcase]:checked")].map(x=>x.dataset.showcase);const r=await call("saveShowcase",{ids});user.showcase=r.showcase;close();render();toast("Витрина сохранена")})
}
const validNick=n=>/^[a-zA-Z0-9_]{3,20}$/.test(n);
async function saveNickname(raw){
 const nick=String(raw||"").trim(),nickLower=nick.toLowerCase();
 if(!validNick(nick))throw Error("Ник: 3–20 символов, латинские буквы, цифры и _");
 if(!db)throw Error("Firestore не подключён");
 const profile=doc(db,"tradeProfiles",current.uid),reservation=doc(db,"nicknames",nickLower);
 await runTransaction(db,async tx=>{
  const [oldProfile,existing]=await Promise.all([tx.get(profile),tx.get(reservation)]);
  if(existing.exists()&&existing.data().uid!==current.uid)throw Error("Ник уже занят");
  const old=oldProfile.exists()?oldProfile.data().nickLower:null;
  let oldRef=null;
  if(old&&old!==nickLower){oldRef=doc(db,"nicknames",old);await tx.get(oldRef)}
  if(!existing.exists())tx.set(reservation,{uid:current.uid});
  if(oldRef)tx.delete(oldRef);
  tx.set(profile,{uid:current.uid,nick,nickLower,updatedAt:serverTimestamp()});
 });
 user.nick=nick;demoWrite(user);
 return nick;
}
async function publishTradeProfile(){return saveNickname(user.nick)}
function tradeCardPicker(title,field,items){
 return '<div class="trade-picker"><div class="trade-picker-title">'+title+'</div><div class="trade-picker-grid"><label class="trade-card-choice"><input type="radio" name="'+field+'" value="" checked><span class="trade-card-art">∅</span><strong>Без предмета</strong><small>Только VC</small></label>'+items.map(c=>'<label class="trade-card-choice rarity-'+c.rarity+'"><input type="radio" name="'+field+'" value="'+escape(c.id)+'"><span class="trade-card-art">'+c.emoji+'</span><strong>'+escape(c.name)+'</strong><small>'+fmt(c.value)+' VC · '+escape(c.rarity)+'</small></label>').join("")+'</div></div>';
}
async function renderTrades(){
 const owned=cards.filter(c=>user.inventory?.[c.id]>0);
 const options='<option value="">Без карточки</option>'+owned.map(c=>'<option value="'+escape(c.id)+'">'+escape(c.name)+' · '+fmt(c.value)+' VC</option>').join("");
 app.innerHTML='<div class="eyebrow">PLAYER EXCHANGE · FIRESTORE</div><h1>Обмены между игроками</h1><p>Найди игрока по нику, выбери предмет и валюту, которые отдаёшь и хочешь получить. Можно выбрать «ничего». Пока это только предложения: баланс и карточки автоматически не переводятся.</p><p>Твой ник: <b>@'+escape(user.nick)+'</b> · <button class="secondary" id="publishTrade">Обновить ник в поиске</button> · <button class="secondary" id="editTradeNick">Изменить ник</button></p><form class="form" id="tradeForm"><label>Поиск игрока по нику<input id="tradeSearch" placeholder="Начни вводить ник..." maxlength="20" required></label><button class="secondary" id="findTrader" type="button">Найти игрока</button><div id="foundTrader" class="muted">Выбери получателя</div><input id="tradeRecipient" type="hidden" required><h3>Ты отдаёшь</h3>'+tradeCardPicker("Твои предметы","offerCard",owned)+'<label>VC (0 = без валюты)<input name="offerVC" type="number" min="0" max="100000000" value="0" required></label><h3>Ты получаешь</h3>'+tradeCardPicker("Желаемый предмет","wantCard",DEMO_CARDS)+'<label>VC (0 = без валюты)<input name="wantVC" type="number" min="0" max="100000000" value="0" required></label><button class="primary" type="submit">Отправить предложение</button></form><div class="trade-head"><div><h2>Мои обмены</h2><p>Завершённые заявки свёрнуты в историю</p></div><div class="trade-filters"><button type="button" class="secondary active" id="tradeActive">Активные</button><button type="button" class="secondary" id="tradeHistory">История</button></div></div><div id="tradeList">Загрузка...</div>';
 $("#editTradeNick").onclick=()=>{page="profile";render()};
 $("#publishTrade").onclick=()=>lock(async()=>{await publishTradeProfile();toast("Твой ник теперь доступен для поиска")});
 let searchTimer=null,searchSerial=0;
 async function findTraders(){
  const term=$("#tradeSearch").value.trim().toLowerCase(),serial=++searchSerial;
  $("#tradeRecipient").value="";
  if(term.length<2){$("#foundTrader").textContent="Введи хотя бы 2 символа ника";return}
  $("#foundTrader").textContent="Поиск...";
  try{
   const result=await getDocs(query(collection(db,"tradeProfiles"),where("nickLower",">=",term),where("nickLower","<=",term+"\\uf8ff"),limit(12)));
   if(serial!==searchSerial||page!=="trades")return;
   const players=result.docs.filter(d=>d.id!==current.uid);
   $("#foundTrader").innerHTML=players.length?'<div class="player-results">'+players.map(d=>'<button type="button" class="player-result chooseTrader" data-uid="'+escape(d.id)+'"><span class="player-avatar">'+escape((d.data().nick||"?").slice(0,1).toUpperCase())+'</span><span class="player-info"><strong>@'+escape(d.data().nick)+'</strong><small>Игрок VIDNESD</small></span><span class="player-pick">Выбрать</span></button>').join("")+'</div>':'<div class="trade-empty">Игроки не найдены. Попробуй другую часть ника.</div>';
   document.querySelectorAll(".chooseTrader").forEach(b=>b.onclick=()=>{$("#tradeRecipient").value=b.dataset.uid;document.querySelectorAll(".chooseTrader").forEach(x=>x.classList.toggle("selected",x===b));$("#foundTrader").insertAdjacentHTML("beforeend",'<p class="player-selected">✓ Получатель выбран</p>')});
  }catch(e){if(serial===searchSerial)$("#foundTrader").textContent="Ошибка поиска: "+(e.code||e.message)}
 }
 $("#tradeSearch").addEventListener("input",()=>{clearTimeout(searchTimer);searchTimer=setTimeout(findTraders,280)});
 $("#findTrader").onclick=findTraders;
 $("#tradeForm").onsubmit=e=>{e.preventDefault();lock(async()=>{
  const data=new FormData(e.target),recipient=$("#tradeRecipient").value;
  if(!/^[A-Za-z0-9]{20,128}$/.test(recipient)||recipient===current.uid)throw Error("Сначала найди и выбери игрока");
  const offerCard=String(data.get("offerCard")||""),wantCard=String(data.get("wantCard")||"");
  const offerVC=Number(data.get("offerVC")),wantVC=Number(data.get("wantVC"));
  if(!Number.isSafeInteger(offerVC)||!Number.isSafeInteger(wantVC)||offerVC<0||wantVC<0||offerVC>100000000||wantVC>100000000)throw Error("Некорректная сумма VC");
  if(offerCard&&!user.inventory[offerCard])throw Error("У тебя нет этой карточки");
  if(offerVC>user.balance)throw Error("Недостаточно VC");
  if(!offerCard&&!wantCard&&!offerVC&&!wantVC)throw Error("Укажи хотя бы один предмет или VC");
  await addDoc(collection(db,"tradeRequests"),{sender:current.uid,recipient,offerCard,wantCard,offerVC,wantVC,status:"pending",createdAt:serverTimestamp()});
  toast("Предложение отправлено");renderTrades();
 })};
 try{
  if(!db)throw Error("Firestore не подключён");
  const [inbox,outbox]=await Promise.all([getDocs(query(collection(db,"tradeRequests"),where("recipient","==",current.uid),limit(50))),getDocs(query(collection(db,"tradeRequests"),where("sender","==",current.uid),limit(50)))]);
  if(page!=="trades")return;
  const all=[...inbox.docs,...outbox.docs].filter((d,i,a)=>a.findIndex(x=>x.id===d.id)===i).sort((a,b)=>(b.data().createdAt?.seconds||0)-(a.data().createdAt?.seconds||0));
  const cardLabel=id=>cards.find(c=>c.id===id)?.name||id||"ничего";
  const archiveKey="vidnesd_trade_hidden_"+current.uid;
  const archived=new Set(JSON.parse(localStorage.getItem(archiveKey)||"[]"));
  let tab="active",historyLimit=5;
  const active=all.filter(d=>d.data().status==="pending");
  const history=all.filter(d=>d.data().status!=="pending"&&!archived.has(d.id));
  const statusText={pending:"Ожидает ответа",accepted:"Принято · без передачи",declined:"Отклонено"};
  function drawTrades(){
   $("#tradeActive").classList.toggle("active",tab==="active");
   $("#tradeHistory").classList.toggle("active",tab==="history");
   $("#tradeActive").textContent="Активные · "+active.length;
   $("#tradeHistory").textContent="История · "+history.length;
   const list=tab==="active"?active:history.slice(0,historyLimit);
   $("#tradeList").innerHTML=list.length?'<div class="trade-list">'+list.map(d=>{
    const x=d.data(),incoming=x.recipient===current.uid;
    const offer=x.offerCard!==undefined?cardLabel(x.offerCard)+" + "+fmt(x.offerVC)+" VC":x.offer;
    const want=x.wantCard!==undefined?cardLabel(x.wantCard)+" + "+fmt(x.wantVC)+" VC":x.want;
    return '<article class="trade-entry"><div class="trade-entry-top"><span class="trade-direction">'+(incoming?"↙ Входящее":"↗ Исходящее")+'</span><span class="trade-status '+escape(x.status)+'">'+escape(statusText[x.status]||x.status)+'</span></div><div class="trade-summary"><span><small>Отдаёт</small><strong>'+escape(offer)+'</strong></span><span class="trade-swap">⇄</span><span><small>Получает</small><strong>'+escape(want)+'</strong></span></div><div class="trade-entry-bottom"><span>Игрок · '+escape((incoming?x.sender:x.recipient).slice(0,8))+'…</span><div class="trade-actions">'+(incoming&&x.status==="pending"?'<button class="secondary trade-answer" data-id="'+d.id+'" data-status="accepted">Принять</button><button class="secondary trade-answer" data-id="'+d.id+'" data-status="declined">Отклонить</button>':'')+(x.status!=="pending"?'<button class="trade-archive" data-id="'+d.id+'" title="Скрыть из истории">Скрыть</button>':'')+'</div></div></article>'
   }).join("")+'</div>':'<div class="trade-empty">'+(tab==="active"?"Активных предложений нет":"История пуста")+'</div>';
   if(tab==="history"&&history.length>historyLimit)$("#tradeList").insertAdjacentHTML("beforeend",'<button class="secondary trade-more" id="tradeMore">Показать ещё ('+(history.length-historyLimit)+')</button>');
   document.querySelectorAll(".trade-answer").forEach(btn=>btn.onclick=()=>lock(async()=>{await updateDoc(doc(db,"tradeRequests",btn.dataset.id),{status:btn.dataset.status});toast("Статус обновлён. Передачи активов нет.");renderTrades()}));
   document.querySelectorAll(".trade-archive").forEach(btn=>btn.onclick=()=>{archived.add(btn.dataset.id);localStorage.setItem(archiveKey,JSON.stringify([...archived]));const i=history.findIndex(d=>d.id===btn.dataset.id);if(i>=0)history.splice(i,1);drawTrades()});
   const more=$("#tradeMore");if(more)more.onclick=()=>{historyLimit+=5;drawTrades()};
  }
  $("#tradeActive").onclick=()=>{tab="active";drawTrades()};
  $("#tradeHistory").onclick=()=>{tab="history";drawTrades()};
  drawTrades();
 }catch(e){if(page==="trades")$("#tradeList").textContent="Не удалось загрузить заявки: "+e.message}
}
function renderWorkshop(){app.innerHTML='<div class="eyebrow">UNIQUE FORGE</div><h1>Мастерская уникальных предметов</h1><p>Уникальные карточки создаются только при успешном крафте трёх легендарных предметов. Цена результата = сумма материалов × 1,2. Три нажатия и риск поломки сохраняются.</p><button class="primary" id="toCraft">Перейти к крафту</button><h2>Твои уникальные предметы</h2><div class="grid">'+(user.customCards||[]).filter(c=>c.unique).map(c=>cardView(c,user.inventory[c.id]||0)).join("")+'</div>';$("#toCraft").onclick=()=>{page="craft";render()};document.querySelectorAll(".sell").forEach(b=>b.onclick=()=>sell(b.dataset.id))}
function renderCraft(){
 const pending=user.pendingCraft;
 const owned=cards.filter(c=>(user.inventory?.[c.id]||0)>0);
 const selected=craftSelected;
 const chosen=selected.map(id=>cards.find(c=>c.id===id)).filter(Boolean);
 const tier=chosen[0]?.rarity;
 const valid=chosen.length===3&&chosen.every(c=>c.rarity===tier);
 const total=chosen.reduce((n,c)=>n+c.value,0);
 const luck=Math.max(5,Math.min(85,Math.round(18+total/(total+350)*55+DEMO_RARITIES.indexOf(tier)*4)));
 if(pending){
  const next=pending.clicks+1,risk=Math.max(3,Math.min(95,Math.round((100-pending.luck)*[.16,.38,.65][next-1])));
  app.innerHTML='<div class="eyebrow">CARD FORGE · REVEAL</div><h1>Испытание крафта</h1><p>Материалы уже потрачены. Нажми на предмет в центре три раза. На каждом шаге риск разрушения увеличивается.</p><div class="craft-reveal"><div class="craft-risk-head"><span>Испытание '+next+' / 3</span><strong>Риск поломки '+risk+'%</strong></div><div class="craft-risk-bar"><span style="width:'+risk+'%"></span></div><button class="craft-roulette-button" id="craftTap"><span class="craft-roulette" style="--chance:'+risk+'%"><span class="craft-roulette-pointer">▼</span><span class="craft-roulette-center">💠<small>'+risk+'% риск</small></span></span><strong>КРУТИТЬ · '+next+'/3</strong></button><p>Каждый следующий этап опаснее. Если предмет сломается, материалы будут потеряны.</p><div class="craft-tap-progress">'+[1,2,3].map(i=>'<span class="'+(i<=pending.clicks?'done':'')+'"></span>').join('')+'</div></div>';
  $("#craftTap").onclick=()=>lock(async()=>{
   $("#craftTap").disabled=true;
   const spinner=document.querySelector(".craft-roulette");if(spinner)spinner.classList.add("craft-roulette-spinning");await sleep(2400);
   const r=await call("craftTap");user.pendingCraft=r.pendingCraft;user.inventory=r.inventory;user.collected=r.collected;
   if(r.finished){if(r.card?.unique)cards.push(r.card);renderCraft();show('<div class="upgrade-success"><div class="upgrade-big">'+(r.broken?'💥':r.card.emoji)+'</div><h2>'+(r.broken?'Крафт разрушен':'Крафт завершён!')+'</h2><p>'+(r.broken?'Материалы потеряны.':escape(r.card.name)+' · '+fmt(r.card.value)+' VC')+'</p><button class="primary" id="craftClose">Продолжить</button></div>');$("#craftClose").onclick=close;if(!r.broken)confetti()}
   else {renderCraft();toast("Этап "+r.click+"/3 пройден. Риск увеличивается")}
  });return;
 }
 app.innerHTML='<div class="eyebrow">CARD FORGE · LUCK</div><h1>Крафт карточек</h1><p>Выбери 3 разные карточки одной редкости. Три легендарные создают уникальный предмет за 120% стоимости материалов при успешном крафте. Остальные дают случайный результат, иногда дешевле материалов. После запуска нажми на центральный предмет 3 раза: риск разрушения растёт с каждым нажатием.</p><div class="upgrade-layout"><div class="upgrade-panel"><h3>Материалы · '+selected.length+'/3</h3><div class="upgrade-slots">'+Array.from({length:3},(_,i)=>{const c=cards.find(x=>x.id===selected[i]);return '<button class="upgrade-slot" data-craft-remove="'+i+'">'+(c?'<span>'+c.emoji+'</span><small>'+escape(c.name)+'</small>':'<span>＋</span><small>Слот '+(i+1)+'</small>')+'</button>'}).join('')+'</div><p>Стоимость: <b>'+fmt(total)+' VC</b></p></div><div class="upgrade-center"><div class="upgrade-ring" style="--progress:'+luck+'%"><div><strong>'+(valid?luck+'%':'—')+'</strong><small>Удача</small></div></div><p>'+(valid?'Возможны потери и случайная награда':'Выбери три карточки одинаковой редкости')+'</p><button class="primary" id="craftNow" '+(!valid?'disabled':'')+'>✦ Начать крафт</button></div><div class="upgrade-panel"><h3>Случайный результат</h3><div class="upgrade-target"><div class="upgrade-big">❔</div><b>Неизвестная карточка</b><span class="tag">RANDOM DROP</span><strong>Не гарантирован</strong></div></div></div><h2>Твой инвентарь</h2><p>Доступные карточки подсвечиваются. Нажми, чтобы выбрать материал.</p><div class="upgrade-inventory">'+(owned.length?owned.map(c=>{const allowed=!tier||c.rarity===tier;const chosen=selected.includes(c.id);return '<button class="upgrade-inv-card '+(chosen?'craft-picked ':allowed?'craft-allowed ':'craft-locked ')+'" data-craft-add="'+c.id+'" '+(!allowed||chosen||selected.length>=3?'disabled':'')+'><span>'+c.emoji+'</span><b>'+escape(c.name)+'</b><small>'+fmt(c.value)+' VC · ×'+user.inventory[c.id]+'</small></button>'}).join(''):'<div class="empty">Для крафта сначала собери 3 карточки.</div>')+'</div>';
 document.querySelectorAll("[data-craft-add]").forEach(b=>b.onclick=()=>{craftSelected.push(b.dataset.craftAdd);renderCraft()});
 document.querySelectorAll("[data-craft-remove]").forEach(b=>b.onclick=()=>{const i=Number(b.dataset.craftRemove);if(i<craftSelected.length){craftSelected.splice(i,1);renderCraft()}});
 $("#craftNow").onclick=()=>{if(!valid)return;show('<h2>Запустить крафт?</h2><p>Три карточки будут потрачены сразу. Итог случайный, возможна поломка.</p><button class="primary" id="confirmCraft">Начать испытание</button>');$("#confirmCraft").onclick=()=>lock(async()=>{const r=await call("craftCard",{sourceIds:[...craftSelected]});user.pendingCraft=r.pendingCraft;user.inventory=r.inventory;user.collected=r.collected;user.showcase=r.showcase;craftSelected=[];close();renderCraft()})};
}
function authModal(mode="login"){show('<h2>'+(mode==="register"?"Создать аккаунт":mode==="reset"?"Восстановить пароль":"Войти в VIDNESD")+'</h2><form class="form" id="authForm"><label>Электронная почта<input type="email" name="email" required autocomplete="email" placeholder="you@example.com"></label>'+(mode==="reset"?'':'<label>Пароль (не менее 6 символов)<input type="password" name="password" minlength="6" required autocomplete="'+(mode==="register"?"new-password":"current-password")+'"></label>')+'<button class="primary" type="submit">'+(mode==="register"?"Зарегистрироваться":mode==="reset"?"Отправить письмо":"Войти")+'</button><button type="button" class="link" id="switch">'+(mode==="register"?"Уже есть аккаунт? Войти":"Создать аккаунт")+'</button><button type="button" class="link" id="reset">Забыли пароль?</button></form>');$("#switch").onclick=()=>authModal(mode==="register"?"login":"register");$("#reset").onclick=()=>authModal("reset");$("#authForm").onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target);lock(async()=>{const email=fd.get("email"),password=fd.get("password");if(mode==="reset"){await sendPasswordResetEmail(auth,email);toast("Письмо отправлено");close();return}if(mode==="register"){const cred=await createUserWithEmailAndPassword(auth,email,password);await sendEmailVerification(cred.user);toast("Проверь почту и подтверди адрес");verifyModal();return}await signInWithEmailAndPassword(auth,email,password);close()})}}
function verifyModal(){show('<h2>✉️ Подтверди почту</h2><p>Мы отправили письмо на '+escape(current?.email||"твою почту")+'. Открой ссылку в письме, затем нажми кнопку ниже.</p><div class="actions"><button class="primary" id="check">Проверить подтверждение</button><button class="secondary" id="resend">Отправить повторно</button><button class="secondary" id="verifyLogout">Выйти из аккаунта</button></div>');$("#check").onclick=()=>lock(async()=>{if(!await refreshVerification(current))throw Error("Не удалось обновить статус почты. Выйди и войди снова после подтверждения адреса.");try{await bootstrap()}catch(e){throw Error("Загрузка профиля: "+(e.code||e.message||e))}close()});$("#resend").onclick=()=>lock(async()=>{await sendEmailVerification(current);toast("Письмо отправлено")});$("#verifyLogout").onclick=()=>$("#authBtn").click()}
async function bootstrap(){cloudReady=false;await restoreCloudProgress();const data=await call("bootstrap");user=data.user;cases=data.cases;cards=data.cards;quests=data.quests;weights=data.weights;syncLeaderboard(user);try{const p=await getDoc(doc(db,"tradeProfiles",current.uid));if(p.exists()){user.nick=p.data().nick;demoWrite(user)}else{page="profile";toast("Укажи уникальный ник в профиле для поиска и обменов")}}catch(e){console.warn("Nickname profile unavailable",e)}render()}
async function freeVC(){await lock(async()=>{const r=await call("freeVC");user.balance=r.balance;if(r.nextAt)user.lastFreeVC=r.nextAt-20*60*1000;render();toast("Получено +"+fmt(r.reward)+" VC!")})}
async function daily(){await lock(async()=>{const r=await call("claimDaily");user.balance=r.balance;user.lastDaily=r.lastDaily;toast("Получено +150 VC");render();confetti()})}
async function claim(id){await lock(async()=>{const r=await call("claimQuest",{questId:id});user.balance=r.balance;user.claimed=r.claimed;toast("Награда +"+r.reward+" VC");render();confetti()})}
async function sell(id){await lock(async()=>{const r=await call("sellCard",{cardId:id});user.inventory=r.inventory;user.balance=r.balance;user.collected=r.collected;toast("Карточка продана");render()})}
let leaderboardRequestId=0;
let leaderboardSort="xp";
let leaderboardCache=[];
function drawLeaders(){
 const el=$("#leaders");
 if(page!=="leaders"||!el)return;
 const sort=leaderboardSort;
 for(const [id,key] of [["sortXp","xp"],["sortOpens","opens"]]){
  const button=document.getElementById(id);
  if(button){button.classList.toggle("active",sort===key);button.setAttribute("aria-pressed",String(sort===key))}
 }
 const leaders=[...leaderboardCache].sort((a,b)=>(b[sort]||0)-(a[sort]||0)||(b.xp||0)-(a.xp||0)).slice(0,50);
 el.innerHTML=leaders.length?'<p>Топ '+leaders.length+' игроков · '+(sort==="xp"?"по XP":"по открытиям")+'</p>'+leaders.map((x,i)=>'<div class="leader"><span><b>'+(i+1)+'.</b> '+escape(x.nick)+'</span><span>'+fmt(x.xp)+' XP · '+fmt(x.opens)+' открытий</span></div>').join(""):'<div class="empty"><h3>Пока нет игроков в рейтинге</h3><p>Результаты появятся после синхронизации статистики с Firestore.</p></div>';
}
function selectLeaderboardSort(sort){
 if(sort!=="xp"&&sort!=="opens")return;
 leaderboardSort=sort;
 drawLeaders();
}
async function loadLeaders(){
 const el=$("#leaders");if(!el)return;
 const requestId=++leaderboardRequestId;
 if(!db){el.textContent="Firestore не подключён";return}
 el.textContent="Загружаем рейтинг...";
 try{
  const snapshot=await getDocs(query(collection(db,"leaderboard"),limit(100)));
  if(requestId!==leaderboardRequestId||page!=="leaders"||document.getElementById("leaders")!==el)return;
  leaderboardCache=snapshot.docs.map(d=>d.data()).filter(x=>typeof x.nick==="string"&&Number.isFinite(Number(x.xp))&&Number.isFinite(Number(x.opens))&&Number(x.xp)>=0&&Number(x.opens)>=0).map(x=>({nick:x.nick,xp:Number(x.xp),opens:Number(x.opens)}));
  drawLeaders();
 }catch(e){if(requestId===leaderboardRequestId&&document.getElementById("leaders")===el){el.textContent="Не удалось загрузить рейтинг: "+(e.code||e.message);console.error("[VIDNESD] leaderboard",e)}}
}
function confetti(){if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;for(let i=0;i<65;i++){const s=document.createElement("div");s.className="spark";s.style.left=(35+Math.random()*30)+"vw";s.style.top=(25+Math.random()*30)+"vh";s.style.setProperty("--x",(Math.random()-.5)*700+"px");s.style.setProperty("--y",(Math.random()-.5)*650+"px");s.style.setProperty("--spark",["#a18bff","#6ee6ff","#ffca6b","#ff78bf"][i%4]);document.body.append(s);setTimeout(()=>s.remove(),1400)}}
const sleep=t=>new Promise(r=>setTimeout(r,t));
let openingStyle="roulette",upgradeSelected=[],upgradeTarget="",craftSelected=[];
const OPEN_STYLES=[["roulette","🎰 Лента"],["vertical","⬇️ Вертикальная"],["slots","🎰 Барабан"],["grid","🔳 Сетка"],["shuffle","🃏 Перемешивание"],["wheel","🎡 Колесо"],["carousel","🌀 Карусель"],["stack","📚 Стопка"],["duel","⚔️ Две ленты"],["spotlight","🔦 Прожектор"],["spiral","🌀 Спираль"],["cascade","🌊 Каскад"]];
let openingDuration="normal";
const OPEN_DURATIONS=[["normal","Обычная"],["long","Длинная"],["epic","Кинематографичная"]];

function renderUpgrade(){
 const owned=cards.filter(c=>(user.inventory?.[c.id]||0)>0);
 const total=upgradeSelected.reduce((sum,id)=>sum+(cards.find(c=>c.id===id)?.value||0),0);
 const rewards=upgradeRewards(total);
 const {chance,average}=total?upgradeOdds(total,rewards):{chance:0,average:0};
 const minReward=rewards.length?Math.min(...rewards.map(c=>c.value)):0;
 const maxReward=rewards.length?Math.max(...rewards.map(c=>c.value)):0;
 app.innerHTML='<div class="eyebrow">CARD FORGE · RANDOM UPGRADE</div><h1>Апгрейд карточек 3.0</h1><p>Выбери до 5 карточек. Награда определяется случайно и всегда дороже суммы материалов при успехе. Чем дороже возможная награда, тем ниже шанс. При неудаче материалы исчезают.</p><div class="upgrade-layout"><div class="upgrade-panel"><h3>Материалы <small>'+upgradeSelected.length+'/5</small></h3><div class="upgrade-slots">'+Array.from({length:5},(_,i)=>{const c=cards.find(x=>x.id===upgradeSelected[i]);return '<button class="upgrade-slot" data-slot="'+i+'">'+(c?'<span>'+c.emoji+'</span><small>'+escape(c.name)+'</small>':'<span>＋</span><small>Слот '+(i+1)+'</small>')+'</button>'}).join("")+'</div><p>Стоимость материалов: <b>'+fmt(total)+' VC</b></p></div><div class="upgrade-center"><div class="upgrade-ring" style="--progress:'+chance+'%"><div><strong>'+chance+'%</strong><small>Шанс успеха</small></div></div><p>'+(rewards.length?'В случае успеха предмет будет дороже вложений':'Выбери материалы на сумму ниже стоимости доступных карточек')+'</p><button class="primary" id="upgradeNow" '+(!upgradeSelected.length||!rewards.length?'disabled':'')+'>⚡ Испытать шанс</button></div><div class="upgrade-panel"><h3>Случайная награда</h3><div class="upgrade-target"><div class="upgrade-big">🎁</div><b>Неизвестный предмет</b><span class="tag">RANDOM UPGRADE</span><strong>'+(rewards.length?fmt(minReward)+'–'+fmt(maxReward)+' VC':'Нет доступных наград')+'</strong><p>Средняя цена при успехе: '+fmt(Math.round(average))+' VC</p><p>Доступно '+rewards.length+' карточек</p></div></div></div><h2>Твой инвентарь</h2><p>Нажми на карточку, чтобы добавить её в материалы. Можно использовать несколько одинаковых.</p><div class="upgrade-inventory">'+(owned.length?owned.map(c=>'<button class="upgrade-inv-card" data-add="'+c.id+'"><span>'+c.emoji+'</span><b>'+escape(c.name)+'</b><small>'+fmt(c.value)+' VC · ×'+user.inventory[c.id]+'</small></button>').join(""):'<div class="empty">Инвентарь пуст. Открой кейсы, чтобы получить материалы.</div>')+'</div>';
 document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{const id=b.dataset.add;if(upgradeSelected.length>=5)return toast("Максимум 5 материалов");if(upgradeSelected.filter(x=>x===id).length>=user.inventory[id])return toast("Больше копий нет");upgradeSelected.push(id);renderUpgrade()});
 document.querySelectorAll("[data-slot]").forEach(b=>b.onclick=()=>{const i=Number(b.dataset.slot);if(i<upgradeSelected.length){upgradeSelected.splice(i,1);renderUpgrade()}});
 $("#upgradeNow").onclick=()=>lock(async()=>{
  const r=await call("upgradeCard",{sourceIds:[...upgradeSelected]});
  user.inventory=r.inventory;user.collected=r.collected;user.showcase=r.showcase;upgradeSelected=[];renderUpgrade();
  show('<div class="upgrade-success"><div class="upgrade-spin" style="--chance:'+r.chance+'%"><div class="upgrade-needle"><div class="upgrade-needle-tip"></div><div class="upgrade-needle-shaft"></div></div><div class="upgrade-spin-center">'+r.chance+'%<small>Шанс успеха</small></div></div><p>Проверяем результат...</p></div>');
  await sleep(100);const needle=body.querySelector(".upgrade-needle");if(needle){needle.style.setProperty("--end-angle",(1800+r.roll*3.6)+"deg");needle.classList.add("spinning")}
  await sleep(3200);
  show('<div class="upgrade-success"><div class="upgrade-big">'+(r.success?r.card.emoji:"💠")+'</div><h2>'+(r.success?"Улучшение успешно!":"Улучшение не удалось")+'</h2><p>Шанс '+r.chance+'% · Выпало '+r.roll.toFixed(2)+'%</p><p>'+(r.success?escape(r.card.name)+' · '+fmt(r.card.value)+' VC (прибыль +'+fmt(r.card.value-r.total)+' VC)':'Материалы потеряны')+'</p><button class="primary" id="upgradeClose">Продолжить</button></div>');
  $("#upgradeClose").onclick=close;if(r.success)confetti()
 })
}
let openingEffects=true;
function openingBurst(host,rarity="rare",count=26){
 if(!openingEffects||matchMedia("(prefers-reduced-motion: reduce)").matches||!host)return;
 const layer=document.createElement("div");layer.className="vfx-burst rarity-"+rarity;host.append(layer);
 const symbols=["✦","✧","◆","·","✶"];
 for(let i=0;i<count;i++){const p=document.createElement("span");p.className="vfx-particle";p.textContent=symbols[i%symbols.length];const angle=i/count*Math.PI*2+(Math.random()-.5)*.35,dist=70+Math.random()*180;p.style.setProperty("--dx",Math.cos(angle)*dist+"px");p.style.setProperty("--dy",Math.sin(angle)*dist+"px");p.style.setProperty("--delay",Math.random()*.22+"s");p.style.fontSize=(10+Math.random()*18)+"px";layer.append(p)}
 setTimeout(()=>layer.remove(),1900)
}
function openingFlash(host,rarity){if(!openingEffects||!host)return;const e=document.createElement("div");e.className="vfx-flash rarity-"+rarity;host.append(e);setTimeout(()=>e.remove(),1000)}
function openingTile(c){return '<div class="draw-tile rarity-'+c.rarity+'"><span>'+c.emoji+'</span><b>'+escape(c.name)+'</b><small>'+fmt(c.value)+' VC</small></div>'}
async function playOpening(area,style,win,duration){
 const pick=()=>cards[randomInt(cards.length)],pause=t=>new Promise(resolve=>setTimeout(resolve,t));
 if(style==="roulette"||style==="carousel"||style==="vertical"||style==="slots"){
  const vertical=style==="vertical",slots=style==="slots",count=slots?42:style==="carousel"?44:duration>11000?84:duration>9000?68:54,idx=count-(4+randomInt(9));
  const pool=Array.from({length:count},(_,i)=>i===idx?win:pick());
  const layout=vertical?"draw-vertical":slots?"draw-slots":"draw-horizontal";
  area.innerHTML='<div class="draw-window '+layout+' '+(style==="carousel"?"draw-perspective":"")+'"><div class="draw-track">'+pool.map(openingTile).join("")+'</div><div class="draw-marker"></div></div>';
  const track=area.querySelector(".draw-track"),windowEl=area.querySelector(".draw-window"),tile=track.querySelector(".draw-tile");
  await pause(100);
  const gap=parseFloat(getComputedStyle(track).gap)||0;
  const step=(vertical?tile.offsetHeight:tile.offsetWidth)+gap;
  const center=(vertical?windowEl.clientHeight:windowEl.clientWidth)/2;
  const offset=idx*step+(vertical?tile.offsetHeight:tile.offsetWidth)/2-center;
  track.style.transition='transform '+duration+'ms cubic-bezier(.07,.72,.12,1)';
  track.style.transform=vertical?'translateY(-'+offset+'px)':'translateX(-'+offset+'px)';
  await pause(duration+100);
  return;
 }
 if(style==="grid"){
  const path=[0,1,2,3,4,9,14,19,18,17,16,15,10,5];
  const winnerStep=randomInt(path.length),winnerIndex=path[winnerStep];
  const cells=Array.from({length:20},(_,i)=>i===winnerIndex?win:pick());
  area.innerHTML='<div class="draw-grid">'+cells.map((c,i)=>'<div class="draw-grid-cell" data-cell="'+i+'">'+openingTile(c)+'</div>').join("")+'</div>';
  const tiles=[...area.querySelectorAll(".draw-grid-cell")];
  const laps=duration>11000?5:duration>9000?4:3;
  const steps=laps*path.length+winnerStep+1;
  const weights=Array.from({length:steps},(_,i)=>0.55+2.8*Math.pow(i/Math.max(1,steps-1),3));
  const sum=weights.reduce((x,y)=>x+y,0);
  for(let i=0;i<steps;i++){
   tiles.forEach(x=>x.classList.remove("active"));
   tiles[path[i%path.length]].classList.add("active");
   await pause(duration*weights[i]/sum);
  }
  return;
 }
 if(style==="shuffle"){
  const target=randomInt(8),pool=Array.from({length:8},(_,i)=>i===target?win:pick());
  area.innerHTML='<div class="draw-shuffle">'+pool.map((c,i)=>'<div class="draw-shuffle-card" data-pos="'+i+'"><div class="draw-back">✦</div><div class="draw-front">'+openingTile(c)+'</div></div>').join("")+'</div>';
  const elements=[...area.querySelectorAll(".draw-shuffle-card")];
  const steps=Math.max(12,Math.round(duration/340));
  for(let i=0;i<steps;i++){const j=randomInt(elements.length);elements.forEach((el,k)=>{el.style.transform='translateY('+(k===j?-18:0)+'px) rotate('+(k===j?8:-2)+'deg)';el.classList.remove("selected")});await pause(duration/steps)}
  elements.forEach((el,k)=>{el.style.transform="";el.classList.toggle("selected",k===target);if(k===target)el.classList.add("revealed")});
  await pause(500);return;
 }
 if(style==="wheel"){
  const size=12,winnerIndex=randomInt(size);
  const pool=Array.from({length:size},(_,i)=>i===winnerIndex?win:pick());
  area.innerHTML='<div class="draw-wheel"><div class="draw-wheel-rotor">'+pool.map((card,i)=>'<div class="draw-wheel-item" style="--angle:'+(i*360/size)+'deg">'+openingTile(card)+'</div>').join("")+'</div><div class="draw-wheel-pointer">▼</div></div>';
  const rotor=area.querySelector(".draw-wheel-rotor");await pause(100);
  const revolutions=duration>11000?8:duration>9000?7:6;
  const finalAngle=revolutions*360-winnerIndex*(360/size);
  rotor.style.transition='transform '+duration+'ms cubic-bezier(.07,.74,.12,1)';
  rotor.style.transform='rotate('+finalAngle+'deg)';
  await pause(duration+100);return;
 }
 if(style==="duel"){
  const n=duration>11000?66:duration>9000?54:44,idx=n-(3+randomInt(9));
  const rows=[0,1].map(row=>Array.from({length:n},(_,i)=>i===idx?(row===0?win:pick()):pick()));
  area.innerHTML='<div class="draw-duel">'+rows.map((items,row)=>'<div class="draw-duel-window"><div class="draw-duel-track">'+items.map(openingTile).join("")+'</div><div class="draw-duel-marker"></div></div>').join("")+'</div>';
  const windows=[...area.querySelectorAll(".draw-duel-window")];
  await pause(90);
  windows.forEach((w,row)=>{const t=w.querySelector(".draw-duel-track"),item=t.querySelector(".draw-tile"),step=item.offsetWidth+8,offset=idx*step+item.offsetWidth/2-w.clientWidth/2;t.style.transition='transform '+(duration-(row===0?0:700))+'ms cubic-bezier(.06,.75,.12,1)';t.style.transform='translateX(-'+offset+'px)'});
  await pause(duration+120);return;
 }
 if(style==="spotlight"){
  const target=randomInt(12),items=Array.from({length:12},(_,i)=>i===target?win:pick());
  area.innerHTML='<div class="draw-spotlight">'+items.map((c,i)=>'<div class="draw-spotlight-item" data-spot="'+i+'">'+openingTile(c)+'</div>').join("")+'</div>';
  const els=[...area.querySelectorAll(".draw-spotlight-item")],loops=duration>11000?5:duration>9000?4:3;
  const steps=loops*12+target+1,weights=Array.from({length:steps},(_,i)=>.4+2.7*Math.pow(i/steps,3)),sum=weights.reduce((a,b)=>a+b,0);
  for(let i=0;i<steps;i++){els.forEach(e=>e.classList.remove("lit"));els[i%12].classList.add("lit");await pause(duration*weights[i]/sum)}
  return;
 }
 if(style==="spiral"){
  const count=duration>11000?35:duration>9000?29:23,items=Array.from({length:count},(_,i)=>i===count-1?win:pick());
  area.innerHTML='<div class="draw-spiral"><div class="draw-spiral-center">✦</div>'+items.map((c,i)=>'<div class="draw-spiral-card" style="--i:'+i+'">'+openingTile(c)+'</div>').join("")+'</div>';
  const els=[...area.querySelectorAll(".draw-spiral-card")],step=duration/count;
  for(let i=0;i<els.length;i++){const el=els[i];el.classList.add("spiral-visible");if(i>0)els[i-1].classList.add("spiral-gone");await pause(step)}
  els.at(-1).classList.add("spiral-winner");await pause(250);return;
 }
 if(style==="cascade"){
  const count=duration>11000?32:duration>9000?26:20,items=Array.from({length:count},(_,i)=>i===count-1?win:pick());
  area.innerHTML='<div class="draw-cascade"><div class="draw-cascade-lane">'+items.map((c,i)=>'<div class="draw-cascade-card" style="--lane:'+(i%3)+'">'+openingTile(c)+'</div>').join("")+'</div></div>';
  const els=[...area.querySelectorAll(".draw-cascade-card")],step=duration/count;
  for(let i=0;i<els.length;i++){els[i].classList.add("cascade-enter");if(i>0)els[i-1].classList.add("cascade-exit");await pause(step)}
  els.at(-1).classList.add("cascade-winner");await pause(250);return;
 }
 if(style==="stack"){
  const pool=Array.from({length:16},(_,i)=>i===15?win:pick());
  area.innerHTML='<div class="draw-stack">'+pool.map((c,i)=>'<div class="draw-stack-card" style="--depth:'+i+'">'+openingTile(c)+'</div>').join("")+'</div>';
  const elements=[...area.querySelectorAll(".draw-stack-card")];
  const tick=duration/elements.length;
  for(let i=0;i<elements.length-1;i++){elements[i].classList.add("discarded");await pause(tick)}
  elements.at(-1).classList.add("winner");await pause(tick);
 }
}
async function openCase(id){
 const c=cases.find(x=>x.id===id);if(!c)return;const w=caseOdds(c);
 show('<div class="eyebrow">CASE OPENING · VIDNESD</div><h2>'+c.emoji+' '+escape(c.name)+'</h2><p>Цена: '+fmt(c.price)+' VC · Шансы: '+w.map((v,i)=>["Обычная","Редкая","Эпическая","Легендарная"][i]+' '+v+'%').join(" · ")+'</p><h3>Выбери способ открытия</h3><div class="opening-styles">'+OPEN_STYLES.map(([key,label])=>'<button class="style-choice '+(openingStyle===key?'selected':'')+'" data-style="'+key+'">'+label+'</button>').join("")+'</div><div class="opening-speed"><span>Длительность:</span>'+OPEN_DURATIONS.map(([key,label])=>'<button class="style-choice '+(openingDuration===key?'selected':'')+'" data-duration="'+key+'">'+label+'</button>').join("")+'</div><label class="vfx-toggle"><input type="checkbox" id="vfxToggle" '+(openingEffects?"checked":"")+' /> Спецэффекты: свечение, частицы, вспышки</label><div id="rollArea"><div class="case-art">'+c.emoji+'</div></div><div class="actions"><button id="startRoll" class="primary">Открыть за '+fmt(c.price)+' VC</button><button id="preview" class="secondary">Посмотреть карточки</button></div>');
 document.querySelectorAll("[data-style]").forEach(b=>b.onclick=()=>{openingStyle=b.dataset.style;document.querySelectorAll("[data-style]").forEach(x=>x.classList.toggle("selected",x===b))});
 document.querySelectorAll("[data-duration]").forEach(b=>b.onclick=()=>{openingDuration=b.dataset.duration;document.querySelectorAll("[data-duration]").forEach(x=>x.classList.toggle("selected",x===b))});
 $("#vfxToggle").onchange=e=>{openingEffects=e.target.checked};
 $("#preview").onclick=()=>show('<h2>Возможные награды · '+escape(c.name)+'</h2><p>Шансы редкостей: '+w.map((v,i)=>v?["Обычная","Редкая","Эпическая","Легендарная"][i]+" "+v+"%":"").filter(Boolean).join(" · ")+'</p><div class="grid">'+caseAvailable(c).map(x=>cardView(x)).join("")+'</div>');
 $("#startRoll").onclick=()=>lock(async()=>{
  if(user.balance<c.price)throw Error("Недостаточно VC");
  const chosenStyle=openingStyle,chosenDuration=openingDuration;
  $("#startRoll").disabled=true;document.querySelectorAll("[data-style],[data-duration]").forEach(b=>b.disabled=true);
  const r=await call("openCase",{caseId:id,operationId:crypto.randomUUID()});
  user.balance=r.balance;user.xp=r.xp;user.opens=r.opens;user.inventory=r.inventory;user.collected=Object.keys(r.inventory).length;$("#balance").textContent=fmt(user.balance);
  const area=$("#rollArea");if(!area)return;
  const duration=chosenDuration==="epic"?12500:chosenDuration==="long"?9500:7200;
  if(openingEffects){area.classList.add("vfx-running");area.style.setProperty("--vfx-duration",duration+"ms")}
  await playOpening(area,chosenStyle,r.card,duration);
  area.classList.remove("vfx-running");
  openingFlash(area,r.card.rarity);openingBurst(area,r.card.rarity,r.card.rarity==="legendary"?55:30);
  await sleep(650);
  if(!document.body.contains(area))return;
  area.innerHTML='<div class="result rarity-'+r.card.rarity+'"><div class="big">'+r.card.emoji+'</div><h2>'+escape(r.card.name)+'</h2><p>'+r.card.rarity.toUpperCase()+' · '+r.card.value+' VC</p><button class="primary" id="again">Ещё раз</button></div>';
  const resultEl=area.querySelector(".result");if(resultEl){resultEl.classList.add("vfx-result");openingBurst(resultEl,r.card.rarity,r.card.rarity==="legendary"?55:24)}
  $("#again").onclick=()=>openCase(id);if(openingEffects)confetti();toast("Карточка добавлена в инвентарь");
 })
}

try{if(firebaseConfig.apiKey==="REPLACE_ME"||firebaseConfig.appId==="REPLACE_ME")throw Error("Firebase не настроен. Заполни firebase-config.js из Firebase Console.");const firebase=initializeApp(firebaseConfig);auth=getAuth(firebase);db=getFirestore(firebase);functions=null;onAuthStateChanged(auth,async u=>{cloudReady=false;current=u;user=null;render();if(!u){close();return}if(u){if(!verified()){await refreshVerification(u)}if(!verified()){verifyModal();return}try{await bootstrap();close()}catch(e){err(e)}}})}catch(e){err(e);app.innerHTML='<div class="empty"><h2>Подключение Firebase</h2><p>'+escape(e.message)+'</p><p>Укажи параметры проекта casespin-web в файле firebase-config.js.</p></div>'}
render();
