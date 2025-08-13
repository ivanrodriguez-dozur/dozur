/* =======================
   Config editable
======================= */
const TITLE = "Adivina la película";
const SUBTITLE = "Adivina la película con emojis (elige 5 emojis)";
const SECRET = ["🏀","👟","🌍","🔥","🎤"]; // <-- cambia la respuesta (5 emojis)
const PALETTE = [
 "🍕","🏀","🐱","👟","🌍",
"🎩","🎸","🔥","📚","🎧",
"💎","🎤","📦","🛳️","🐠",
"🕯️","🚀","🪀","🎈","🍉",
"🧸","🚗","🌲","💡","🛩️"
]; // 25 (5x5). Cambia a los que quieras
const CODE_LEN = 5;

/* =======================
   Estado
======================= */
let guess = [];

/* =======================
   Helpers DOM
======================= */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function setText(sel, txt){ const el=$(sel); if(el) el.textContent = txt; }

function renderSlots(){
  const boxes = $$(".slot");
  boxes.forEach((b,i)=>{ b.textContent = guess[i] || ""; });
}
function canSend(){ return guess.length === CODE_LEN; }
function updateSendState(){ $("#btn-send").disabled = !canSend(); }

function clearOne(){
  guess.pop();
  renderSlots();
  updateSendState();
}

function resetAll(){
  guess = [];
  renderSlots();
  updateSendState();
  $("#feedback").textContent = "";
}

function compare(a,b){
  // Bulls & Cows básico: exactos y presentes
  let exact=0, present=0;
  const bb = b.slice(), aa = a.slice();
  for(let i=0;i<CODE_LEN;i++){
    if(aa[i]===bb[i]){ exact++; aa[i]=bb[i]=null; }
  }
  for(let i=0;i<CODE_LEN;i++){
    if(!aa[i]) continue;
    const j = bb.indexOf(aa[i]);
    if(j!==-1){ present++; bb[j]=null; aa[i]=null; }
  }
  return {exact,present};
}

/* =======================
   Render principal
======================= */
function renderPalette(){
  const grid = $("#palette");
  grid.innerHTML = "";
  PALETTE.slice(0,25).forEach(e=>{
    const btn = document.createElement("button");
    btn.className = "emoji";
    btn.textContent = e;
    btn.addEventListener("click", ()=>{
      if(guess.length >= CODE_LEN) return;
      guess.push(e);
      renderSlots();
      updateSendState();
    });
    grid.appendChild(btn);
  });
}

/* =======================
   Enviar
======================= */
function onSend(){
  if(!canSend()) return;
  const {exact,present} = compare(guess, SECRET);
  if(exact === CODE_LEN){
    $("#feedback").textContent = "¡Correcto! 🎉";
  }else{
    $("#feedback").textContent = `✅ ${exact}  •  🟡 ${present}  •  ⚪️ ${Math.max(0, CODE_LEN-exact-present)}`;
  }
}

/* =======================
   Init
======================= */
document.addEventListener("DOMContentLoaded", ()=>{
  setText(".title", TITLE);
  setText(".subtitle", SUBTITLE);

  renderPalette();
  renderSlots();
  updateSendState();

  $("#btn-delete").addEventListener("click", clearOne);
  $("#btn-send").addEventListener("click", onSend);
  $("#btn-ideas").addEventListener("click", ()=> alert("Aquí puedes mostrar pistas o ideas 😉"));
});
