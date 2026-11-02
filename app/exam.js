"use strict";
/* ================= ΔΙΑΓΩΝΙΣΜΑΤΑ & ΦΥΛΛΟ ΑΠΑΝΤΗΣΕΩΝ ================= */
const OFFICIAL_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];
function officialList(y) { return Q.filter(q => q.kind === 'exam' && q.year === y).sort((a, b) => a.num - b.num); }
function mockDef(key) {
  if (key.startsWith('off-')) { const y = +key.slice(4); const l = officialList(y); return { key, title: `Εξετάσεις ${y}`, list: l, minutes: 150, official: true, nums: l.map(q => q.num), pts: l.map(q => q.points || 2) }; }
  if (key === 'gen-full') return genMock(['lang', 'math'], 150, 'Διαγώνισμα εξάσκησης');
  if (key === 'gen-lang') return genMock(['lang'], 75, 'Μισό διαγώνισμα: Γλώσσα');
  if (key === 'gen-math') return genMock(['math'], 75, 'Μισό διαγώνισμα: Μαθηματικά');
  return null;
}
/* Νέο διαγώνισμα με τη δομή 2025–2026: ανά μάθημα 10 ερωτήσεις Α΄ ομάδας (4 επιλογές, 2 μον.) + 10 Β΄ ομάδας (5 επιλογές, 3 μον.).
   Προτιμά ερωτήσεις που δεν έχει δει, εκτός από τα επίσημα 2025/2026 (κρατιούνται για πλήρη διαγωνίσματα). */
function genMock(subjects, minutes, title) {
  const used = new Set(); const list = [], pts = [];
  const avoid = q => q.kind === 'exam' && q.year >= 2025;
  for (const sj of subjects) {
    let A = [], B = [];
    if (sj === 'lang') {
      // δύο κείμενα με αρκετές ερωτήσεις, όπως στην εξέταση
      const byP = {}; Q.filter(q => q.subject === 'lang' && q.passage && !avoid(q)).forEach(q => (byP[q.passage] = byP[q.passage] || []).push(q));
      const ps = orderFresh(Object.values(byP).filter(a => a.length >= 5).map(a => a[0])).map(q => q.passage).slice(0, 2);
      ps.forEach(p => { const qs = orderFresh(byP[p]); A.push(...qs.filter(q => q.options.length === 4).slice(0, 5)); B.push(...qs.filter(q => q.options.length === 5).slice(0, 5)); });
    }
    const pool = Q.filter(q => q.subject === sj && !avoid(q));
    const fill = (arr, nopt, n) => { for (const q of orderFresh(pool.filter(q => q.options.length === nopt))) { if (arr.length >= n) break; if (!arr.includes(q)) arr.push(q); } };
    A = A.slice(0, 10); fill(A, 4, 10);
    B = B.slice(0, 10); fill(B, 5, 10); fill(B, 4, 10); // αν δεν φτάνουν οι 5 επιλογών
    const ord = arr => arr.sort((a, b) => (a.passage || 'zz').localeCompare(b.passage || 'zz'));
    ord(A).forEach(q => { if (!used.has(q.id)) { used.add(q.id); list.push(q); pts.push(2); } });
    ord(B).forEach(q => { if (!used.has(q.id)) { used.add(q.id); list.push(q); pts.push(3); } });
  }
  const off = subjects.length === 1 && subjects[0] === 'math' ? 20 : 0;
  return { key: 'gen', title, list, minutes, official: false, nums: list.map((_, i) => i + 1 + off), pts };
}

