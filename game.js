/**********************
 *   EDITA AQUÍ (fácil)
 **********************/
const CONFIG = {
  TITLE: "Adivina la película",
  QUESTION: "Adivina la película con emojis",
  HINT_EMOJIS: "🙅‍♂️💃👩‍❤️‍👨🚢🥶",

  // Elige el modo: "TEXT" (respuesta escrita) o "EMOJI" (secuencia a 5 emojis)
  MODE: "EMOJI",

  // MODO TEXT
  ANSWER_TEXT: "Titanic",
  MAX_TRIES: 6,

  // MODO EMOJI (si usas MODE: "EMOJI")
  SECRET_EMOJI_CODE: ["🛳️","🧊","💔","🥀","👩‍❤️‍👨"], // EXACTAMENTE 5
  EMOJI_CHOICES: ["🍕","🐱","🛳️","🎩","🌊","🎬","🧊","📚","🎧","💔","🚂","🥀","📦","👩‍❤️‍👨","🐠","🕯️","🚀","🪀","🎈","🍉","🧸","🚗","🌲","💡","🛩️"]
};
/* Fin de lo editable */

/* Utilidades */
const $ = (id)=>document.getElementById(id);

function normalize(s){
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
}

async function safeSha256(text){
  try{
    if (window.crypto?.subtle){
      const enc=new TextEncoder().encode(text);
      const buf=await crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }
  }catch{}
  // Fallback simple (no criptográfico) para file://
  let h=0; for(let i=0;i<text.length;i++){ h=(h*31+text.charCodeAt(i))>>>0; }
  return `fallback-${h.toString(16).padStart(8,'0')}`;
}

function setupCommonUI(){
  $("game-title").textContent = CONFIG.TITLE;
  $("game-intro").textContent = CONFIG.QUESTION;
  $("howto-link").onclick = (e)=>{ e.preventDefault(); $("howto-modal").style.display="block"; };
  $("close-modal").onclick = ()=>{ $("howto-modal").style.display="none"; };
  $("btn-share").onclick = async ()=>{
    const url = new URL(window.location.href);
    try{ await navigator.clipboard.writeText(url.toString()); alert("URL copiada al portapapeles"); }
    catch{ prompt("Copia la URL:", url.toString()); }
  };
}

/* ===========================
   MODO TEXT (respuesta escrita)
   =========================== */
let triesLeft = CONFIG.MAX_TRIES;

function initTextMode(){
  // Mostrar bloque de acertijo
  $("riddle-block").style.display = "block";
  $("riddle-emojis").textContent = CONFIG.HINT_EMOJIS;
  $("tries-left").textContent = `Intentos disponibles: ${triesLeft}`;
  $("feedback").textContent = "";

  // Ocultar piezas del modo EMOJI
  $("game-board").style.display = "none";
  $("emoji-palette").style.display = "none";
  $("integrity-hash").textContent = "N/A (modo texto)";

  // Botones
  $("btn-backspace").style.display = "none"; // no aplica
  $("btn-submit").onclick = onSubmitText;
  $("btn-restart").onclick = onRestartText;

  // Ayuda
  $("howto-list").innerHTML = `
    <li>Lee la pista y los emojis.</li>
    <li>Escribe tu respuesta (por ejemplo: <em>${CONFIG.ANSWER_TEXT}</em>).</li>
    <li>Tienes <strong>${CONFIG.MAX_TRIES}</strong> intentos.</li>
  `;
}

function onSubmitText(){
  const user = normalize($("text-answer").value);
  const correct = normalize(CONFIG.ANSWER_TEXT);
  if (!user){ alert("Escribe tu respuesta."); return; }

  if (user === correct){
    $("feedback").textContent = "¡Correcto! 🎉";
    $("text-answer").disabled = true;
    $("btn-submit").disabled = true;
    return;
  }
  triesLeft--;
  if (triesLeft <= 0){
    $("tries-left").textContent = "Intentos disponibles: 0";
    $("feedback").textContent = `Fin del juego. La respuesta era: ${CONFIG.ANSWER_TEXT}`;
    $("text-answer").disabled = true;
    $("btn-submit").disabled = true;
  } else {
    $("tries-left").textContent = `Intentos disponibles: ${triesLeft}`;
    $("feedback").textContent = "Incorrecto. Intenta de nuevo.";
  }
}

function onRestartText(){
  $("text-answer").disabled = false;
  $("btn-submit").disabled = false;
  $("text-answer").value = "";
  $("feedback").textContent = "";
  triesLeft = CONFIG.MAX_TRIES;
  $("tries-left").textContent = `Intentos disponibles: ${triesLeft}`;
}

/* ===========================
   MODO EMOJI (secuencia de 5)
   =========================== */
const CODE_LEN = 5; // Fijo a 5 como pediste
let currentRow = 0, currentGuess = [];

