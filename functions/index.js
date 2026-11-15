const admin=require("firebase-admin");const {onCall,HttpsError}=require("firebase-functions/v2/https");const crypto=require("crypto");admin.initializeApp();const db=admin.firestore();const inc=admin.firestore.FieldValue.increment;
const EMOJI=["🌙","☄️","🦊","🦋","🪐","🐉","🦄","🌸","🌊","⚡","💎","🔮","🧿","🦉","🐺","🦁","🌌","🔥","🍀","🌈","🦅","🐈","🪷","🧊","🌠","🎭","🪼","🦈","🌻","🎐","🧬","🛰️"];
const NAMES=["Moonlight","Comet","Fox Spirit","Nebula Wing","Saturn","Ancient Dragon","Unicorn","Sakura","Tidal","Thunder","Crystal","Oracle","Eye of Cosmos","Night Owl","Silver Wolf","Solar Lion","Galaxy","Phoenix","Lucky Clover","Prism","Sky Hunter","Starlit Cat","Lotus","Glacier","Starfall","Phantom","Deep Sea","Ocean King","Sunflower","Wind Chime","Genesis","Voyager"];
const RARITIES=["common","rare","epic","legendary"];const VALUES={common:25,rare:90,epic:350,legendary:1300};
const CARDS=EMOJI.map((emoji,i)=>({id:"card"+i,emoji,name:NAMES[i],rarity:RARITIES[i%4],value:VALUES[RARITIES[i%4]]}));
const CASES=Array.from({length:16},(_,i)=>({id:"case"+i,name:["Starter","Neon Dreams","Cosmic","Wildlife","Ocean","Fantasy","Stardust","Mystic","Phoenix","Moonlight","Cyber","Galaxy","Crystal","Royal","Eclipse","Infinity"][i],emoji:["🎁","🌈","🪐","🦊","🌊","🐉","🌠","🔮","🔥","🌙","🤖","🌌","💎","👑","🌑","♾️"][i],price:[100,180,250,350,450,550,650,750,900,1100,1300,1500,1750,2000,2400,3000][i],tier:Math.min(3,Math.floor(i/4))}));
const WEIGHTS=[[75,20,4.5,.5],[65,26,8,1],[53,32,13,2],[42,35,19,4]];
const QUESTS=[{id:"open3",name:"Открой 3 кейса",target:3,reward:180,field:"opens"},{id:"open10",name:"Открой 10 кейсов",target:10,reward:350,field:"opens"},{id:"collect5",name:"Собери 5 карточек",target:5,reward:250,field:"collected"},{id:"level5",name:"Набери 500 XP",target:500,reward:500,field:"xp"}];
function auth(req){if(!req.auth)throw new HttpsError("unauthenticated","Войдите в аккаунт");if(req.auth.token.email_verified!==true)throw new HttpsError("permission-denied","Подтвердите электронную почту и войдите заново");return req.auth.uid}
function safeUser(s){return {uid:s.uid,nick:s.nick,balance:s.balance,xp:s.xp,opens:s.opens,createdAt:s.createdAt,inventory:s.inventory||{},claimed:s.claimed||{},lastDaily:s.lastDaily||"",collected:s.collected||0}}
function nick(req){return String(req.auth.token.email||"Collector").split("@")[0].replace(/[^\p{L}\p{N}_-]/gu,"").slice(0,20)||"Collector"}
async function ensure(uid,req){const ref=db.collection("users").doc(uid);await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists)tx.create(ref,{uid,nick:nick(req),balance:1000,xp:0,opens:0,collected:0,inventory:{},claimed:{},lastDaily:"",createdAt:Date.now()})});return ref}
exports.bootstrap=onCall(async req=>{const uid=auth(req);const ref=await ensure(uid,req);const s=(await ref.get()).data();return {user:safeUser(s),cases:CASES,cards:CARDS,quests:QUESTS,weights:WEIGHTS}});
exports.openCase=onCall(async req=>{const uid=auth(req);const id=String(req.data?.caseId||"");const op=String(req.data?.operationId||"");if(!/^[a-f0-9-]{36}$/.test(op))throw new HttpsError("invalid-argument","Неверный идентификатор операции");const c=CASES.find(x=>x.id===id);if(!c)throw new HttpsError("invalid-argument","Кейс не найден");const ref=await ensure(uid,req),opRef=db.collection("operations").doc(uid+"_"+op);const roll=crypto.randomInt(0,1000000)/10000;const w=WEIGHTS[c.tier];let r=0,sum=0;for(let i=0;i<w.length;i++){sum+=w[i];if(roll<sum){r=i;break}}const pool=CARDS.filter(x=>x.rarity===RARITIES[r]);const card=pool[crypto.randomInt(pool.length)];const result=await db.runTransaction(async tx=>{const [os,us]=await Promise.all([tx.get(opRef),tx.get(ref)]);if(os.exists)return os.data().result;const u=us.data();if(u.balance<c.price)throw new HttpsError("failed-precondition","Недостаточно VC");const inventory={...(u.inventory||{})};inventory[card.id]=(inventory[card.id]||0)+1;const updated={balance:u.balance-c.price,xp:u.xp+20,opens:u.opens+1,collected:Object.keys(inventory).length,inventory};tx.update(ref,updated);const res={card,caseId:id,balance:updated.balance,xp:updated.xp,opens:updated.opens,inventory};tx.create(opRef,{uid,at:Date.now(),type:"case",result:res});return res});return result});
exports.claimDaily=onCall(async req=>{const uid=auth(req),ref=await ensure(uid,req);const day=new Date().toISOString().slice(0,10);return db.runTransaction(async tx=>{const s=await tx.get(ref),u=s.data();if(u.lastDaily===day)throw new HttpsError("failed-precondition","Награда уже получена");tx.update(ref,{balance:u.balance+150,lastDaily:day});return {balance:u.balance+150,lastDaily:day,reward:150}})});
exports.claimQuest=onCall(async req=>{const uid=auth(req),q=QUESTS.find(x=>x.id===req.data?.questId);if(!q)throw new HttpsError("invalid-argument","Задание не найдено");const ref=await ensure(uid,req);return db.runTransaction(async tx=>{const s=await tx.get(ref),u=s.data();if(u.claimed?.[q.id])throw new HttpsError("failed-precondition","Награда уже получена");if((u[q.field]||0)<q.target)throw new HttpsError("failed-precondition","Задание не выполнено");const claimed={...(u.claimed||{}),[q.id]:true};tx.update(ref,{balance:u.balance+q.reward,claimed});return {balance:u.balance+q.reward,claimed,reward:q.reward}})});
exports.sellCard=onCall(async req=>{const uid=auth(req),card=CARDS.find(x=>x.id===req.data?.cardId);if(!card)throw new HttpsError("invalid-argument","Карточка не найдена");const ref=await ensure(uid,req);return db.runTransaction(async tx=>{const s=await tx.get(ref),u=s.data();const inv={...(u.inventory||{})};if(!inv[card.id])throw new HttpsError("failed-precondition","Карточки нет");inv[card.id]--;if(!inv[card.id])delete inv[card.id];tx.update(ref,{inventory:inv,balance:u.balance+card.value,collected:Object.keys(inv).length});return {inventory:inv,balance:u.balance+card.value,collected:Object.keys(inv).length}})});
exports.leaderboard=onCall(async req=>{auth(req);const snap=await db.collection("users").orderBy("xp","desc").limit(50).get();return {leaders:snap.docs.map(x=>({uid:x.id,nick:x.data().nick,xp:x.data().xp,opens:x.data().opens}))}});