VIEWS.mock = function () {
  IDB.get('exam-run').then(saved => {
    if (CUR !== 'mock') return;
    const hist = MOCKS.slice(0, 12);
    const best = y => { const m = MOCKS.filter(x => x.key === 'off-' + y); return m.length ? Math.max(...m.map(x => x.pct)) : null; };
    render(`<h1>Διαγώνισμα</h1><p class="sub">Όπως την ημέρα της εξέτασης: χωρίς βοήθεια, με χρόνο, και αν θέλεις με το <b>φύλλο απαντήσεων</b>.</p>
      ${saved && saved.user === USER.email && !saved.done ? `<div class="card notecard"><b>Έχεις ένα διαγώνισμα στη μέση:</b> ${esc(saved.title)} (${Object.keys(saved.ans).length}/${saved.qids.length} απαντήσεις)<div class="row mt"><button class="btn sm" onclick="resumeMock()">Συνέχεια</button><button class="btn sm ghost" onclick="IDB.put('exam-run',null).then(()=>route())">Διαγραφή</button></div></div>` : ''}
      <div class="grid g3 mt">
        <button class="tile" onclick="sheetIntro()"><span class="ic">📄</span><b>Μάθε το φύλλο απαντήσεων</b><span class="small mute">Πώς γεμίζεις κύκλους και κωδικό</span></button>
        <button class="tile" onclick="startMock('gen-full')"><span class="ic">⏱️</span><b>Νέο πλήρες διαγώνισμα</b><span class="small mute">40 ερωτήσεις · 150′ · δομή 2025</span></button>
        <button class="tile" onclick="startMock('gen-lang')"><span class="ic">📖</span><b>Μισό: Γλώσσα</b><span class="small mute">20 ερωτήσεις · 75′</span></button>
        <button class="tile" onclick="startMock('gen-math')"><span class="ic">🔢</span><b>Μισό: Μαθηματικά</b><span class="small mute">20 ερωτήσεις · 75′</span></button>
      </div>
      <h2>Επίσημα θέματα</h2><div class="grid g4">${OFFICIAL_YEARS.map(y => { const b = best(y); const n = officialList(y).length; return `<button class="tile" onclick="startMock('off-${y}')"><b>${y}</b><span class="small mute">${n} ερωτήσεις${y <= 2024 ? ' · παλιά δομή' : ''}</span>${b !== null ? `<span class="small"><b>καλύτερο ${b}%</b></span>` : ''}</button>`; }).join('')}</div>
      <div class="small mt">📄 Τα πρωτότυπα σε PDF: <a href="#" onclick="event.preventDefault();LIBF='exam';go('library')">Αρχείο θεμάτων</a></div>
      <p class="small mute">2025 και 2026 έχουν τη δομή που ισχύει και για το 2027. Τα 2020–2024 είχαν 50 ερωτήσεις των 2 μονάδων.</p>
      ${hist.length ? `<h2>Τα διαγωνίσματά μου</h2><div class="card">${hist.map(m => `<div class="list-item"><span class="small mute" style="width:70px">${fmtDate(m.ts, { day: 'numeric', month: 'short' })}</span><span class="grow"><b>${esc(m.title)}</b><div class="small mute">${m.mode === 'sheet' ? '📄 με φύλλο · ' : ''}${fmtMin(m.sec)} · Γλ. ${m.langPct ?? '—'}% · Μαθ. ${m.mathPct ?? '—'}%</div></span><b>${m.score}/${m.max}</b><button class="btn sm ghost" onclick="showMockResult('${m.id}')">Δες</button></div>`).join('')}</div>` : ''}`);
  });
};

