import {initializeApp} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {getAuth,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,sendEmailVerification,sendPasswordResetEmail,onAuthStateChanged,reload,getIdTokenResult} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {getFunctions,httpsCallable,connectFunctionsEmulator} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js";
import {firebaseConfig} from "./firebase-config.js";
const $=s=>document.querySelector(s),app=$("#app"),modal=$("#modal"),body=$("#modalBody");
let auth=null,functions=null,current=null,user=null,cases=[],cards=[],quests=[],weights=[],page="home",busy=false;
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
const DEMO_WEIGHTS=[[75,20,4.5,.5],[65,26,8,1],[53,32,13,2],[42,35,19,4]];
const DEMO_QUESTS=[{id:"open3",name:"Открой 3 кейса",target:3,reward:180,field:"opens"},{id:"open10",name:"Открой 10 кейсов",target:10,reward:350,field:"opens"},{id:"collect5",name:"Собери 5 карточек",target:5,reward:250,field:"collected"},{id:"level5",name:"Набери 500 XP",target:500,reward:500,field:"xp"}];
const demoKey=()=> "vidnesd_demo_v1_"+current.uid;
const randomInt=n=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return Math.floor(a[0]/4294967296*n)};
function demoRead(){try{return JSON.parse(localStorage.getItem(demoKey()))}catch{return null}}
function demoWrite(u){localStorage.setItem(demoKey(),JSON.stringify(u))}
async function call(name,data={}){
 if(!verified())throw Error("Подтверди электронную почту");
 let u=demoRead();
 if(!u){u={uid:current.uid,nick:(current.email||"Collector").split("@")[0].slice(0,20),balance:1000,xp:0,opens:0,collected:0,inventory:{},claimed:{},lastDaily:"",createdAt:Date.now(),operations:{}};demoWrite(u)}
 if(name==="bootstrap")return {user:u,cases:DEMO_CASES,cards:DEMO_CARDS,quests:DEMO_QUESTS,weights:DEMO_WEIGHTS};
 if(name==="leaderboard")return {leaders:[],demo:true};
 if(name==="saveShowcase"){const ids=Array.isArray(data.ids)?data.ids:[];if(ids.length>5||new Set(ids).size!==ids.length||ids.some(id=>!u.inventory[id]))throw Error("Можно выставить до 5 принадлежащих тебе карточек");u.showcase=ids;demoWrite(u);return {showcase:ids}}
 if(name==="craftCard"){const target=DEMO_CARDS.find(c=>c.id===data.targetId);if(!target)throw Error("Рецепт не найден");const ri=DEMO_RARITIES.indexOf(target.rarity);if(ri<1)throw Error("Для этой карточки нет рецепта");const selected=Array.isArray(data.sourceIds)?data.sourceIds:[];if(selected.length!==3||new Set(selected).size!==3)throw Error("Выбери 3 разные карточки");const materials=selected.map(id=>DEMO_CARDS.find(x=>x.id===id));const sourceTier=materials[0]&&DEMO_RARITIES.indexOf(materials[0].rarity);if(!materials.every(c=>c&&DEMO_RARITIES.indexOf(c.rarity)===sourceTier&&u.inventory[c.id]))throw Error("Материалы должны быть одной редкости и находиться в инвентаре");if(sourceTier!==ri-1&&sourceTier!==ri)throw Error("Выбирай результат той же или следующей редкости");if(sourceTier===ri&&selected.includes(target.id))throw Error("Для обмена выбери другие карточки");for(const id of selected){u.inventory[id]--;if(!u.inventory[id])delete u.inventory[id]}u.inventory[target.id]=(u.inventory[target.id]||0)+1;u.collected=Object.keys(u.inventory).length;u.showcase=(u.showcase||[]).filter(id=>u.inventory[id]);demoWrite(u);return {inventory:u.inventory,collected:u.collected,showcase:u.showcase,card:target}}

 if(name==="freeVC"){u.balance+=10000;demoWrite(u);return {balance:u.balance}};
 if(name==="claimDaily"){const day=new Date().toISOString().slice(0,10);if(u.lastDaily===day)throw Error("Сегодня награда уже получена");u.balance+=150;u.lastDaily=day;demoWrite(u);return {balance:u.balance,lastDaily:day,reward:150}}
 if(name==="claimQuest"){const q=DEMO_QUESTS.find(x=>x.id===data.questId);if(!q)throw Error("Задание не найдено");if(u.claimed[q.id])throw Error("Награда уже получена");if(u[q.field]<q.target)throw Error("Задание ещё не выполнено");u.claimed[q.id]=true;u.balance+=q.reward;demoWrite(u);return {balance:u.balance,claimed:u.claimed,reward:q.reward}}
 if(name==="sellCard"){const card=DEMO_CARDS.find(x=>x.id===data.cardId);if(!card||!u.inventory[card.id])throw Error("Карточка отсутствует");u.inventory[card.id]--;if(!u.inventory[card.id])delete u.inventory[card.id];u.balance+=card.value;u.collected=Object.keys(u.inventory).length;u.showcase=(u.showcase||[]).filter(id=>u.inventory[id]);demoWrite(u);return {inventory:u.inventory,balance:u.balance,collected:u.collected,showcase:u.showcase}}
 if(name==="upgradeCard"){const target=DEMO_CARDS.find(x=>x.id===data.targetId),selected=Array.isArray(data.sourceIds)?data.sourceIds:[];if(!target||!selected.length||selected.length>5)throw Error("Выбери от 1 до 5 карточек");const counts={};for(const id of selected)counts[id]=(counts[id]||0)+1;let total=0;for(const [id,count] of Object.entries(counts)){const card=DEMO_CARDS.find(x=>x.id===id);if(!card||card.value>=target.value||Number(u.inventory[id]||0)<count)throw Error("Недостаточно подходящих карточек");total+=card.value*count}const chance=Math.min(100,Math.round(total/target.value*10000)/100),roll=randomInt(1000000)/10000,success=roll<chance;for(const [id,count] of Object.entries(counts)){u.inventory[id]-=count;if(!u.inventory[id])delete u.inventory[id]}if(success)u.inventory[target.id]=(u.inventory[target.id]||0)+1;u.collected=Object.keys(u.inventory).length;demoWrite(u);return {inventory:u.inventory,collected:u.collected,card:target,chance,roll,success}};
 if(name==="openCase"){
  const cs=DEMO_CASES.find(x=>x.id===data.caseId);if(!cs)throw Error("Кейс не найден");
  if(u.operations[data.operationId])return u.operations[data.operationId];
  if(u.balance<cs.price)throw Error("Недостаточно VC");
  const roll=randomInt(1000000)/10000,w=DEMO_WEIGHTS[cs.tier];let rarity=0,total=0;
  for(let i=0;i<w.length;i++){total+=w[i];if(roll<total){rarity=i;break}}
  const pool=DEMO_CARDS.filter(x=>x.rarity===DEMO_RARITIES[rarity]);const card=pool[randomInt(pool.length)];
  u.balance-=cs.price;u.xp+=20;u.opens++;u.inventory[card.id]=(u.inventory[card.id]||0)+1;u.collected=Object.keys(u.inventory).length;
  const result={card,caseId:cs.id,balance:u.balance,xp:u.xp,opens:u.opens,inventory:u.inventory};
  u.operations[data.operationId]=result;
  if(Object.keys(u.operations).length>100)u.operations=Object.fromEntries(Object.entries(u.operations).slice(-100));
  demoWrite(u);return result
 }
 throw Error("Неизвестная операция")
}
const lock=async fn=>{if(busy)return;busy=true;document.body.classList.add("loading");try{await fn()}catch(e){err(e)}finally{busy=false;document.body.classList.remove("loading")}};
const verified=()=>!!current?.emailVerified || !!current?._demoEmailVerified;
async function refreshVerification(u){try{await reload(u);if(u.emailVerified){u._demoEmailVerified=true;return true}}catch(e){console.warn("[VIDNESD] Firebase account reload failed",e)}try{const t=await getIdTokenResult(u,true);if(t.claims.email_verified===true){u._demoEmailVerified=true;return true}}catch(e){console.warn("[VIDNESD] Firebase token refresh failed",e)}return verified()}
function show(html){body.innerHTML=html;modal.classList.remove("hidden")}
function close(){modal.classList.add("hidden");body.innerHTML=""}
$("#authBtn").onclick=()=>{if(current){if(!auth)return toast("Авторизация ещё загружается");lock(async()=>{await signOut(auth);current=null;user=null;page="home";close();render();toast("Вы вышли из аккаунта")})}else if(auth)authModal();else toast("Подключение к Firebase ещё не завершено")};
$("#closeModal").onclick=close;modal.addEventListener("click",e=>{if(e.target===modal)close()});
const cardView=(c,count=0)=>'<div class="tile rarity-'+c.rarity+'"><div class="cardart"><span>'+c.emoji+'</span></div><div class="tag">'+c.rarity+'</div><b>'+escape(c.name)+'</b><p>'+fmt(c.value)+' VC'+(count?' · ×'+count:'')+'</p>'+(count?'<button class="secondary sell" data-id="'+c.id+'">Продать одну</button>':'')+'</div>';
function caseView(c){return '<div class="case"><div class="case-art">'+c.emoji+'</div><div class="tag">Коллекция '+(c.tier+1)+'</div><h3>'+escape(c.name)+'</h3><div class="price">✦ '+fmt(c.price)+' VC</div><button class="primary open" data-id="'+c.id+'">Открыть кейс</button></div>'}
function stats(){return '<div class="stats"><div class="stat"><span class="muted">Баланс</span><b>'+fmt(user?.balance)+' VC</b></div><div class="stat"><span class="muted">Открытий</span><b>'+fmt(user?.opens)+'</b></div><div class="stat"><span class="muted">Опыт</span><b>'+fmt(user?.xp)+' XP</b></div></div>'}
function render(){document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===page));$("#balance").textContent=fmt(user?.balance);$("#authBtn").textContent=current?"Выйти":"Войти";
if(!user){app.innerHTML='<section class="hero"><div><div class="eyebrow">COLLECT · DISCOVER · LEVEL UP</div><h1>Твоя вселенная карточек</h1><p>Собирай уникальные коллекции, открывай бесплатные игровые кейсы, выполняй задания и поднимайся в рейтинге.</p><div class="actions"><button class="primary" id="join">Начать путешествие</button></div></div><div class="hero-art">💠</div></section><h2>Коллекционный мир</h2><div class="grid">'+["🌙","🐉","💎","🪐"].map((e,i)=>cardView({emoji:e,name:["Moonlight","Dragon","Crystal","Saturn"][i],rarity:["common","rare","epic","legendary"][i],value:0}).replace("0 VC","Коллекционная карточка")).join("")+'</div>';$("#join").onclick=()=>current?verifyModal():authModal();return}
if(page==="home"){app.innerHTML='<section class="hero"><div><div class="eyebrow">WELCOME TO VIDNESD</div><h1>Открой свой Cardverse</h1><p>Собирай карточки, повышай уровень и открывай новые коллекции. Все награды исключительно игровые.</p><div class="actions"><button class="primary go" data-go="cases">Открыть кейсы</button><button class="secondary daily">Ежедневный бонус +150 VC</button><button class="secondary free-vc">Получить +10 000 VC</button></div></div><div class="hero-art">🪐</div></section>'+stats()+'<h2>Популярные кейсы</h2><div class="grid">'+cases.slice(0,8).map(caseView).join("")+'</div>'}
if(page==="cases")app.innerHTML='<div class="section-head"><div><div class="eyebrow">CARD PACKS</div><h1>Все кейсы</h1><p>64 тематических набора. Шансы редкости показаны перед открытием.</p></div></div><div class="grid">'+cases.map(caseView).join("")+'</div>';
if(page==="inventory"){const owned=cards.filter(c=>user.inventory?.[c.id]>0);app.innerHTML='<div class="eyebrow">MY COLLECTION</div><h1>Инвентарь</h1><p>Собрано '+owned.length+' из '+cards.length+' видов карточек</p>'+(owned.length?'<div class="grid">'+owned.map(c=>cardView(c,user.inventory[c.id])).join("")+'</div>':'<div class="empty">Пока пусто. Открой первый кейс, чтобы получить карточку.</div>')}
if(page==="craft"){renderCraft();return}
if(page==="upgrade"){renderUpgrade();return}
if(page==="quests"){app.innerHTML='<div class="eyebrow">REWARDS</div><h1>Задания</h1><p>Получай бесплатные VC за достижения и активность.</p>'+quests.map(q=>{const val=user[q.field]||0,done=user.claimed?.[q.id];return '<div class="quest"><div><strong>'+escape(q.name)+'</strong><span class="muted">'+Math.min(val,q.target)+' / '+q.target+' · +'+q.reward+' VC</span></div><button class="'+(done?'secondary':'primary')+' claim" data-id="'+q.id+'" '+(done||val<q.target?'disabled':'')+'>'+(done?'Получено':val>=q.target?'Забрать':'В процессе')+'</button></div>'}).join("")}
if(page==="profile"){app.innerHTML='<div class="eyebrow">PLAYER PROFILE</div><h1>◈ '+escape(user.nick)+'</h1><p>Подтверждённая почта: '+escape(current.email)+'</p>'+stats()+'<h2>Достижения</h2><div class="grid">'+[{t:"Первый кейс",n:1},{t:"Коллекционер",n:10},{t:"Мастер кейсов",n:50},{t:"Легенда",n:100}].map(x=>'<div class="stat"><b>'+(user.opens>=x.n?'🏆':'🔒')+'</b>'+x.t+'<p>Открытий: '+x.n+'</p></div>').join("")+'</div>'}
if(page==="leaders"){app.innerHTML='<div class="eyebrow">TOP COLLECTORS</div><h1>Лидерборд</h1><p>Онлайн-рейтинг недоступен в демонстрационном режиме Spark.</p><div id="leaders">Прогресс хранится только в этом браузере.</div>';loadLeaders()}
bind();if(page==="profile")$("#editShowcase").onclick=editShowcase}
function bind(){document.querySelectorAll(".open").forEach(b=>b.onclick=()=>openCase(b.dataset.id));document.querySelectorAll(".sell").forEach(b=>b.onclick=()=>sell(b.dataset.id));document.querySelectorAll(".claim").forEach(b=>b.onclick=()=>claim(b.dataset.id));document.querySelectorAll(".daily").forEach(b=>b.onclick=daily);document.querySelectorAll(".free-vc").forEach(b=>b.onclick=freeVC);document.querySelectorAll(".go").forEach(b=>b.onclick=()=>{page=b.dataset.go;render()})}
document.querySelectorAll("#nav button").forEach(b=>b.onclick=()=>{page=b.dataset.page;render()});
async function handleAuthButton(){if(!auth){toast("Авторизация ещё загружается. Повтори попытку.");return}if(!current){authModal();return}await lock(async()=>{await signOut(auth);current=null;user=null;page="home";close();render();toast("Вы вышли из аккаунта")})}
$("#authBtn").onclick=handleAuthButton;

