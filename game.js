// ======= Config =======
const EMOJIS = ["😀","😎","🥳","🤖","👽","🐱","🐶","🐼","🐵","🦊","🍎","🍌","🍒","🍇","🍉","⚽️","🏀","🎯","🎲","⭐️","🌙","🔥","💧","🌈","❄️","⚡️"];
const CODE_LEN = 5;
const MAX_TRIES = 1;

// ======= Utils =======
const byId = (id) => document.getElementById(id);
const getBoardEl = () => byId('game-board') || byId('board');
const getPaletteEl = () => byId('emoii-panel') || byId('emoji-palette');

function getSeed() {
  const u = new URL(window.location.href);
  const s = u.searchParams.get('seed');
  if (s && s.trim()) return s.trim();
  const d = new Date(), pad = (n)=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

// Fallback SHA-256 que nunca rompe la UI en file://
async function safeSha256(text) {
  try {
    if (window.crypto && crypto.subtle) {
      const enc = new TextEncoder().encode(text);
      const buf = await crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }
  } catch (e) { /* continua abajo */ }
  // Fallback rápido (no criptográfico) solo para mostrar algo
  let h = 0; for (let i=0;i<text.length;i++){ h = (h*31 + text.charCodeAt(i))>>>0; }
  return `fallback-${h.toString(16).padStart(8,'0')}`;
}

function mapHashToSecret(hash) {
  const secret = [];
  for (let i = 0; i < CODE_LEN; i++) {
    const part = hash.slice(i*2, i*2+2) || "00";
    const idx = parseInt(part, 16) % EMOJIS.length;
    secret.push(EMOJIS[isNaN(idx)?0:idx]);
  }
  return secret;
}

function compareGuess(guess, secret) {
  const s = secret.slice(), g = guess.slice();
  let exact=0, present=0;
  for (let i=0;i<CODE_LEN;i++){
    if (g[i]===s[i]){ exact++; g[i]=s[i]=null; }
  }
  for (let i=0;i<CODE_LEN;i++){
    if (!g[i]) continue;
    const j = s.indexOf(g[i]);
    if (j!==-1){ present++; s[j]=null; g[i]=null; }
  }
  return {exact, present};
}

// ======= Estado =======
let secret=[], currentRow=0, currentGuess=[];

// ======= Pistas =======
const CATS = {
  frutas:["🍎","🍌","🍒","🍇","🍉"],
  animales:["🐱","🐶","🐼","🐵","🦊"],
  deportes:["⚽️","🏀","🎯","🎲"],
  naturaleza:["🌙","🔥","💧","🌈","❄️","⚡️"],
  caritas:["😀","😎","🥳","🤖","👽"]
};
const nombre = {"🍎":"manzana","🍌":"banano","🍒":"cereza","🍇":"uvas","🍉":"sandía","🐱":"gato","🐶":"perro","🐼":"panda","🐵":"mono","🦊":"zorro","⚽️":"balón","🏀":"baloncesto","🎯":"diana","🎲":"dado","🌙":"luna","🔥":"fuego","💧":"agua","🌈":"arcoíris","❄️":"nieve","⚡️":"rayo","😀":"cara feliz","😎":"cara con gafas","🥳":"fiesta","🤖":"robot","👽":"alien","⭐️":"estrella"};

function generarPista(sec){
  let mejor=null, cnt=0;
  for (const [cat, lista] of Object.entries(CATS)){
    const c = sec.filter(e=>lista.includes(e)).length;
    if (c>cnt){ cnt=c; mejor=cat; }
  }
  if (cnt===CODE_LEN) return `Pista: <strong>todos los emojis son de “${mejor}”</strong>.`;
  if (cnt>=4) return `Pista: <strong>al menos ${cnt} de 6 son “${mejor}”</strong>.`;
  const rep = (new Set(sec).size!==sec.length) ? "Hay emojis repetidos." : "No hay emojis repetidos.";
  return `Pista: ${rep} El primer emoji es <strong>${nombre[sec[0]]||sec[0]}</strong> (${sec[0]}).`;
}

// ======= UI =======
function renderBoard(el){
  el.innerHTML='';
  for(let r=0;r<MAX_TRIES;r++){
    const row=document.createElement('div'); row.className='row'; row.dataset.row=r;
    for(let c=0;c<CODE_LEN;c++){
      const slot=document.createElement('div'); slot.className='slot';
      slot.dataset.row=r; slot.dataset.col=c; row.appendChild(slot);
    }
    const fb=document.createElement('div'); fb.className='feedback'; fb.dataset.row=r; fb.textContent='—';
    row.appendChild(fb); el.appendChild(row);
  }
}

function renderPalette(el){
  if(!el){ console.error('No encontré el panel de emojis'); return; }
  el.style.display='grid';
  el.innerHTML='';
  const frag=document.createDocumentFragment();
  EMOJIS.forEach(e=>{
    const b=document.createElement('button');
    b.type='button'; b.className='emoji-btn'; b.textContent=e;
    b.addEventListener('click', ()=>onEmojiClick(e));
    frag.appendChild(b);
  });
  el.appendChild(frag);
}

function updateCurrentRowUI(){
  const boardEl=getBoardEl();
  for(let c=0;c<CODE_LEN;c++){
    const slot=boardEl.querySelector(`.slot[data-row="${currentRow}"][data-col="${c}"]`);
    if(slot) slot.textContent=currentGuess[c]||'';
  }
}

function setFeedback(row,{exact,present}){
  const fb=getBoardEl().querySelector(`.feedback[data-row="${row}"]`);
  if (fb) fb.textContent='✅'.repeat(exact)+'🟡'.repeat(present)+'⚪️'.repeat(Math.max(0,CODE_LEN-exact-present));
}

// ======= Interacciones =======
function onEmojiClick(e){ if(currentRow>=MAX_TRIES||currentGuess.length>=CODE_LEN) return; currentGuess.push(e); updateCurrentRowUI(); }
function onBackspace(){ currentGuess.pop(); updateCurrentRowUI(); }
function lockInput(){ const p=getPaletteEl(); if(p) p.style.pointerEvents='none'; byId('btn-backspace').disabled=true; byId('btn-submit').disabled=true; }
function onSubmit(){
  if(currentGuess.length!==CODE_LEN){ alert(`Debes elegir ${CODE_LEN} emojis.`); return; }
  const res=compareGuess(currentGuess, secret); setFeedback(currentRow,res);
  if(res.exact===CODE_LEN){ lockInput(); alert(`¡Ganaste en el intento #${currentRow+1}!`); saveProgress(true); return; }
  currentRow++; saveProgress(false);
  if(currentRow>=MAX_TRIES){ lockInput(); alert(`Se acabaron los intentos. El código era: ${secret.join(' ')}`); return; }
  currentGuess=[];
}
function onRestart(){ init(true); }
async function onShare(){
  const url=new URL(window.location.href); url.searchParams.set('seed', getSeed());
  try { await navigator.clipboard.writeText(url.toString()); alert('URL copiada al portapapeles'); }
  catch { prompt('Copia la URL del reto:', url.toString()); }
}

// ======= Persistencia =======
function storageKey(){ return `emoji-game:${getSeed()}`; }
function saveProgress(won){ localStorage.setItem(storageKey(), JSON.stringify({row:currentRow,currentGuess,won:!!won})); }
function loadProgress(){ try{ return JSON.parse(localStorage.getItem(storageKey())||'null'); }catch{return null;} }

// ======= Init =======
async function init(isRestart=false){
  const seed=getSeed();
  const h = await safeSha256(seed);      // nunca rompe
  secret  = mapHashToSecret(h);

  // DIBUJA UI ANTES de cualquier otra cosa
  const boardEl=getBoardEl(); const paletteEl=getPaletteEl();
  renderBoard(boardEl); renderPalette(paletteEl);

  // Prueba de integridad (no bloquear si falla)
  try { byId('integrity-hash').textContent = await safeSha256(secret.join('')); }
  catch { byId('integrity-hash').textContent = 'no disponible'; }

  // Pista
  const intro=byId('game-intro'); if(intro) intro.innerHTML = generarPista(secret);

  currentRow=0; currentGuess=[];
  if(!isRestart){
    const saved=loadProgress();
    if(saved && typeof saved.row==='number'){
      currentRow=Math.min(saved.row,MAX_TRIES);
      currentGuess=Array.isArray(saved.currentGuess)?saved.currentGuess:[];
      updateCurrentRowUI(); if(saved.won) lockInput();
    }
  } else {
    localStorage.removeItem(storageKey());
    const p=getPaletteEl(); if(p) p.style.pointerEvents='auto';
    byId('btn-backspace').disabled=false; byId('btn-submit').disabled=false;
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  byId('btn-backspace').addEventListener('click', onBackspace);
  byId('btn-submit').addEventListener('click', onSubmit);
  byId('btn-restart').addEventListener('click', onRestart);
  byId('btn-share').addEventListener('click', onShare);
  byId('howto-link').addEventListener('click', (e)=>{ e.preventDefault(); byId('howto-modal').style.display='block'; });
  byId('close-modal').addEventListener('click', ()=>{ byId('howto-modal').style.display='none'; });
  init(false);
});