/* ---------- Εκκίνηση ---------- */
let EX = null;
function startMock(key) {
  const d = mockDef(key); if (!d || !d.list.length) { toast('Δεν βρέθηκαν ερωτήσεις'); return; }
  modal(`<h3 style="margin-top:0">${esc(d.title)}</h3><p class="small">${d.list.length} ερωτήσεις · ${d.minutes}′ · μέγιστο ${d.pts.reduce((a, b) => a + b, 0)} μονάδες. Δεν βλέπεις τις λύσεις ως το τέλος.</p>
    <div class="lab">Πώς θα απαντάς;</div>
    <div class="opts"><button class="opt" onclick="beginMock('${key}','sheet')"><span class="k">📄</span><span><b>Με φύλλο απαντήσεων</b><br><span class="small mute">Διαβάζεις την ερώτηση και γεμίζεις τον κύκλο στο φύλλο, όπως στην εξέταση.</span></span></button>
    <button class="opt" onclick="beginMock('${key}','normal')"><span class="k">👆</span><span><b>Απλό</b><br><span class="small mute">Πατάς πάνω στην απάντηση.</span></span></button></div>
    <label class="row mt small"><input type="checkbox" id="mkTimer" checked> Με χρονόμετρο ${d.minutes}′</label>
    <div class="row mt" style="justify-content:flex-end"><button class="btn ghost" onclick="closeModal()">Άκυρο</button></div>`);
  PENDING_MOCK = d;
}
let PENDING_MOCK = null;
function beginMock(key, mode) {
  const d = PENDING_MOCK || mockDef(key); PENDING_MOCK = null;
  const timed = $('#mkTimer') ? $('#mkTimer').checked : true; closeModal();
  EX = { user: USER.email, key: d.key === 'gen' ? key : d.key, title: d.title, qids: d.list.map(q => q.id), nums: d.nums, pts: d.pts, minutes: d.minutes, timed, mode,
    ans: {}, flags: {}, i: 0, start: Date.now(), elapsed: 0, code: mode === 'sheet' ? { want: practiceCode(), digits: Array(6).fill(''), bubs: Array(6).fill(null) } : null, done: false };
  runMock();
}
function resumeMock() { IDB.get('exam-run').then(s => { if (!s) return; EX = s; EX.start = Date.now(); runMock(); }); }
function practiceCode() { return String(100000 + (Math.random() * 900000 | 0)); }
function saveRun() { if (EX && !EX.done) IDB.put('exam-run', Object.assign({}, EX, { elapsed: EX.elapsed + (Date.now() - EX.start) / 1000, start: 0 })); }
function exElapsed() { return EX.elapsed + (Date.now() - EX.start) / 1000; }
function runMock() {
  CUR = 'exam'; history.replaceState(null, '', '#exam'); updateTabs();
  LEAVE_GUARD = v => { if (!EX || EX.done) return true; saveRun(); stopTimers(); toast('Το διαγώνισμα αποθηκεύτηκε· μπορείς να το συνεχίσεις αργότερα.'); EX = null; return true; };
  stopTimers(); TIMERS.push(setInterval(examTick, 1000)); renderExam();
}
VIEWS.exam = function () { if (!EX || EX.done) { go('mock'); return; } renderExam(); };
function examTick() {
  if (!EX || EX.done) return; const el = $('#exT'); const used = exElapsed();
  if (EX.timed) { const left = EX.minutes * 60 - used; if (el) { el.textContent = fmtClock(Math.max(0, left)); el.classList.toggle('low', left < 600); } if (left <= 0) { toast('Τέλος χρόνου!'); finishMock(); } }
  else if (el) el.textContent = fmtClock(used);
  if (Math.round(used) % 20 === 0) saveRun();
}
function fmtClock(s) { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' : '') + z2(m) + ':' + z2(x); }

/* ---------- Οθόνη εξέτασης ---------- */
function renderExam() {
  const i = EX.i, q = QBY[EX.qids[i]], n = EX.qids.length, a = EX.ans[q.id] || '';
  const answered = EX.qids.filter(id => EX.ans[id]).length;
  const optsH = EX.mode === 'sheet'
    ? `<div class="opts">${q.options.map(o => `<div class="opt ro"><span class="k">${o.k}</span><span>${esc(o.t)}</span></div>`).join('')}</div>
       <div class="small mute mt">Γέμισε τον κύκλο στη γραμμή <b>${z2(EX.nums[i])}</b> του φύλλου:</div><div class="sheet" style="padding:8px 10px;margin-top:6px">${sheetRow(i, false)}</div>`
    : `<div class="opts">${q.options.map(o => `<button class="opt ${a === o.k ? 'sel' : ''}" onclick="exPick('${o.k}')"><span class="k">${o.k}</span><span>${esc(o.t)}</span></button>`).join('')}</div>`;
  render(`<div class="row" style="justify-content:space-between;align-items:center"><button class="btn ghost sm" onclick="go('mock')">✕ Παύση</button><b class="small">${esc(EX.title)}</b><span class="timer" id="exT">--:--</span></div>
    <div class="bar mt"><i style="width:${pct(answered, n)}%"></i></div>
    <div class="qwrap ${q.passage ? 'withp' : ''} mt">${q.passage ? passageHTML(q.passage, true) : ''}
      <div class="card"><div class="row" style="justify-content:space-between"><b>Ερώτηση ${z2(EX.nums[i])}</b><span class="tag">${EX.pts[i]} μον.</span></div>
        <div class="stem mt">${esc(q.stem)}</div>${figHTML(q.figure)}${optsH}
        <div class="row mt" style="justify-content:space-between"><button class="btn ghost sm" ${i ? '' : 'disabled'} onclick="exGo(${i - 1})">← Προηγ.</button>
          <button class="btn ghost sm" onclick="exFlag()">${EX.flags[q.id] ? '🚩 Σημαδεμένη' : '🏳️ Σημάδεψε για μετά'}</button>
          ${i + 1 < n ? `<button class="btn sm" onclick="exGo(${i + 1})">Επόμ. →</button>` : `<button class="btn sm" onclick="exReview()">Έλεγχος & παράδοση</button>`}</div></div></div>
    <div class="card mt"><div class="lab">Όλες οι ερωτήσεις ${EX.mode === 'sheet' ? '' : '(γκρι: χωρίς απάντηση)'}</div><div class="qnav">${EX.qids.map((id, k) => `<button class="${k === i ? 'cur' : ''} ${EX.ans[id] ? 'done' : ''} ${EX.flags[id] ? 'flag' : ''}" onclick="exGo(${k})">${EX.nums[k]}</button>`).join('')}</div>
      <div class="row mt">${EX.mode === 'sheet' ? `<button class="btn soft sm" onclick="exReview()">📄 Όλο το φύλλο</button>` : ''}<button class="btn sm" onclick="exReview()">Παράδοση</button></div></div>`);
  examTick();
}
function exGo(k) { EX.i = k; renderExam(); saveRun(); window.scrollTo(0, 0); }
function exFlag() { const id = EX.qids[EX.i]; EX.flags[id] = !EX.flags[id]; renderExam(); }
function exPick(k) { const id = EX.qids[EX.i]; EX.ans[id] = EX.ans[id] === k ? '' : k; if (!EX.ans[id]) delete EX.ans[id]; saveRun(); renderExam(); }
/* Στο φύλλο: κάθε κύκλος γεμίζει/αδειάζει χωριστά — αν γεμίσει δύο, η ερώτηση μετράει 0 (όπως στην πραγματικότητα). */
function bubTap(i, k) {
  const id = EX.qids[i]; let s = EX.ans[id] || '';
  s = s.includes(k) ? s.replace(k, '') : [...(s + k)].sort((a, b) => 'ΑΒΓΔΕ'.indexOf(a) - 'ΑΒΓΔΕ'.indexOf(b)).join('');
  if (s) EX.ans[id] = s; else delete EX.ans[id];
  if (s.length > 1) toast('Προσοχή: δύο κύκλοι στην ίδια ερώτηση = 0 μονάδες!');
  saveRun();
  if ($('#fullSheet')) $('#fullSheet').innerHTML = sheetHTML(EX, { edit: true }); else renderExam();
}

/* ---------- Φύλλο απαντήσεων ---------- */
const LETTERS = ['Α', 'Β', 'Γ', 'Δ', 'Ε'];
function sheetRow(i, ro, data, marks) {
  data = data || EX; const id = data.qids[i]; const q = QBY[id]; const a = (data.ans || {})[id] || '';
  const nopt = q ? q.options.length : 4; const color = i % 2 ? 'pink' : 'blue';
  return `<div class="srow ${color} ${a.length > 1 ? 'dbl' : ''}"><span class="n">${z2(data.nums[i])}</span>${LETTERS.slice(0, Math.max(4, nopt)).map((k, j) => {
    const exists = j < nopt; const f = a.includes(k);
    let mk = ''; if (marks && q) { if (k === q.answer) mk = 'okk'; else if (f) mk = 'wr'; }
    return exists ? `<button class="bub ${f ? 'f' : ''} ${mk}" ${ro ? 'disabled' : `onclick="bubTap(${i},'${k}')"`}>${k}</button>` : '<span style="width:32px"></span>';
  }).join('')}${a.length > 1 ? '<span class="small" style="color:var(--bad)">0 μον.</span>' : ''}</div>`;
}
function sheetHTML(data, opt = {}) {
  const idx = data.qids.map((_, i) => i);
  const col = (sj, label) => { const ii = idx.filter(i => QBY[data.qids[i]] && QBY[data.qids[i]].subject === sj); if (!ii.length) return '';
    let lastP = null; return `<div class="sheet-col"><h4>${label}</h4>${ii.map(i => { const p = data.pts[i]; const head = p !== lastP && data.pts.some(x => x === 3) ? `<div class="sheet-grp">${p === 2 ? 'Α΄ ΟΜΑΔΑ · 2 μονάδες η καθεμία' : 'Β΄ ΟΜΑΔΑ · 3 μονάδες η καθεμία'}</div>` : ''; lastP = p; return head + sheetRow(i, !opt.edit, data, opt.marks); }).join('')}</div>`; };
  return `<div class="sheet"><div class="sheet-head">ΦΥΛΛΟ ΑΠΑΝΤΗΣΕΩΝ</div>${data.code ? codeHTML(data, opt.edit) : ''}<div class="sheet-cols">${col('lang', 'ΓΛΩΣΣΑ')}${col('math', 'ΜΑΘΗΜΑΤΙΚΑ')}</div></div>`;
}
function codeHTML(data, edit) {
  const c = data.code;
  return `<div class="mt center"><div class="small"><b>Κωδικός υποψηφίου</b>${edit ? ` · για την άσκηση γράψε: <b style="letter-spacing:.15em">${c.want}</b>` : ''}</div>
    <div class="small mute">Γράψε ένα ψηφίο σε κάθε κουτί και γέμισε από κάτω τον κύκλο με το ίδιο ψηφίο.</div>
    <div class="codegrid mt">${c.digits.map((d, j) => `<div class="codecol">${edit ? `<input class="box" inputmode="numeric" maxlength="1" value="${esc(d)}" oninput="codeDigit(${j},this.value)" style="text-align:center;font-size:16px">` : `<span class="box">${esc(d)}</span>`}
      ${[...Array(10)].map((_, v) => `<button class="bub ${c.bubs[j] === v ? 'f' : ''}" ${edit ? `onclick="codeBub(${j},${v})"` : 'disabled'}>${v}</button>`).join('')}</div>`).join('')}</div></div>`;
}
function codeDigit(j, v) { EX.code.digits[j] = (v || '').replace(/\D/g, '').slice(0, 1); saveRun(); }
function codeBub(j, v) { EX.code.bubs[j] = EX.code.bubs[j] === v ? null : v; saveRun(); $('#fullSheet').innerHTML = sheetHTML(EX, { edit: true }); }
function codeCheck(c) {
  const issues = [];
  if (c.digits.join('') !== c.want) issues.push('Τα ψηφία στα κουτιά δεν είναι ίδια με τον κωδικό σου.');
  if (c.bubs.some((b, j) => b === null)) issues.push('Δεν γέμισες κύκλο σε όλες τις στήλες του κωδικού.');
  else if (c.bubs.some((b, j) => String(b) !== c.digits[j])) issues.push('Κάποιος κύκλος του κωδικού δεν συμφωνεί με το ψηφίο από πάνω του.');
  return issues;
}
function exReview() {
  const n = EX.qids.length; const blank = EX.qids.filter(id => !EX.ans[id]).length; const dbl = EX.qids.filter(id => (EX.ans[id] || '').length > 1).length; const fl = EX.qids.filter(id => EX.flags[id]).length;
  render(`<div class="row" style="justify-content:space-between;align-items:center"><button class="btn ghost sm" onclick="renderExam()">← Πίσω στις ερωτήσεις</button><span class="timer" id="exT">--:--</span></div>
    <h2>Έλεγχος πριν την παράδοση</h2>
    <div class="card"><ul class="clean"><li>Απαντημένες: <b>${n - blank}/${n}</b>${blank ? ` — <span style="color:var(--bad)">${blank} κενές</span> (δεν υπάρχει αρνητική βαθμολογία, καλύτερα να μαντέψεις)` : ' ✓'}</li>
      ${dbl ? `<li style="color:var(--bad)"><b>${dbl}</b> ερωτήσεις έχουν δύο κύκλους → 0 μονάδες</li>` : ''}${fl ? `<li>🚩 ${fl} σημαδεμένες για ξανακοίταγμα</li>` : ''}</ul></div>
    ${EX.mode === 'sheet' ? `<p class="small mute mt">Μπορείς να διορθώσεις κατευθείαν στο φύλλο. Πάτα τον αριθμό μιας ερώτησης στη λίστα πιο κάτω για να τη δεις ξανά.</p><div id="fullSheet" class="mt">${sheetHTML(EX, { edit: true })}</div>` : ''}
    <div class="card mt"><div class="qnav">${EX.qids.map((id, k) => `<button class="${EX.ans[id] ? 'done' : ''} ${EX.flags[id] ? 'flag' : ''}" onclick="exGo(${k})">${EX.nums[k]}</button>`).join('')}</div></div>
    <div class="row mt2"><button class="btn" onclick="confirmBox('Παράδοση του διαγωνίσματος; Μετά δεν αλλάζει τίποτα.','Παράδοση',finishMock)">✅ Παράδοση</button></div>`);
  examTick();
}

/* ---------- Βαθμολόγηση ---------- */
function gradeMock(data) {
  let score = 0, max = 0, correct = 0; const sub = { lang: [0, 0], math: [0, 0] }; const byT = {};
  data.qids.forEach((id, i) => { const q = QBY[id]; if (!q) return; const p = data.pts[i]; max += p; const a = (data.ans || {})[id] || ''; const ok = a === q.answer;
    if (ok) { score += p; correct++; } sub[q.subject][1] += p; if (ok) sub[q.subject][0] += p;
    byT[q.topic] = byT[q.topic] || [0, 0]; byT[q.topic][0]++; if (ok) byT[q.topic][1]++; });
  // Στα παλιά 50άρια (2 μον. ×50) η κλίμακα είναι επίσης 100.
  return { score, max, correct, sub, byT, pct: pct(score, max), langPct: sub.lang[1] ? pct(sub.lang[0], sub.lang[1]) : null, mathPct: sub.math[1] ? pct(sub.math[0], sub.math[1]) : null };
}
function finishMock() {
  if (!EX || EX.done) return; closeModal(); stopTimers();
  const sec = exElapsed(); EX.done = true; LEAVE_GUARD = null; IDB.put('exam-run', null);
  const g = gradeMock(EX);
  if (canRecord()) { EX.qids.forEach(id => { const a = EX.ans[id]; if (a && QBY[id]) recordAnswer(QBY[id], a === QBY[id].answer); }); saveProg(); }
  const rec = { key: EX.key, title: EX.title, mode: EX.mode, timed: EX.timed, minutes: EX.minutes, qids: EX.qids, nums: EX.nums, pts: EX.pts, ans: EX.ans, flags: EX.flags,
    score: g.score, max: g.max, pct: g.pct, correct: g.correct, langPct: g.langPct, mathPct: g.mathPct, sec: Math.round(sec), code: EX.code ? { want: EX.code.want, digits: EX.code.digits, bubs: EX.code.bubs, issues: codeCheck(EX.code) } : null };
  if (isStudent()) { addDocTo('mocks', rec); logSession({ mode: 'mock', title: EX.title, n: EX.qids.length, c: g.correct, sec: Math.min(sec, EX.minutes * 60 + 300) }); completeTask(`${g.score}/${g.max}`); }
  CUR = 'mockres'; history.replaceState(null, '', '#mock'); EX = null;
  mockResultView(rec);
}
function showMockResult(id) { const m = MOCKS.find(x => x.id === id); if (m) { CUR = 'mockres'; mockResultView(m); } }
function mockResultView(m) {
  const g = gradeMock(m); updateTabs();
  const dbl = m.qids.filter(id => (m.ans[id] || '').length > 1).length, blank = m.qids.filter(id => !m.ans[id]).length;
  render(`<button class="btn ghost sm" onclick="go(isParent()&&!STUDENT_PREVIEW?'history':'mock')">← Πίσω</button>
    <h1 class="mt">${g.pct >= 85 ? 'Εξαιρετικά! 🏆' : g.pct >= 65 ? 'Πολύ καλά! 👏' : 'Συνέχισε! 💪'}</h1><p class="sub">${esc(m.title)} · ${m.ts ? fmtDate(m.ts, { day: 'numeric', month: 'short' }) + ' · ' : ''}${fmtMin(m.sec)}${m.timed ? ' από ' + m.minutes + '′' : ''}</p>
    <div class="grid g3"><div class="card center"><div class="lab">Βαθμός</div><div class="big">${g.score}/${g.max}</div><div class="small mute">${g.correct}/${m.qids.length} σωστές</div></div>
      <div class="card center"><div class="lab">Γλώσσα</div><div class="big" style="color:var(--lang)">${g.langPct ?? '—'}%</div></div>
      <div class="card center"><div class="lab">Μαθηματικά</div><div class="big" style="color:var(--math)">${g.mathPct ?? '—'}%</div></div></div>
    ${dbl || blank ? `<div class="card mt small">${blank ? `⚪ ${blank} κενές ερωτήσεις. ` : ''}${dbl ? `<span style="color:var(--bad)">⚠️ ${dbl} με δύο κύκλους (μέτρησαν 0).</span>` : ''}</div>` : ''}
    ${m.code ? `<div class="card mt small"><b>Κωδικός υποψηφίου:</b> ${m.code.issues && m.code.issues.length ? `<span style="color:var(--bad)">${m.code.issues.map(esc).join(' ')}</span>` : '<span class="pill-ok">✓ σωστά συμπληρωμένος</span>'}</div>` : ''}
    <h2>Ανά ενότητα</h2><div class="card">${Object.entries(g.byT).sort((a, b) => a[1][1] / a[1][0] - b[1][1] / b[1][0]).map(([t, [n, k]]) => `<div class="list-item">${topicTag(t)}<span class="grow"><div class="bar"><i style="width:${pct(k, n)}%;background:var(--${TOP[t] ? TOP[t].subject : 'acc'})"></i></div></span><b>${k}/${n}</b>${THBY[t] && k < n ? `<button class="btn ghost sm" onclick="openChapter('${t}')">Θεωρία</button>` : ''}</div>`).join('')}</div>
    ${m.mode === 'sheet' ? `<h2>Το φύλλο σου</h2><p class="small mute">Πράσινο δαχτυλίδι: η σωστή απάντηση · κόκκινο: λάθος κύκλος.</p>${sheetHTML(m, { marks: true })}` : ''}
    <h2>Όλες οι ερωτήσεις</h2><div class="card">${m.qids.map((id, i) => { const q = QBY[id]; if (!q) return ''; const a = m.ans[id] || ''; const ok = a === q.answer; return `<div class="list-item"><b style="width:28px">${z2(m.nums[i])}</b><span class="${ok ? 'pill-ok' : 'pill-bad'}">${ok ? '✓' : a ? '✗' : '—'}</span><span class="grow small">${esc(q.stem.slice(0, 90))}${q.stem.length > 90 ? '…' : ''}<div class="mute">${a ? 'έδωσες ' + a + ' · ' : ''}σωστό ${q.answer}</div></span><button class="btn ghost sm" onclick="reviewOne('${id}','${a}')">Λύση</button></div>`; }).join('')}</div>
    <div class="row mt2">${!isParent() || STUDENT_PREVIEW ? `<button class="btn" onclick="startQuiz(${JSON.stringify(m.qids.filter(id => m.ans[id] !== (QBY[id] || {}).answer)).replace(/"/g, "'")}.map(id=>QBY[id]),'Λάθη διαγωνίσματος',{mode:'mistakes'})">🔁 Ξανά τα λάθη</button>` : ''}<button class="btn ghost" onclick="go('home')">Αρχική</button></div>`);
}