function editShowcase(){
 const owned=cards.filter(c=>user.inventory?.[c.id]);const chosen=new Set(user.showcase||[]);
 show('<h2>Витрина коллекции</h2><p>Выбери не больше 5 карточек. В текущей версии витрина хранится в этом браузере.</p><div class="showcase-picker">'+owned.map(c=>'<label><input type="checkbox" data-showcase="'+c.id+'" '+(chosen.has(c.id)?"checked":"")+'><span>'+c.emoji+' '+escape(c.name)+'</span></label>').join("")+'</div><button class="primary" id="saveShowcase">Сохранить</button>');
 $("#saveShowcase").onclick=()=>lock(async()=>{const ids=[...document.querySelectorAll("[data-showcase]:checked")].map(x=>x.dataset.showcase);const r=await call("saveShowcase",{ids});user.showcase=r.showcase;close();render();toast("Витрина сохранена")})
}
function renderCraft(){
 const owned=cards.filter(c=>user.inventory?.[c.id]),material=owned.filter(c=>c.rarity!=="legendary");
 app.innerHTML='<div class="eyebrow">CARD FORGE</div><h1>Крафт карточек</h1><p>Объедини 3 разные карточки одной редкости. Можно получить карточку той же редкости (с потерей стоимости) или следующей редкости. Результат гарантирован, материалы расходуются.</p><div class="craft-layout"><div><h3>Материалы</h3><div class="craft-materials">'+material.map(c=>'<label><input type="checkbox" class="craft-source" value="'+c.id+'"><span>'+c.emoji+' '+escape(c.name)+' · '+c.rarity+'</span></label>').join("")+'</div></div><div><h3>Результат</h3><select id="craftTarget"><option value="">Выбери карточку</option>'+cards.filter(c=>c.rarity!=="common").map(c=>'<option value="'+c.id+'">'+c.emoji+' '+escape(c.name)+' · '+c.rarity+'</option>').join("")+'</select><p id="craftHint">Выбери 3 материала и результат.</p><button class="primary" id="craftNow">Создать карточку</button></div></div>';
 const sources=[...document.querySelectorAll(".craft-source")],target=$("#craftTarget"),hint=$("#craftHint");
 const check=()=>{const selected=sources.filter(x=>x.checked),t=cards.find(c=>c.id===target.value),prev=t&&DEMO_RARITIES[DEMO_RARITIES.indexOf(t.rarity)-1],valid=selected.length===3&&t&&selected.every(x=>cards.find(c=>c.id===x.value)?.rarity===prev);hint.textContent=valid?"Готово: 3 материала → "+t.name:selected.length!==3?"Выбери ровно 3 разные карточки":"Все материалы должны быть предыдущей редкости";$("#craftNow").disabled=!valid;return valid};
 sources.forEach(x=>x.onchange=check);target.onchange=check;check();
 $("#craftNow").onclick=()=>{if(!check())return;const ids=sources.filter(x=>x.checked).map(x=>x.value),t=cards.find(c=>c.id===target.value);show('<h2>Подтверждение крафта</h2><p>Три выбранные карточки будут израсходованы для создания '+t.emoji+' '+escape(t.name)+'.</p><button class="primary" id="confirmCraft">Создать</button>');$("#confirmCraft").onclick=()=>lock(async()=>{const r=await call("craftCard",{targetId:t.id,sourceIds:ids});user.inventory=r.inventory;user.collected=r.collected;user.showcase=r.showcase;close();renderCraft();confetti();toast("Создана карточка: "+r.card.name)})}
}
function authModal(mode="login"){show('<h2>'+(mode==="register"?"Создать аккаунт":mode==="reset"?"Восстановить пароль":"Войти в VIDNESD")+'</h2><form class="form" id="authForm"><label>Электронная почта<input type="email" name="email" required autocomplete="email" placeholder="you@example.com"></label>'+(mode==="reset"?'':'<label>Пароль (не менее 6 символов)<input type="password" name="password" minlength="6" required autocomplete="'+(mode==="register"?"new-password":"current-password")+'"></label>')+'<button class="primary" type="submit">'+(mode==="register"?"Зарегистрироваться":mode==="reset"?"Отправить письмо":"Войти")+'</button><button type="button" class="link" id="switch">'+(mode==="register"?"Уже есть аккаунт? Войти":"Создать аккаунт")+'</button><button type="button" class="link" id="reset">Забыли пароль?</button></form>');$("#switch").onclick=()=>authModal(mode==="register"?"login":"register");$("#reset").onclick=()=>authModal("reset");$("#authForm").onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target);lock(async()=>{const email=fd.get("email"),password=fd.get("password");if(mode==="reset"){await sendPasswordResetEmail(auth,email);toast("Письмо отправлено");close();return}if(mode==="register"){const cred=await createUserWithEmailAndPassword(auth,email,password);await sendEmailVerification(cred.user);toast("Проверь почту и подтверди адрес");verifyModal();return}await signInWithEmailAndPassword(auth,email,password);close()})}}
function verifyModal(){show('<h2>✉️ Подтверди почту</h2><p>Мы отправили письмо на '+escape(current?.email||"твою почту")+'. Открой ссылку в письме, затем нажми кнопку ниже.</p><div class="actions"><button class="primary" id="check">Проверить подтверждение</button><button class="secondary" id="resend">Отправить повторно</button><button class="secondary" id="verifyLogout">Выйти из аккаунта</button></div>');$("#check").onclick=()=>lock(async()=>{if(!await refreshVerification(current))throw Error("Не удалось обновить статус почты. Выйди и войди снова после подтверждения адреса.");try{await bootstrap()}catch(e){throw Error("Загрузка профиля: "+(e.code||e.message||e))}close()});$("#resend").onclick=()=>lock(async()=>{await sendEmailVerification(current);toast("Письмо отправлено")});$("#verifyLogout").onclick=()=>$("#authBtn").click()}
async function bootstrap(){const data=await call("bootstrap");user=data.user;cases=data.cases;cards=data.cards;quests=data.quests;weights=data.weights;render()}
async function freeVC(){await lock(async()=>{const r=await call("freeVC");user.balance=r.balance;render();toast("Получено +10 000 VC!")})}
async function daily(){await lock(async()=>{const r=await call("claimDaily");user.balance=r.balance;user.lastDaily=r.lastDaily;toast("Получено +150 VC");render();confetti()})}
async function claim(id){await lock(async()=>{const r=await call("claimQuest",{questId:id});user.balance=r.balance;user.claimed=r.claimed;toast("Награда +"+r.reward+" VC");render();confetti()})}
async function sell(id){await lock(async()=>{const r=await call("sellCard",{cardId:id});user.inventory=r.inventory;user.balance=r.balance;user.collected=r.collected;toast("Карточка продана");render()})}
async function loadLeaders(){return;try{const r=await call("leaderboard");const el=$("#leaders");if(!el)return;el.innerHTML=r.leaders.length?r.leaders.map((x,i)=>'<div class="leader"><span><b>'+(i+1)+'.</b> '+escape(x.nick)+'</span><span>'+fmt(x.xp)+' XP</span></div>').join(""):'Пока нет участников'}catch(e){err(e)}}
function confetti(){if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;for(let i=0;i<65;i++){const s=document.createElement("div");s.className="spark";s.style.left=(35+Math.random()*30)+"vw";s.style.top=(25+Math.random()*30)+"vh";s.style.setProperty("--x",(Math.random()-.5)*700+"px");s.style.setProperty("--y",(Math.random()-.5)*650+"px");s.style.setProperty("--spark",["#a18bff","#6ee6ff","#ffca6b","#ff78bf"][i%4]);document.body.append(s);setTimeout(()=>s.remove(),1400)}}
const sleep=t=>new Promise(r=>setTimeout(r,t));
let openingStyle="roulette",upgradeSelected=[],upgradeTarget="";
const OPEN_STYLES=[["roulette","🎰 Лента"],["vertical","⬇️ Вертикальная"],["slots","🎰 Барабан"],["grid","🔳 Сетка"],["shuffle","🃏 Перемешивание"],["wheel","🎡 Колесо"],["carousel","🌀 Карусель"],["stack","📚 Стопка"],["duel","⚔️ Две ленты"],["spotlight","🔦 Прожектор"],["spiral","🌀 Спираль"],["cascade","🌊 Каскад"]];
let openingDuration="normal";
const OPEN_DURATIONS=[["normal","Обычная"],["long","Длинная"],["epic","Кинематографичная"]];