const OWNER_UID="3gXPMPACBeftCtoSGqC6mL5T2iw2";
function owner(req){const uid=auth(req);if(uid!==OWNER_UID)throw new HttpsError("permission-denied","Только владелец VIDNESD");return uid}
exports.adminAdjustVC=onCall(async req=>{
 const actor=owner(req),target=String(req.data?.uid||""),delta=req.data?.delta,reason=String(req.data?.reason||"").trim();
 if(!/^[A-Za-z0-9]{20,128}$/.test(target)||!Number.isSafeInteger(delta)||delta===0||Math.abs(delta)>1000000||reason.length<3||reason.length>200)
 throw new HttpsError("invalid-argument","Укажи UID, целое изменение VC до 1 000 000 и причину от 3 до 200 символов");
 const ref=db.collection("users").doc(target),log=db.collection("adminAudit").doc();
 return db.runTransaction(async tx=>{
  const snap=await tx.get(ref);
  if(!snap.exists)throw new HttpsError("not-found","Игрок ещё не создавал серверный профиль");
  const balance=snap.data().balance||0,next=balance+delta;
  if(next<0||next>Number.MAX_SAFE_INTEGER)throw new HttpsError("failed-precondition","Недопустимый баланс");
  tx.update(ref,{balance:next});
  tx.create(log,{actor,target,delta,reason,before:balance,after:next,createdAt:admin.firestore.FieldValue.serverTimestamp()});
  return {uid:target,balance:next};
 });
});
exports.adminGetUser=onCall(async req=>{
 owner(req);const uid=String(req.data?.uid||"");
 if(!/^[A-Za-z0-9]{20,128}$/.test(uid))throw new HttpsError("invalid-argument","Неверный UID");
 const snap=await db.collection("users").doc(uid).get();
 if(!snap.exists)throw new HttpsError("not-found","Серверный профиль не найден");
 return {user:safeUser(snap.data())};
});