/* ---------- Εκμάθηση φύλλου ---------- */
function sheetIntro() {
  const demo = officialList(2026).slice(0, 2).concat(officialList(2026).slice(10, 11));
  const D = { qids: demo.map(q => q.id), nums: demo.map(q => q.num), pts: demo.map(q => q.points), ans: {} };
  render(`<button class="btn ghost sm" onclick="go('mock')">← Διαγώνισμα</button><h1 class="mt">Το φύλλο απαντήσεων</h1>
    <div class="card lesson"><p>Στην εξέταση <b>δεν γράφεις πάνω στις ερωτήσεις</b> την απάντηση που μετράει. Τη δείχνεις σε ένα ξεχωριστό χαρτί, το <b>φύλλο απαντήσεων</b>, που το διαβάζει μηχάνημα (οπτικός αναγνώστης).</p>
      <div class="blk-rule">📐 Για κάθε ερώτηση <b>γεμίζεις ολόκληρο</b> τον κύκλο με το γράμμα της απάντησης. Όχι ✓, όχι Χ, όχι κύκλο γύρω-γύρω.</div>
      <div class="blk-trap">⚠️ <b>Παγίδα:</b> αν γεμίσεις <b>δύο κύκλους</b> στην ίδια γραμμή, η ερώτηση παίρνει <b>0</b>.</div>
      <ul class="clean"><li>Αριστερά η <b>ΓΛΩΣΣΑ</b> (01–20), δεξιά τα <b>ΜΑΘΗΜΑΤΙΚΑ</b> (21–40).</li><li>01–10 και 21–30: κύκλοι Α–Δ (2 μονάδες). 11–20 και 31–40: κύκλοι Α–Ε (3 μονάδες).</li><li>Οι γραμμές έχουν εναλλάξ μπλε και ροζ χρώμα, για να μη «γλιστρήσει» το μάτι σου σε άλλη γραμμή.</li><li>Πάνω-πάνω γράφεις τον <b>6ψήφιο κωδικό υποψηφίου</b> (τον βρίσκεις στην εκτυπωμένη αίτηση): ένα ψηφίο σε κάθε κουτί και γεμίζεις από κάτω τον κύκλο με το ίδιο ψηφίο.</li>
      <li>Συμβουλή: κάθε 5 ερωτήσεις έλεγξε ότι ο αριθμός της γραμμής στο φύλλο είναι ίδιος με τον αριθμό της ερώτησης.</li><li>Ό,τι πει η επιτροπή για το στυλό και τις διορθώσεις εκείνη τη μέρα, αυτό ισχύει.</li></ul></div>
    <h2>Δοκίμασε</h2><p class="small">Πάτα τους κύκλους: γέμισε <b>Γ</b> στην 01, <b>Α</b> στην 02, και στην 11 δοκίμασε να γεμίσεις δύο για να δεις τι γίνεται.</p>
    <div id="demoSheet">${sheetHTML(D, {})}</div>
    <div class="row mt2"><button class="btn" onclick="startMock('gen-full')">Πλήρες διαγώνισμα με φύλλο →</button></div>`);
  // Ζωντανό demo: απλός χειρισμός χωρίς EX
  window.__demo = D;
  $('#demoSheet').querySelectorAll('.srow').forEach((row, i) => row.querySelectorAll('.bub').forEach(b => { b.disabled = false; b.onclick = () => { const id = D.qids[i]; let s = D.ans[id] || ''; const k = b.textContent; s = s.includes(k) ? s.replace(k, '') : s + k; D.ans[id] = s; if (s.length > 1) toast('Δύο κύκλοι = 0 μονάδες!'); sheetIntroRefresh(); }; }));
}
function sheetIntroRefresh() { const D = window.__demo; const ok = D.ans[D.qids[0]] === 'Γ' && D.ans[D.qids[1]] === 'Α'; const el = $('#demoSheet'); el.innerHTML = sheetHTML(D, {}) + (ok ? '<div class="expl ok mt"><b>Μπράβο!</b> Έτσι ακριβώς γεμίζεις το φύλλο.</div>' : '');
  el.querySelectorAll('.srow').forEach((row, i) => row.querySelectorAll('.bub').forEach(b => { b.disabled = false; b.onclick = () => { const id = D.qids[i]; let s = D.ans[id] || ''; const k = b.textContent; s = s.includes(k) ? s.replace(k, '') : s + k; D.ans[id] = s; if (s.length > 1) toast('Δύο κύκλοι = 0 μονάδες!'); sheetIntroRefresh(); }; })); }