function renderUpgrade(){
 const owned=cards.filter(c=>(user.inventory?.[c.id]||0)>0);
 if(!upgradeTarget)upgradeTarget=cards.find(c=>c.value>=350)?.id||cards[0]?.id;
 const target=cards.find(c=>c.id===upgradeTarget)||cards[0];
 const total=upgradeSelected.reduce((sum,id)=>sum+(cards.find(c=>c.id===id)?.value||0),0);
 const percentage=Math.min(100,Math.round(total/target.value*10000)/100);
 app.innerHTML='<div class="eyebrow">CARD FORGE · CHANCE UPGRADE</div><h1>Апгрейд карточек 2.0</h1><p>Выбери до 5 карточек и цель. Шанс зависит от стоимости материалов. При неудаче материалы расходуются. Только игровые предметы.</p><div class="upgrade-layout"><div class="upgrade-panel"><h3>Материалы <small>'+upgradeSelected.length+'/5</small></h3><div class="upgrade-slots">'+Array.from({length:5},(_,i)=>{const c=cards.find(x=>x.id===upgradeSelected[i]);return '<button class="upgrade-slot" data-slot="'+i+'">'+(c?'<span>'+c.emoji+'</span><small>'+escape(c.name)+'</small>':'<span>＋</span><small>Слот '+(i+1)+'</small>')+'</button>'}).join("")+'</div><p>Стоимость материалов: <b>'+fmt(total)+' VC</b></p></div><div class="upgrade-center"><div class="upgrade-ring" style="--progress:'+percentage+'%"><div><strong>'+percentage+'%</strong><small>Шанс успеха</small></div></div><p>'+(percentage>=100?'Гарантированный результат':'Шанс успеха: '+percentage+'%. При неудаче материалы исчезнут')+'</p><button class="primary" id="upgradeNow" '+(!upgradeSelected.length?'disabled':'')+'>⚡ Испытать шанс</button></div><div class="upgrade-panel"><h3>Целевая карточка</h3><div class="upgrade-target"><div class="upgrade-big">'+target.emoji+'</div><b>'+escape(target.name)+'</b><span class="tag">'+target.rarity.toUpperCase()+'</span><strong>'+fmt(target.value)+' VC</strong></div><label class="upgrade-label">Выбери результат<select id="upgradeTarget">'+cards.filter(c=>c.value>0).sort((a,b)=>a.value-b.value).map(c=>'<option value="'+c.id+'" '+(c.id===target.id?'selected':'')+'>'+c.emoji+' '+escape(c.name)+' · '+fmt(c.value)+' VC</option>').join("")+'</select></label></div></div><h2>Твой инвентарь</h2><p>Нажми на карточку, чтобы добавить её в материалы. Можно использовать несколько одинаковых.</p><div class="upgrade-inventory">'+(owned.length?owned.map(c=>'<button class="upgrade-inv-card" data-add="'+c.id+'"><span>'+c.emoji+'</span><b>'+escape(c.name)+'</b><small>'+fmt(c.value)+' VC · ×'+user.inventory[c.id]+'</small></button>').join(""):'<div class="empty">Инвентарь пуст. Открой кейсы, чтобы получить материалы.</div>')+'</div>';
 document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{const id=b.dataset.add;const card=cards.find(x=>x.id===id);if(upgradeSelected.length>=5)return toast("Максимум 5 материалов");if(card.value>=target.value)return toast("Материал должен быть дешевле результата");if(upgradeSelected.filter(x=>x===id).length>=user.inventory[id])return toast("Больше копий нет");upgradeSelected.push(id);renderUpgrade()});
 document.querySelectorAll("[data-slot]").forEach(b=>b.onclick=()=>{const i=Number(b.dataset.slot);if(i<upgradeSelected.length){upgradeSelected.splice(i,1);renderUpgrade()}});
 $("#upgradeTarget").onchange=e=>{upgradeTarget=e.target.value;upgradeSelected=[];renderUpgrade()};
 $("#upgradeNow").onclick=()=>lock(async()=>{
 const r=await call("upgradeCard",{sourceIds:upgradeSelected,targetId:target.id});
 user.inventory=r.inventory;user.collected=r.collected;upgradeSelected=[];renderUpgrade();
 show('<div class="upgrade-success"><div class="upgrade-spin" style="--chance:'+r.chance+'%"><div class="upgrade-needle"><div class="upgrade-needle-tip"></div><div class="upgrade-needle-shaft"></div></div><div class="upgrade-spin-center">'+r.chance+'%<small>Шанс успеха</small></div></div><p>Проверяем результат...</p></div>');
 await sleep(100);const needle=body.querySelector(".upgrade-needle");if(needle){needle.style.setProperty("--end-angle",(1800+r.roll*3.6)+"deg");needle.classList.add("spinning")}
 await sleep(3200);
 show('<div class="upgrade-success"><div class="upgrade-big">'+(r.success?r.card.emoji:"💠")+'</div><h2>'+(r.success?"Улучшение успешно!":"Улучшение не удалось")+'</h2><p>Шанс '+r.chance+'% · Выпало '+r.roll.toFixed(2)+'%</p><p>'+(r.success?escape(r.card.name)+" добавлена в коллекцию":"Материалы использованы")+'</p><button class="primary" id="upgradeClose">Продолжить</button></div>');
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
  const vertical=style==="vertical",slots=style==="slots",count=slots?42:style==="carousel"?44:duration>11000?84:duration>9000?68:54,idx=count-7;
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
  const pool=Array.from({length:8},(_,i)=>i===5?win:pick()),target=5;
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
  const n=duration>11000?66:duration>9000?54:44,idx=n-5;
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
 const c=cases.find(x=>x.id===id);if(!c)return;const w=weights[c.tier];
 show('<div class="eyebrow">CASE OPENING · VIDNESD</div><h2>'+c.emoji+' '+escape(c.name)+'</h2><p>Цена: '+fmt(c.price)+' VC · Шансы: '+w.map((v,i)=>["Обычная","Редкая","Эпическая","Легендарная"][i]+' '+v+'%').join(" · ")+'</p><h3>Выбери способ открытия</h3><div class="opening-styles">'+OPEN_STYLES.map(([key,label])=>'<button class="style-choice '+(openingStyle===key?'selected':'')+'" data-style="'+key+'">'+label+'</button>').join("")+'</div><div class="opening-speed"><span>Длительность:</span>'+OPEN_DURATIONS.map(([key,label])=>'<button class="style-choice '+(openingDuration===key?'selected':'')+'" data-duration="'+key+'">'+label+'</button>').join("")+'</div><label class="vfx-toggle"><input type="checkbox" id="vfxToggle" '+(openingEffects?"checked":"")+' /> Спецэффекты: свечение, частицы, вспышки</label><div id="rollArea"><div class="case-art">'+c.emoji+'</div></div><div class="actions"><button id="startRoll" class="primary">Открыть за '+fmt(c.price)+' VC</button><button id="preview" class="secondary">Посмотреть карточки</button></div>');
 document.querySelectorAll("[data-style]").forEach(b=>b.onclick=()=>{openingStyle=b.dataset.style;document.querySelectorAll("[data-style]").forEach(x=>x.classList.toggle("selected",x===b))});
 document.querySelectorAll("[data-duration]").forEach(b=>b.onclick=()=>{openingDuration=b.dataset.duration;document.querySelectorAll("[data-duration]").forEach(x=>x.classList.toggle("selected",x===b))});
 $("#vfxToggle").onchange=e=>{openingEffects=e.target.checked};
 $("#preview").onclick=()=>show('<h2>Карточки коллекции</h2><div class="grid">'+cards.map(x=>cardView(x)).join("")+'</div>');
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

try{if(firebaseConfig.apiKey==="REPLACE_ME"||firebaseConfig.appId==="REPLACE_ME")throw Error("Firebase не настроен. Заполни firebase-config.js из Firebase Console.");const firebase=initializeApp(firebaseConfig);auth=getAuth(firebase);functions=null;onAuthStateChanged(auth,async u=>{current=u;user=null;render();if(!u){close();return}if(u){if(!verified()){await refreshVerification(u)}if(!verified()){verifyModal();return}try{await bootstrap();close()}catch(e){err(e)}}})}catch(e){err(e);app.innerHTML='<div class="empty"><h2>Подключение Firebase</h2><p>'+escape(e.message)+'</p><p>Укажи параметры проекта casespin-web в файле firebase-config.js.</p></div>'}
render();