function initEmojiMode(){
  // Validación de longitud
  if (!Array.isArray(CONFIG.SECRET_EMOJI_CODE) || CONFIG.SECRET_EMOJI_CODE.length !== CODE_LEN){
    alert("ERROR: SECRET_EMOJI_CODE debe tener exactamente 5 emojis.");
    return;
  }
  $("integrity-hash").textContent = "calculando…";
  safeSha256(CONFIG.SECRET_EMOJI_CODE.join("")).then(h => $("integrity-hash").textContent = `SHA-256(secret) = ${h}`);

  // Mostrar piezas del modo EMOJI
  $("riddle-block").style.display = "none";
  $("game-board").style.display = "grid";
  $("emoji-palette").style.display = "grid";

  // Título & pista
  $("game-intro").textContent = `${CONFIG.QUESTION} (elige ${CODE_LEN} emojis)`;
  $("riddle-emojis").textContent = ""; // no se usa aquí

  // Render
  renderBoard(CONFIG.MAX_TRIES);
  renderPalette(CONFIG.EMOJI_CHOICES);

  // Botones
  $("btn-backspace").style.display = "inline-block";
  $("btn-submit").onclick = onSubmitEmoji;
  $("btn-backspace").onclick = onBackspaceEmoji;
  $("btn-restart").onclick = onRestartEmoji;

  // Ayuda
  $("howto-list").innerHTML = `
    <li>Debes adivinar la secuencia de <strong>${CODE_LEN}</strong> emojis.</li>
    <li>Tienes <strong>${CONFIG.MAX_TRIES}</strong> intentos.</li>
    <li>✅ correcto y en posición, 🟡 correcto pero en otra posición, ⚪️ no está.</li>
  `;

  currentRow = 0;
  currentGuess = [];
}

function renderBoard(maxRows){
  const el = $("game-board"); el.innerHTML = "";
  // columnas: 5 slots + 1 feedback
  el.style.gridTemplateColumns = "repeat(6, minmax(36px, 1fr))";
  for (let r=0;r<maxRows;r++){
    const row = document.createElement("div");
    row.className = "row"; row.dataset.row = r;
    for (let c=0;c<CODE_LEN;c++){
      const slot = document.createElement("div");
      slot.className = "slot"; slot.dataset.row = r; slot.dataset.col = c;
      row.appendChild(slot);
    }
    const fb = document.createElement("div");
    fb.className = "feedback"; fb.dataset.row = r; fb.textContent = "—";
    row.appendChild(fb);
    el.appendChild(row);
  }
}

function renderPalette(list){
  const el = $("emoji-palette"); el.innerHTML = "";
  const frag = document.createDocumentFragment();
  list.forEach(e=>{
    const b=document.createElement("button");
    b.type="button"; b.className="emoji-btn"; b.textContent=e;
    b.addEventListener("click", ()=> onEmojiClick(e));
    frag.appendChild(b);
  });
  el.appendChild(frag);
}

function onEmojiClick(e){
  if (currentRow >= CONFIG.MAX_TRIES) return;
  if (currentGuess.length >= CODE_LEN) return;
  currentGuess.push(e);
  updateRowUI();
}
function onBackspaceEmoji(){
  currentGuess.pop();
  updateRowUI();
}
function updateRowUI(){
  for (let c=0;c<CODE_LEN;c++){
    const slot = document.querySelector(`.slot[data-row="${currentRow}"][data-col="${c}"]`);
    if (slot) slot.textContent = currentGuess[c] || "";
  }
}
function feedback(guess, secret){
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
function setFeedback(row,{exact,present}){
  const fb = document.querySelector(`.feedback[data-row="${row}"]`);
  if (fb) fb.textContent = "✅".repeat(exact) + "🟡".repeat(present) + "⚪️".repeat(Math.max(0, CODE_LEN - exact - present));
}
function onSubmitEmoji(){
  if (currentGuess.length !== CODE_LEN){ alert(`Debes elegir ${CODE_LEN} emojis.`); return; }
  const res = feedback(currentGuess, CONFIG.SECRET_EMOJI_CODE);
  setFeedback(currentRow, res);
  if (res.exact === CODE_LEN){
    lockEmojiInputs();
    alert(`¡Correcto! 🎉`);
    return;
  }
  currentRow++;
  if (currentRow >= CONFIG.MAX_TRIES){
    lockEmojiInputs();
    alert(`Fin del juego. La respuesta era: ${CONFIG.SECRET_EMOJI_CODE.join(" ")}`);
    return;
  }
  currentGuess = [];
}
function onRestartEmoji(){
  initEmojiMode();
}
function lockEmojiInputs(){
  $("emoji-palette").style.pointerEvents = "none";
  $("btn-backspace").disabled = true;
  $("btn-submit").disabled = true;
}

/* ====== Inicio ====== */
document.addEventListener("DOMContentLoaded", async ()=>{
  setupCommonUI();
  // Hash (decorativo)
  $("integrity-hash").textContent = await safeSha256(JSON.stringify(CONFIG).slice(0,32));

  if (CONFIG.MODE === "TEXT"){
    initTextMode();
  } else {
    // fuerza longitud 5
    if (Array.isArray(CONFIG.SECRET_EMOJI_CODE) && CONFIG.SECRET_EMOJI_CODE.length !== 5){
      alert("SECRET_EMOJI_CODE debe tener 5 emojis. Ajustándolo a los primeros 5.");
      CONFIG.SECRET_EMOJI_CODE = (CONFIG.SECRET_EMOJI_CODE || []).slice(0,5);
    }
    initEmojiMode();
  }
});
