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
const DEMO_EMOJI=["🌙","☄️","🦊","🦋","🪐","🐉","🦄","🌸","🌊","⚡","💎","🔮","🧿","🦉","🐺","🦁","🌌","🔥","🍀","🌈","🦅","🐈","🪷","🧊","🌠","🎭","🪼","🦈","🌻","🎐","🧬","🛰️"];
const DEMO_NAMES=["Moonlight","Comet","Fox Spirit","Nebula Wing","Saturn","Ancient Dragon","Unicorn","Sakura","Tidal","Thunder","Crystal","Oracle","Eye of Cosmos","Night Owl","Silver Wolf","Solar Lion","Galaxy","Phoenix","Lucky Clover","Prism","Sky Hunter","Starlit Cat","Lotus","Glacier","Starfall","Phantom","Deep Sea","Ocean King","Sunflower","Wind Chime","Genesis","Voyager"];
const DEMO_RARITIES=["common","rare","epic","legendary"],DEMO_VALUES={common:25,rare:90,epic:350,legendary:1300};
const DEMO_CARDS=DEMO_EMOJI.map((emoji,i)=>({id:"card"+i,emoji,name:DEMO_NAMES[i],rarity:DEMO_RARITIES[i%4],value:DEMO_VALUES[DEMO_RARITIES[i%4]]}));
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
 if(name==="claimDaily"){const day=new Date().toISOString().slice(0,10);if(u.lastDaily===day)throw Error("Сегодня награда уже получена");u.balance+=150;u.lastDaily=day;demoWrite(u);return {balance:u.balance,lastDaily:day,reward:150}}
 if(name==="claimQuest"){const q=DEMO_QUESTS.find(x=>x.id===data.questId);if(!q)throw Error("Задание не найдено");if(u.claimed[q.id])throw Error("Награда уже получена");if(u[q.field]<q.target)throw Error("Задание ещё не выполнено");u.claimed[q.id]=true;u.balance+=q.reward;demoWrite(u);return {balance:u.balance,claimed:u.claimed,reward:q.reward}}
 if(name==="sellCard"){const card=DEMO_CARDS.find(x=>x.id===data.cardId);if(!card||!u.inventory[card.id])throw Error("Карточка отсутствует");u.inventory[card.id]--;if(!u.inventory[card.id])delete u.inventory[card.id];u.balance+=card.value;u.collected=Object.keys(u.inventory).length;demoWrite(u);return {inventory:u.inventory,balance:u.balance,collected:u.collected}}
 if(name==="upgradeCard"){const target=DEMO_CARDS.find(x=>x.id===data.targetId);const selected=Array.isArray(data.sourceIds)?data.sourceIds:[];if(!target||!selected.length||selected.length>5)throw Error("Выбери от 1 до 5 карточек");const counts={};for(const id of selected)counts[id]=(counts[id]||0)+1;let total=0;for(const [id,count] of Object.entries(counts)){const card=DEMO_CARDS.find(x=>x.id===id);if(!card||card.value>=target.value||Number(u.inventory[id]||0)<count)throw Error("Недостаточно подходящих карточек");total+=card.value*count}if(total<target.value)throw Error("Для улучшения нужно больше материалов");for(const [id,count] of Object.entries(counts)){u.inventory[id]-=count;if(!u.inventory[id])delete u.inventory[id]}u.inventory[target.id]=(u.inventory[target.id]||0)+1;u.collected=Object.keys(u.inventory).length;demoWrite(u);return {inventory:u.inventory,collected:u.collected,card:target}};
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
$("#closeModal").onclick=close;modal.addEventListener("click",e=>{if(e.target===modal)close()});
const cardView=(c,count=0)=>'<div class="tile rarity-'+c.rarity+'"><div class="cardart"><span>'+c.emoji+'</span></div><div class="tag">'+c.rarity+'</div><b>'+escape(c.name)+'</b><p>'+fmt(c.value)+' VC'+(count?' · ×'+count:'')+'</p>'+(count?'<button class="secondary sell" data-id="'+c.id+'">Продать одну</button>':'')+'</div>';
function caseView(c){return '<div class="case"><div class="case-art">'+c.emoji+'</div><div class="tag">Коллекция '+(c.tier+1)+'</div><h3>'+escape(c.name)+'</h3><div class="price">✦ '+fmt(c.price)+' VC</div><button class="primary open" data-id="'+c.id+'">Открыть кейс</button></div>'}
function stats(){return '<div class="stats"><div class="stat"><span class="muted">Баланс</span><b>'+fmt(user?.balance)+' VC</b></div><div class="stat"><span class="muted">Открытий</span><b>'+fmt(user?.opens)+'</b></div><div class="stat"><span class="muted">Опыт</span><b>'+fmt(user?.xp)+' XP</b></div></div>'}
function render(){document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===page));$("#balance").textContent=fmt(user?.balance);$("#authBtn").textContent=current?"Выйти":"Войти";
if(!user){app.innerHTML='<section class="hero"><div><div class="eyebrow">COLLECT · DISCOVER · LEVEL UP</div><h1>Твоя вселенная карточек</h1><p>Собирай уникальные коллекции, открывай бесплатные игровые кейсы, выполняй задания и поднимайся в рейтинге.</p><div class="actions"><button class="primary" id="join">Начать путешествие</button></div></div><div class="hero-art">💠</div></section><h2>Коллекционный мир</h2><div class="grid">'+["🌙","🐉","💎","🪐"].map((e,i)=>cardView({emoji:e,name:["Moonlight","Dragon","Crystal","Saturn"][i],rarity:["common","rare","epic","legendary"][i],value:0}).replace("0 VC","Коллекционная карточка")).join("")+'</div>';$("#join").onclick=()=>current?verifyModal():authModal();return}
if(page==="home"){app.innerHTML='<section class="hero"><div><div class="eyebrow">WELCOME TO VIDNESD</div><h1>Открой свой Cardverse</h1><p>Собирай карточки, повышай уровень и открывай новые коллекции. Все награды исключительно игровые.</p><div class="actions"><button class="primary go" data-go="cases">Открыть кейсы</button><button class="secondary daily">Ежедневный бонус +150 VC</button></div></div><div class="hero-art">🪐</div></section>'+stats()+'<h2>Популярные кейсы</h2><div class="grid">'+cases.slice(0,8).map(caseView).join("")+'</div>'}
if(page==="cases")app.innerHTML='<div class="section-head"><div><div class="eyebrow">CARD PACKS</div><h1>Все кейсы</h1><p>16 тематических наборов. Шансы редкости показаны перед открытием.</p></div></div><div class="grid">'+cases.map(caseView).join("")+'</div>';
if(page==="inventory"){const owned=cards.filter(c=>user.inventory?.[c.id]>0);app.innerHTML='<div class="eyebrow">MY COLLECTION</div><h1>Инвентарь</h1><p>Собрано '+owned.length+' из '+cards.length+' видов карточек</p>'+(owned.length?'<div class="grid">'+owned.map(c=>cardView(c,user.inventory[c.id])).join("")+'</div>':'<div class="empty">Пока пусто. Открой первый кейс, чтобы получить карточку.</div>')}
if(page==="upgrade"){renderUpgrade();return}
if(page==="quests"){app.innerHTML='<div class="eyebrow">REWARDS</div><h1>Задания</h1><p>Получай бесплатные VC за достижения и активность.</p>'+quests.map(q=>{const val=user[q.field]||0,done=user.claimed?.[q.id];return '<div class="quest"><div><strong>'+escape(q.name)+'</strong><span class="muted">'+Math.min(val,q.target)+' / '+q.target+' · +'+q.reward+' VC</span></div><button class="'+(done?'secondary':'primary')+' claim" data-id="'+q.id+'" '+(done||val<q.target?'disabled':'')+'>'+(done?'Получено':val>=q.target?'Забрать':'В процессе')+'</button></div>'}).join("")}
if(page==="profile"){app.innerHTML='<div class="eyebrow">PLAYER PROFILE</div><h1>◈ '+escape(user.nick)+'</h1><p>Подтверждённая почта: '+escape(current.email)+'</p>'+stats()+'<h2>Достижения</h2><div class="grid">'+[{t:"Первый кейс",n:1},{t:"Коллекционер",n:10},{t:"Мастер кейсов",n:50},{t:"Легенда",n:100}].map(x=>'<div class="stat"><b>'+(user.opens>=x.n?'🏆':'🔒')+'</b>'+x.t+'<p>Открытий: '+x.n+'</p></div>').join("")+'</div>'}
if(page==="leaders"){app.innerHTML='<div class="eyebrow">TOP COLLECTORS</div><h1>Лидерборд</h1><p>Онлайн-рейтинг недоступен в демонстрационном режиме Spark.</p><div id="leaders">Прогресс хранится только в этом браузере.</div>';loadLeaders()}
bind()}
function bind(){document.querySelectorAll(".open").forEach(b=>b.onclick=()=>openCase(b.dataset.id));document.querySelectorAll(".sell").forEach(b=>b.onclick=()=>sell(b.dataset.id));document.querySelectorAll(".claim").forEach(b=>b.onclick=()=>claim(b.dataset.id));document.querySelectorAll(".daily").forEach(b=>b.onclick=daily);document.querySelectorAll(".go").forEach(b=>b.onclick=()=>{page=b.dataset.go;render()})}
document.querySelectorAll("#nav button").forEach(b=>b.onclick=()=>{page=b.dataset.page;render()});
$("#authBtn").onclick=()=>current?lock(async()=>{await signOut(auth);toast("Вы вышли")}):authModal();
function authModal(mode="login"){show('<h2>'+(mode==="register"?"Создать аккаунт":mode==="reset"?"Восстановить пароль":"Войти в VIDNESD")+'</h2><form class="form" id="authForm"><label>Электронная почта<input type="email" name="email" required autocomplete="email" placeholder="you@example.com"></label>'+(mode==="reset"?'':'<label>Пароль (не менее 6 символов)<input type="password" name="password" minlength="6" required autocomplete="'+(mode==="register"?"new-password":"current-password")+'"></label>')+'<button class="primary" type="submit">'+(mode==="register"?"Зарегистрироваться":mode==="reset"?"Отправить письмо":"Войти")+'</button><button type="button" class="link" id="switch">'+(mode==="register"?"Уже есть аккаунт? Войти":"Создать аккаунт")+'</button><button type="button" class="link" id="reset">Забыли пароль?</button></form>');$("#switch").onclick=()=>authModal(mode==="register"?"login":"register");$("#reset").onclick=()=>authModal("reset");$("#authForm").onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target);lock(async()=>{const email=fd.get("email"),password=fd.get("password");if(mode==="reset"){await sendPasswordResetEmail(auth,email);toast("Письмо отправлено");close();return}if(mode==="register"){const cred=await createUserWithEmailAndPassword(auth,email,password);await sendEmailVerification(cred.user);toast("Проверь почту и подтверди адрес");verifyModal();return}await signInWithEmailAndPassword(auth,email,password);close()})}}
function verifyModal(){show('<h2>✉️ Подтверди почту</h2><p>Мы отправили письмо на '+escape(current?.email||"твою почту")+'. Открой ссылку в письме, затем нажми кнопку ниже.</p><div class="actions"><button class="primary" id="check">Проверить подтверждение</button><button class="secondary" id="resend">Отправить повторно</button></div>');$("#check").onclick=()=>lock(async()=>{if(!await refreshVerification(current))throw Error("Не удалось обновить статус почты. Выйди и войди снова после подтверждения адреса.");try{await bootstrap()}catch(e){throw Error("Загрузка профиля: "+(e.code||e.message||e))}close()});$("#resend").onclick=()=>lock(async()=>{await sendEmailVerification(current);toast("Письмо отправлено")})}
async function bootstrap(){const data=await call("bootstrap");user=data.user;cases=data.cases;cards=data.cards;quests=data.quests;weights=data.weights;render()}
async function daily(){await lock(async()=>{const r=await call("claimDaily");user.balance=r.balance;user.lastDaily=r.lastDaily;toast("Получено +150 VC");render();confetti()})}
async function claim(id){await lock(async()=>{const r=await call("claimQuest",{questId:id});user.balance=r.balance;user.claimed=r.claimed;toast("Награда +"+r.reward+" VC");render();confetti()})}
async function sell(id){await lock(async()=>{const r=await call("sellCard",{cardId:id});user.inventory=r.inventory;user.balance=r.balance;user.collected=r.collected;toast("Карточка продана");render()})}
async function loadLeaders(){return;try{const r=await call("leaderboard");const el=$("#leaders");if(!el)return;el.innerHTML=r.leaders.length?r.leaders.map((x,i)=>'<div class="leader"><span><b>'+(i+1)+'.</b> '+escape(x.nick)+'</span><span>'+fmt(x.xp)+' XP</span></div>').join(""):'Пока нет участников'}catch(e){err(e)}}
function confetti(){if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;for(let i=0;i<65;i++){const s=document.createElement("div");s.className="spark";s.style.left=(35+Math.random()*30)+"vw";s.style.top=(25+Math.random()*30)+"vh";s.style.setProperty("--x",(Math.random()-.5)*700+"px");s.style.setProperty("--y",(Math.random()-.5)*650+"px");s.style.setProperty("--spark",["#a18bff","#6ee6ff","#ffca6b","#ff78bf"][i%4]);document.body.append(s);setTimeout(()=>s.remove(),1400)}}
const sleep=t=>new Promise(r=>setTimeout(r,t));
let openingStyle="roulette",upgradeSelected=[],upgradeTarget="";
const OPEN_STYLES=[["roulette","🎰 Рулетка"],["reveal","🎁 Раскрытие"],["carousel","🌀 Карусель"],["drop","💫 Падение"],["cinematic","✨ Кино"]];
function renderUpgrade(){
 const owned=cards.filter(c=>(user.inventory?.[c.id]||0)>0);
 if(!upgradeTarget)upgradeTarget=cards.find(c=>c.value>=350)?.id||cards[0]?.id;
 const target=cards.find(c=>c.id===upgradeTarget)||cards[0];
 const total=upgradeSelected.reduce((sum,id)=>sum+(cards.find(c=>c.id===id)?.value||0),0);
 const percentage=Math.min(100,Math.round(total/target.value*100));
 app.innerHTML='<div class="eyebrow">CARD FORGE · GUARANTEED CRAFTING</div><h1>Апгрейд карточек 2.0</h1><p>Объединяй до 5 карточек в одну более ценную. Без случайного проигрыша: улучшение гарантировано при достаточной стоимости материалов.</p><div class="upgrade-layout"><div class="upgrade-panel"><h3>Материалы <small>'+upgradeSelected.length+'/5</small></h3><div class="upgrade-slots">'+Array.from({length:5},(_,i)=>{const c=cards.find(x=>x.id===upgradeSelected[i]);return '<button class="upgrade-slot" data-slot="'+i+'">'+(c?'<span>'+c.emoji+'</span><small>'+escape(c.name)+'</small>':'<span>＋</span><small>Слот '+(i+1)+'</small>')+'</button>'}).join("")+'</div><p>Стоимость материалов: <b>'+fmt(total)+' VC</b></p></div><div class="upgrade-center"><div class="upgrade-ring" style="--progress:'+percentage+'%"><div><strong>'+percentage+'%</strong><small>Готовность</small></div></div><p>'+(total>=target.value?'Материалов достаточно':'Добавь карточки на сумму '+fmt(target.value-total)+' VC')+'</p><button class="primary" id="upgradeNow" '+(total<target.value||!upgradeSelected.length?'disabled':'')+'>⚡ Улучшить гарантированно</button></div><div class="upgrade-panel"><h3>Целевая карточка</h3><div class="upgrade-target"><div class="upgrade-big">'+target.emoji+'</div><b>'+escape(target.name)+'</b><span class="tag">'+target.rarity.toUpperCase()+'</span><strong>'+fmt(target.value)+' VC</strong></div><label class="upgrade-label">Выбери результат<select id="upgradeTarget">'+cards.filter(c=>c.value>0).sort((a,b)=>a.value-b.value).map(c=>'<option value="'+c.id+'" '+(c.id===target.id?'selected':'')+'>'+c.emoji+' '+escape(c.name)+' · '+fmt(c.value)+' VC</option>').join("")+'</select></label></div></div><h2>Твой инвентарь</h2><p>Нажми на карточку, чтобы добавить её в материалы. Можно использовать несколько одинаковых.</p><div class="upgrade-inventory">'+(owned.length?owned.map(c=>'<button class="upgrade-inv-card" data-add="'+c.id+'"><span>'+c.emoji+'</span><b>'+escape(c.name)+'</b><small>'+fmt(c.value)+' VC · ×'+user.inventory[c.id]+'</small></button>').join(""):'<div class="empty">Инвентарь пуст. Открой кейсы, чтобы получить материалы.</div>')+'</div>';
 document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{const id=b.dataset.add;const card=cards.find(x=>x.id===id);if(upgradeSelected.length>=5)return toast("Максимум 5 материалов");if(card.value>=target.value)return toast("Материал должен быть дешевле результата");if(upgradeSelected.filter(x=>x===id).length>=user.inventory[id])return toast("Больше копий нет");upgradeSelected.push(id);renderUpgrade()});
 document.querySelectorAll("[data-slot]").forEach(b=>b.onclick=()=>{const i=Number(b.dataset.slot);if(i<upgradeSelected.length){upgradeSelected.splice(i,1);renderUpgrade()}});
 $("#upgradeTarget").onchange=e=>{upgradeTarget=e.target.value;upgradeSelected=[];renderUpgrade()};
 $("#upgradeNow").onclick=()=>lock(async()=>{const r=await call("upgradeCard",{sourceIds:upgradeSelected,targetId:target.id});user.inventory=r.inventory;user.collected=r.collected;upgradeSelected=[];renderUpgrade();show('<div class="upgrade-success"><div class="upgrade-big">'+r.card.emoji+'</div><h2>Улучшение завершено!</h2><p>'+escape(r.card.name)+' добавлена в коллекцию</p><button class="primary" id="upgradeClose">Продолжить</button></div>');$("#upgradeClose").onclick=close;confetti()})
}
async function openCase(id){
 const c=cases.find(x=>x.id===id);if(!c)return;const w=weights[c.tier];
 show('<div class="eyebrow">CASE OPENING · VIDNESD</div><h2>'+c.emoji+' '+escape(c.name)+'</h2><p>Цена: '+fmt(c.price)+' VC · Шансы: '+w.map((v,i)=>["Обычная","Редкая","Эпическая","Легендарная"][i]+' '+v+'%').join(" · ")+'</p><div class="opening-styles">'+OPEN_STYLES.map(([id,label])=>'<button class="style-choice '+(openingStyle===id?'selected':'')+'" data-style="'+id+'">'+label+'</button>').join("")+'</div><div id="rollArea"><div class="case-art">'+c.emoji+'</div></div><div class="actions"><button id="startRoll" class="primary">Открыть за '+fmt(c.price)+' VC</button><button id="preview" class="secondary">Посмотреть карточки</button></div>');
 document.querySelectorAll("[data-style]").forEach(b=>b.onclick=()=>{openingStyle=b.dataset.style;document.querySelectorAll("[data-style]").forEach(x=>x.classList.toggle("selected",x===b))});
 $("#preview").onclick=()=>show('<h2>Карточки коллекции</h2><div class="grid">'+cards.map(x=>cardView(x)).join("")+'</div>');
 $("#startRoll").onclick=()=>lock(async()=>{
  if(user.balance<c.price)throw Error("Недостаточно VC");
  $("#startRoll").disabled=true;document.querySelectorAll("[data-style]").forEach(b=>b.disabled=true);
  const r=await call("openCase",{caseId:id,operationId:crypto.randomUUID()});
  user.balance=r.balance;user.xp=r.xp;user.opens=r.opens;user.inventory=r.inventory;user.collected=Object.keys(r.inventory).length;$("#balance").textContent=fmt(user.balance);
  const area=$("#rollArea");if(!area)return;
  const pick=()=>cards[Math.floor(Math.random()*cards.length)];
  if(openingStyle==="roulette"||openingStyle==="carousel"){
   const count=openingStyle==="roulette"?46:28,winIndex=count-8;
   const pool=Array.from({length:count},(_,i)=>i===winIndex?r.card:pick());
   area.innerHTML='<div class="roulette-window '+(openingStyle==="carousel"?'carousel-mode':'')+'"><div class="roulette-track">'+pool.map(x=>'<div class="roulette-item rarity-'+x.rarity+'"><div><div class="emoji">'+x.emoji+'</div><small>'+escape(x.name)+'</small></div></div>').join("")+'</div></div>';
   const track=area.querySelector(".roulette-track"),windowEl=area.querySelector(".roulette-window");
   await sleep(80);const width=138,center=windowEl.clientWidth/2,offset=winIndex*width+65-center;
   track.style.transition='transform '+(openingStyle==="carousel"?'5':'6.8')+'s cubic-bezier(.09,.72,.13,1)';
   track.style.transform='translateX(-'+offset+'px)';
   await sleep(openingStyle==="carousel"?5150:6950);
  }else{
   area.innerHTML='<div class="opening-stage '+openingStyle+'"><div class="opening-object">'+(openingStyle==="reveal"?'🎁':openingStyle==="drop"?'💠':'✦')+'</div><div class="opening-stage-label">'+(openingStyle==="reveal"?'Раскрытие тайны':openingStyle==="drop"?'Карточка приближается':'Легендарный момент')+'</div></div>';
   await sleep(openingStyle==="cinematic"?3300:2500);
  }
  if(!document.body.contains(area))return;
  area.innerHTML='<div class="result rarity-'+r.card.rarity+'"><div class="big">'+r.card.emoji+'</div><h2>'+escape(r.card.name)+'</h2><p>'+r.card.rarity.toUpperCase()+' · '+r.card.value+' VC</p><button class="primary" id="again">Ещё раз</button></div>';
  $("#again").onclick=()=>openCase(id);confetti();toast("Карточка добавлена в инвентарь");
 })
}

try{if(firebaseConfig.apiKey==="REPLACE_ME"||firebaseConfig.appId==="REPLACE_ME")throw Error("Firebase не настроен. Заполни firebase-config.js из Firebase Console.");const firebase=initializeApp(firebaseConfig);auth=getAuth(firebase);functions=null;onAuthStateChanged(auth,async u=>{current=u;user=null;render();if(u){if(!verified()){await refreshVerification(u)}if(!verified()){verifyModal();return}try{await bootstrap();close()}catch(e){err(e)}}})}catch(e){err(e);app.innerHTML='<div class="empty"><h2>Подключение Firebase</h2><p>'+escape(e.message)+'</p><p>Укажи параметры проекта casespin-web в файле firebase-config.js.</p></div>'}
render();
