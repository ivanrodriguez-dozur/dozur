/* =======================
   Config editable
======================= */
const TITLE = "Adivina la cancion";
const SUBTITLE = "Adivina la cancion (elige 5 emojis)";
const SECRET = ["🕺","🎵","👟","💃","💦"]; // <-- cambia la respuesta (5 emojis)
const PALETTE = [
"🥂","🎤","🕺","👟","⚡",
"❤️","🐾","🍾","💦","🛍️",
"🍾","💃","💋","🎶","🌟",
"🍀","🎼","👟","🐾","🕺",
"🥂","💋","🔊","🎵","🎧"
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
  $("#btn-ideas").addEventListener("click", ()=> alert("✅ = emoji correcto en la posición correcta
🟡 = emoji correcto pero en otra posición
⚪️ = emoji no está en el código"));
});

// Modal "¿Cómo jugar?"
document.getElementById("howto-list").innerHTML = `
  <li>El objetivo es adivinar la <strong>secuencia secreta de 5 emojis</strong>.</li>
  <li>Tienes <strong>${CONFIG.MAX_TRIES}</strong> intentos.</li>
  <li>Haz clic en los emojis para formar tu intento (5 símbolos).</li>
  <li>Pulsa <strong>Borrar</strong> para quitar el último emoji.</li>
  <li>Pulsa <strong>Enviar</strong> para validar tu intento.</li>
  <li>La columna de la derecha muestra el feedback:
    <ul>
      <li>✅ = emoji correcto en la posición correcta</li>
      <li>🟡 = emoji correcto pero en otra posición</li>
      <li>⚪️ = ese emoji no está en el código</li>
    </ul>
  </li>
  <li>Pulsa <strong>Reiniciar</strong> para empezar de cero (misma pregunta).</li>
`;
