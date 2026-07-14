/* =============================================================================
   ZALAR FARMS CHALLENGE — Moteur de jeu (joueur + animateur)
   Vanilla JS · Supabase (Postgres + Realtime)
   -----------------------------------------------------------------------------
   index.html  → body[data-role="player"]   : interroge l'état (polling léger)
   admin.html  → body[data-role="admin"]     : pilote + écoute le temps réel
   Architecture pensée pour ne PAS saturer la limite gratuite : les téléphones
   n'ouvrent pas 200 connexions permanentes, ils lisent l'état toutes les ~1,2 s.
   ============================================================================= */

(function () {
  "use strict";

  const CONFIG = {
    basePoints: 500,
    speedBonus: 500,
    defaultDuration: 30,
    topN: 10,
    playVideoOnPlayers: true, // true = la vidéo joue sur CHAQUE téléphone (+ au projecteur)
    pollMs: 1200,
  };

  const ROLE = document.body.dataset.role;
  const QUESTIONS = window.QUESTIONS || [];
  const VIDEOS = window.VIDEOS || { intro: "", outro: "", transitions: [] };
  const GRADS = ["gb-blue", "gb-violet", "gb-teal", "gb-gold"]; // badge par index de réponse

  // ------------------------------------------------------------- Setup -------
  if (!window.__SB_CONFIGURED__) {
    const b = document.createElement("div");
    b.className = "warn-banner";
    b.textContent = "⚠️ Supabase non configuré — ouvre supabase-config.js et remplace les 2 clés.";
    document.body.appendChild(b);
  }
  const sb = window.__sb;

  // Horloge serveur (aligne les 200 timers)
  let serverOffset = 0;
  async function syncClock() {
    try {
      const { data } = await sb.rpc("server_now");
      if (data) serverOffset = new Date(data).getTime() - Date.now();
    } catch (e) { /* garde l'horloge locale */ }
  }
  const now = () => Date.now() + serverOffset;

  // ------------------------------------------------------------- Helpers -----
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const durationOf = (i) => ((QUESTIONS[i] && QUESTIONS[i].duration) || CONFIG.defaultDuration) * 1000;
  const showScreen = (id) => $$(".screen").forEach((s) => s.classList.toggle("is-active", s.id === id));
  function initials(name) {
    const w = String(name).trim().split(/\s+/).filter(Boolean);
    if (w.length >= 2) return (w[0][0] + w[1][0]).toUpperCase();
    return (w[0] || "?").slice(0, 2).toUpperCase();
  }

  async function fetchGame() {
    const { data } = await sb.from("game").select("*").eq("id", 1).single();
    return data;
  }
  async function updateGame(patch) {
    patch.updated_at = new Date(now()).toISOString();
    await sb.from("game").update(patch).eq("id", 1);
  }

  if (ROLE === "admin") initAdmin();
  else initPlayer();

  // ===========================================================================
  //  JOUEUR
  // ===========================================================================
  function initPlayer() {
    const state = {
      pid: localStorage.getItem("zfc_pid"),
      name: localStorage.getItem("zfc_name") || "",
      ini: localStorage.getItem("zfc_ini") || "",
      round: -1, qIndex: -2, phase: null,
      answeredKey: null, lastPoints: 0, lastCorrect: false, lastAnswered: false,
      raf: null, poll: null, lastSig: "",
    };
    syncClock();

    const nameInput = $("#name-input");
    const joinBtn = $("#join-btn");
    const refreshMono = () => {
      const v = nameInput.value.trim();
      $("#id-initials").textContent = initials(v || "Toi");
      $("#id-name").textContent = v ? v.slice(0, 20) : "Toi";
    };
    nameInput.addEventListener("input", refreshMono);
    nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") doJoin(); });
    joinBtn.addEventListener("click", doJoin);
    refreshMono();

    const leaveBtn = $("#leave-btn");
    if (leaveBtn) leaveBtn.addEventListener("click", () => {
      localStorage.removeItem("zfc_pid");
      localStorage.removeItem("zfc_name");
      localStorage.removeItem("zfc_ini");
      location.reload();
    });

    async function doJoin() {
      const name = nameInput.value.trim().slice(0, 20);
      if (!name) { nameInput.focus(); nameInput.classList.add("shake"); setTimeout(() => nameInput.classList.remove("shake"), 400); return; }
      joinBtn.disabled = true;
      const ini = initials(name);
      const { data, error } = await sb.from("players").insert({ name, initials: ini }).select("id").single();
      if (error || !data) { joinBtn.disabled = false; joinBtn.textContent = "Réessayer"; return; }
      state.pid = data.id; state.name = name; state.ini = ini;
      localStorage.setItem("zfc_pid", state.pid);
      localStorage.setItem("zfc_name", name);
      localStorage.setItem("zfc_ini", ini);
      startPolling(state);
    }

    if (state.pid && state.name) { if (!state.ini) state.ini = initials(state.name); startPolling(state); }
    else showScreen("screen-join");
  }

  function startPolling(state) {
    const tick = async () => {
      const g = await fetchGame();
      if (!g) return;
      applyGame(state, g);
      if (g.phase === "lobby") {
        const { count } = await sb.from("players").select("*", { count: "exact", head: true });
        const el = $("#lobby-count"); if (el && typeof count === "number") el.textContent = count;
      }
    };
    tick();
    clearInterval(state.poll);
    state.poll = setInterval(tick, CONFIG.pollMs);
  }

  function applyGame(state, g) {
    if (g.round !== state.round) { state.round = g.round; state.answeredKey = null; }
    const sig = g.phase + "|" + g.q_index + "|" + g.round + "|" + (g.started_at || "");
    if (sig === state.lastSig) return;
    state.lastSig = sig; state.phase = g.phase; state.qIndex = g.q_index;
    cancelAnimationFrame(state.raf);
    switch (g.phase) {
      case "question": return playerQuestion(state, g);
      case "reveal": return playerReveal(state, g);
      case "video": return playerVideo(state, g);
      case "podium": return playerPodium(state, g);
      default:
        showScreen("screen-lobby");
        $("#lobby-initials").textContent = state.ini;
        $("#lobby-name").textContent = state.name;
        if (CONFIG.playVideoOnPlayers) preloadVideo(VIDEOS.intro); // précharge l'intro en salle d'attente
    }
  }

  function playerQuestion(state, g) {
    const q = QUESTIONS[g.q_index]; if (!q) return;
    hideVideoLayer();
    showScreen("screen-question");
    $("#q-counter").textContent = `Question ${g.q_index + 1} / ${QUESTIONS.length}`;
    $("#q-text").textContent = q.question;
    // Précharge l'animation qui suivra cette question (démarrage instantané)
    if (CONFIG.playVideoOnPlayers) {
      const nextVid = g.q_index >= QUESTIONS.length - 1
        ? (VIDEOS.outro || "")
        : (VIDEOS.transitions[g.q_index] || VIDEOS.transitions[VIDEOS.transitions.length - 1] || "");
      preloadVideo(nextVid);
    }
    const grid = $("#q-answers");
    grid.classList.remove("locked");
    grid.innerHTML = q.answers.map((a, k) =>
      `<button class="opt" data-k="${k}"><span class="badge ${GRADS[k]}">${"ABCD"[k]}</span><span class="lab">${esc(a)}</span></button>`).join("");

    const key = g.round + "_" + g.q_index;
    if (state.answeredKey === key) { grid.classList.add("locked"); markPicked(grid, state.lastPickedKey); }

    grid.onclick = (e) => {
      const btn = e.target.closest(".opt");
      if (!btn || grid.classList.contains("locked")) return;
      submitAnswer(state, g, Number(btn.dataset.k), grid);
    };

    const dur = durationOf(g.q_index);
    const ring = $("#ring");
    const loop = () => {
      const elapsed = now() - new Date(g.started_at).getTime();
      const frac = clamp(1 - elapsed / dur, 0, 1);
      updateRing(ring, frac, dur);
      if (frac <= 0) { grid.classList.add("locked"); return; }
      state.raf = requestAnimationFrame(loop);
    };
    loop();
  }
  function markPicked(grid, k) { const b = grid.querySelector(`.opt[data-k="${k}"]`); if (b) b.classList.add("is-picked"); }

  async function submitAnswer(state, g, k, grid) {
    const q = QUESTIONS[g.q_index];
    const dur = durationOf(g.q_index);
    const elapsed = clamp(now() - new Date(g.started_at).getTime(), 0, dur);
    const correct = k === q.correct;
    const frac = clamp(1 - elapsed / dur, 0, 1);
    const points = correct ? Math.round(CONFIG.basePoints + CONFIG.speedBonus * frac) : 0;

    grid.classList.add("locked"); markPicked(grid, k);
    state.answeredKey = g.round + "_" + g.q_index; state.lastPickedKey = k;
    state.lastPoints = points; state.lastCorrect = correct; state.lastAnswered = true;

    try {
      await sb.rpc("submit_answer", {
        p_player: state.pid, p_round: g.round, p_q: g.q_index, p_choice: k, p_correct: correct, p_points: points,
      });
    } catch (e) { /* réseau : le score sera resynchronisé à la révélation */ }
  }

  async function playerReveal(state, g) {
    hideVideoLayer();
    showScreen("screen-result");
    const answered = state.answeredKey === g.round + "_" + g.q_index;
    const good = answered && state.lastCorrect;
    const plus = $("#result-plus");
    plus.textContent = answered ? `+${state.lastPoints}` : "+0";
    plus.className = "rplus" + (good ? "" : " zero");
    $("#result-title").textContent = good ? "Bonne réponse" : (answered ? "Raté…" : "Trop tard");
    try {
      const { data } = await sb.from("players").select("score").eq("id", state.pid).single();
      $("#result-score").textContent = (data ? data.score : 0).toLocaleString("fr-FR");
    } catch (e) {}
  }

  function playerVideo(state, g) {
    if (CONFIG.playVideoOnPlayers && g.video_src) { playVideoLayer(g.video_src, { loop: true }); return; }
    hideVideoLayer();
    showScreen("screen-watch");
  }

  async function playerPodium(state, g) {
    hideVideoLayer();
    showScreen("screen-podium");
    const { data } = await sb.from("players").select("id,name,initials,score").order("score", { ascending: false }).limit(50);
    const list = (data || []).map((p) => ({ id: p.id, name: p.name, ini: p.initials || initials(p.name), score: p.score }));
    renderPodium($("#player-podium"), list.slice(0, 3));
    const me = list.findIndex((p) => p.id === state.pid);
    $("#podium-me").textContent = me >= 0 ? `Tu es ${me + 1}${me === 0 ? "ᵉʳ" : "ᵉ"} sur ${list.length}` : "Merci d'avoir joué";
  }

  // ===========================================================================
  //  ANIMATEUR
  // ===========================================================================
  async function initAdmin() {
    await syncClock();
    let players = [];
    let curGame = null;
    let timerRaf = null, ansPoll = null;
    const controls = $("#admin-controls");

    const joinUrl = new URL("index.html", location.href).href;
    $("#join-url").textContent = joinUrl.replace(/^https?:\/\//, "");
    makeQR($("#qr-canvas"), joinUrl);

    async function loadPlayers() {
      const { data } = await sb.from("players").select("id,name,initials,score").order("score", { ascending: false });
      players = (data || []).map((p) => ({ id: p.id, name: p.name, ini: p.initials || initials(p.name), score: p.score }));
    }
    function refreshPlayersUI() {
      const grid = $("#admin-players");
      if (grid) grid.innerHTML = players.map((p) =>
        `<span class="pchip"><span class="badge ${GRADS[p.name.length % 4]}">${esc(p.ini)}</span>${esc(p.name)}</span>`).join("");
      const c = $("#admin-player-count"); if (c) c.textContent = players.length;
      if (curGame && curGame.phase === "reveal") renderLeaderboard($("#reveal-lb"), players);
      if (curGame && curGame.phase === "podium") { renderPodium($("#admin-podium"), players.slice(0, 3)); renderLeaderboard($("#admin-final-lb"), players); }
    }

    sb.channel("zfc-game").on("postgres_changes", { event: "*", schema: "public", table: "game" },
      (p) => { renderAdmin(p.new); }).subscribe();
    sb.channel("zfc-players").on("postgres_changes", { event: "*", schema: "public", table: "players" },
      async () => { await loadPlayers(); refreshPlayersUI(); }).subscribe();

    await loadPlayers();
    curGame = await fetchGame();
    renderAdmin(curGame);
    refreshPlayersUI();
    $("#start-btn").addEventListener("click", startGame);

    function renderAdmin(g) {
      if (!g) g = { phase: "lobby", q_index: -1, round: 0 };
      curGame = g;
      cancelAnimationFrame(timerRaf); clearInterval(ansPoll);
      switch (g.phase) {
        case "video": return adminVideo(g);
        case "question": return adminQuestion(g);
        case "reveal": return adminReveal(g);
        case "podium": return adminPodium();
        default:
          hideVideoLayer(); showScreen("screen-admin-lobby"); controls.innerHTML = "";
      }
    }

    function adminQuestion(g) {
      hideVideoLayer();
      const q = QUESTIONS[g.q_index];
      showScreen("screen-admin-question");
      $("#admin-q-counter").textContent = `Question ${g.q_index + 1} / ${QUESTIONS.length}`;
      $("#admin-q-text").textContent = q.question;
      $("#admin-q-answers").innerHTML = q.answers.map((a, k) =>
        `<div class="acard"><span class="badge ${GRADS[k]}">${"ABCD"[k]}</span>${esc(a)}</div>`).join("");
      controls.innerHTML = `<button class="btn gold" id="reveal-btn">Révéler la réponse</button>
                            <button class="btn ghost sm" id="finish-btn">Terminer</button>`;
      $("#reveal-btn").onclick = () => updateGame({ phase: "reveal", q_index: g.q_index });
      $("#finish-btn").onclick = () => toVideo("outro", VIDEOS.outro || "", g.q_index);

      const dur = durationOf(g.q_index);
      const t = $("#admin-timer"), prog = $("#admin-prog");
      const loop = () => {
        const elapsed = now() - new Date(g.started_at).getTime();
        const remain = Math.max(0, dur - elapsed);
        t.textContent = Math.ceil(remain / 1000);
        t.classList.toggle("low", remain <= 5000);
        prog.style.width = (clamp(1 - elapsed / dur, 0, 1) * 100) + "%";
        if (remain <= 0) { updateGame({ phase: "reveal", q_index: g.q_index }); return; }
        timerRaf = requestAnimationFrame(loop);
      };
      loop();

      const countAns = async () => {
        const { count } = await sb.from("answers").select("*", { count: "exact", head: true })
          .eq("round", g.round).eq("q_index", g.q_index);
        const el = $("#answered-count");
        if (el) el.textContent = `${count || 0} / ${players.length} ont répondu`;
      };
      countAns(); ansPoll = setInterval(countAns, 1200);
    }

    async function adminReveal(g) {
      hideVideoLayer();
      const q = QUESTIONS[g.q_index];
      showScreen("screen-admin-reveal");
      $("#reveal-q-text").textContent = q.question;
      const { data } = await sb.from("answers").select("choice").eq("round", g.round).eq("q_index", g.q_index);
      const counts = [0, 0, 0, 0]; let total = 0;
      (data || []).forEach((a) => { if (typeof a.choice === "number" && a.choice >= 0 && a.choice < 4) { counts[a.choice]++; total++; } });
      $("#reveal-dist").innerHTML = q.answers.map((a, k) => {
        const pct = total ? Math.round((counts[k] / total) * 100) : 0;
        return `<div class="drow ${k === q.correct ? "win" : ""}"><span class="badge ${GRADS[k]}">${"ABCD"[k]}</span>
                  <div class="dbar"><i data-w="${pct}"></i></div><span class="pct">${pct}%</span></div>`;
      }).join("");
      requestAnimationFrame(() => $$("#reveal-dist .dbar i").forEach((el) => { el.style.width = el.dataset.w + "%"; }));
      $("#reveal-correct").innerHTML = `Bonne réponse : <b>${"ABCD"[q.correct]} · ${esc(q.answers[q.correct])}</b>`;
      renderLeaderboard($("#reveal-lb"), players);

      const isLast = g.q_index >= QUESTIONS.length - 1;
      controls.innerHTML = isLast
        ? `<button class="btn gold" id="next-btn">Voir le podium</button>`
        : `<button class="btn blue" id="next-btn">Question suivante</button>
           <button class="btn ghost sm" id="finish-btn">Terminer</button>`;
      $("#next-btn").onclick = () => {
        if (isLast) toVideo("outro", VIDEOS.outro || "", g.q_index);
        else toVideo("transition", VIDEOS.transitions[g.q_index] || VIDEOS.transitions[VIDEOS.transitions.length - 1] || "", g.q_index);
      };
      const fb = $("#finish-btn"); if (fb) fb.onclick = () => toVideo("outro", VIDEOS.outro || "", g.q_index);
    }

    function adminVideo(g) {
      showScreen("screen-admin-video");
      const advance = () => {
        if (g.video_kind === "intro") return showQuestion(0);
        if (g.video_kind === "outro") return updateGame({ phase: "podium" });
        return showQuestion((g.q_index || 0) + 1);
      };
      playVideoLayer(g.video_src, { loop: true }); // boucle jusqu'au clic de l'animateur
      const label = g.video_kind === "intro" ? "Lancer la 1ʳᵉ question"
        : g.video_kind === "outro" ? "Voir le podium" : "Lancer la question suivante";
      controls.innerHTML = `<button class="btn blue" id="next-video-btn">${label}</button>`;
      $("#next-video-btn").onclick = advance;
    }

    function adminPodium() {
      hideVideoLayer();
      showScreen("screen-admin-podium");
      renderPodium($("#admin-podium"), players.slice(0, 3));
      renderLeaderboard($("#admin-final-lb"), players);
      controls.innerHTML = `<button class="btn ghost" id="replay-btn">Rejouer (réinitialiser)</button>`;
      $("#replay-btn").onclick = resetGame;
    }

    function toVideo(kind, src, qIndex) { updateGame({ phase: "video", video_kind: kind, video_src: src, q_index: qIndex }); }
    function showQuestion(i) {
      if (i >= QUESTIONS.length) return toVideo("outro", VIDEOS.outro || "", i - 1);
      updateGame({ phase: "question", q_index: i, started_at: new Date(now()).toISOString() });
    }
    async function startGame() {
      await sb.rpc("reset_scores");
      const g = await fetchGame();
      await updateGame({ phase: "video", video_kind: "intro", video_src: VIDEOS.intro || "", q_index: -1, round: (g.round || 0) + 1, started_at: null });
    }
    async function resetGame() {
      await sb.rpc("reset_scores");
      await updateGame({ phase: "lobby", round: 0, q_index: -1, started_at: null, video_kind: null, video_src: null });
    }
  }

  // ===========================================================================
  //  PARTAGÉ
  // ===========================================================================
  function updateRing(ringEl, frac, dur) {
    if (!ringEl) return;
    const c = ringEl.querySelector(".fg"), n = ringEl.querySelector(".n");
    const R = 26, C = 2 * Math.PI * R;
    c.style.strokeDasharray = C; c.style.strokeDashoffset = C * (1 - frac);
    const secs = Math.ceil((frac * dur) / 1000);
    n.textContent = secs;
    ringEl.classList.toggle("low", secs <= 5);
  }

  function playVideoLayer(src, opts) {
    opts = opts || {};
    const layer = $("#video-layer"), video = $("#video-el"), fb = $("#video-fallback");
    layer.classList.add("is-active");
    if (!src) { fb.classList.add("is-active"); return; }
    fb.classList.remove("is-active");
    video.style.display = "block"; video.src = src; video.muted = true; video.playsInline = true; video.loop = !!opts.loop;
    const tryPlay = () => { const p = video.play(); if (p) p.catch(() => {}); };
    tryPlay();
    video.oncanplay = tryPlay;   // relance dès que la vidéo est prête (autoplay fiable)
    video.onloadeddata = tryPlay;
    video.onended = opts.loop ? null : () => { if (opts.onEnded) opts.onEnded(); };
    video.onerror = () => { video.style.display = "none"; fb.classList.add("is-active"); };
  }

  // Précharge la prochaine vidéo (pendant la question) pour un démarrage instantané
  let _preloadEl = null;
  function preloadVideo(src) {
    if (!src) return;
    if (!_preloadEl) {
      _preloadEl = document.createElement("video");
      _preloadEl.style.display = "none"; _preloadEl.muted = true; _preloadEl.preload = "auto";
      document.body.appendChild(_preloadEl);
    }
    if (_preloadEl.src !== src) { _preloadEl.src = src; _preloadEl.load(); }
  }
  function hideVideoLayer() {
    const layer = $("#video-layer"), video = $("#video-el"), fb = $("#video-fallback");
    if (layer) layer.classList.remove("is-active");
    if (fb) fb.classList.remove("is-active");
    if (video) { video.pause(); video.removeAttribute("src"); video.onended = null; video.onerror = null; video.oncanplay = null; video.onloadeddata = null; video.style.display = "block"; }
  }

  function renderLeaderboard(container, players) {
    if (!container) return;
    const top = players.slice(0, CONFIG.topN);
    container.innerHTML = top.length ? top.map((p, i) =>
      `<div class="lrow ${i === 0 ? "first" : ""}"><span class="badge">${i + 1}</span>
         <span class="lname"><span class="mn">${esc(p.ini)}</span>${esc(p.name)}</span>
         <span class="lsc">${p.score.toLocaleString("fr-FR")}</span></div>`).join("")
      : `<p class="muted txt-c">Aucun score pour l'instant.</p>`;
  }

  function renderPodium(container, top3) {
    if (!container) return;
    const slot = (p, rank) => p
      ? `<div class="pod p${rank}"><span class="badge ${rank === 1 ? "" : GRADS[rank]}">${esc(p.ini)}</span>
           <div class="pn">${esc(p.name)}</div><div class="ps">${p.score.toLocaleString("fr-FR")} pts</div>
           <div class="base">${rank}</div></div>` : "";
    container.innerHTML = slot(top3[1], 2) + slot(top3[0], 1) + slot(top3[2], 3);
  }

  // QR (lib locale qrcode-generator, rendu image ; fallback URL)
  function makeQR(elem, url) {
    if (!elem) return;
    try {
      if (typeof window.qrcode === "function") {
        const qr = window.qrcode(0, "M"); qr.addData(url); qr.make();
        const img = new Image(); img.src = qr.createDataURL(6, 4);
        img.width = 240; img.height = 240; img.alt = "QR code"; img.style.display = "block";
        elem.replaceWith(img); return;
      }
    } catch (e) {}
    const d = document.createElement("div"); d.className = "url"; d.style.color = "#04122e"; d.textContent = url;
    elem.replaceWith(d);
  }
})();
