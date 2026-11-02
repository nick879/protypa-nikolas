"use strict";
/* ================= ΜΑΘΗΤΗΣ ================= */
function canRecord() { return isStudent() || STUDENT_PREVIEW; }
function srcTag(q) {
  const cls = q.kind === 'exam' ? 'exam' : q.kind === 'new' ? 'new' : 'ind';
  return `<span class="tag ${cls}">${esc(q.srcLabel || '')}</span>`;
}
function topicTag(t) { const tp = TOP[t]; return tp ? `<span class="tag ${tp.subject}">${esc(tp.name)}</span>` : ''; }

/* ---------- Αρχική ---------- */
VIEWS.home = function () {
  const name = USER.vocative || USER.name;
  const days = daysToExam(); const goal = SET.dailyMin || 25; const today = secondsOn(todayStr()) / 60;
  const tasksToday = todayTasks(); const P = planInfo();
  const open = TASKS.filter(x => x.status !== 'done');
  const unread = NOTES.filter(n => !n.seen);
  const ch = currentChapter(); const cp = chapterProgress(ch);
  const lang = subjectStats('lang'), math = subjectStats('math');
  const lastMock = MOCKS[0];
  render(`
    <h1>Γεια σου, ${esc(name)}! 🦉</h1>
    <p class="sub">${days > 0 ? `Μένουν <b>${days}</b> μέρες ως την εξέταση (${fmtDate(parseDay(examDate()), { day: 'numeric', month: 'long' })}${C.exam.dateEstimated && !SET.examDate ? ', εκτίμηση' : ''}).` : 'Καλή επιτυχία!'}</p>
    ${open.length ? `<h2>📌 Από τους γονείς σου</h2><div class="grid">${open.map(x => `<div class="card taskcard"><div class="row" style="justify-content:space-between"><div class="grow"><b>${esc(x.title)}</b><div class="small mute">${esc(x.byName || '')}${x.due ? ' · ως ' + fmtDate(parseDay(x.due), { weekday: 'short', day: 'numeric', month: 'short' }) : ''}${x.text ? ' · ' + esc(x.text) : ''}</div></div>${x.action ? `<button class="btn sm" onclick="doAction('${esc(x.action)}','${x.id}')">Ξεκίνα</button>` : `<button class="btn sm ghost" onclick="updDoc('tasks','${x.id}',{status:'done',doneTs:Date.now()})">✓ Έγινε</button>`}</div></div>`).join('')}</div>` : ''}
    ${unread.length ? `<div class="card notecard mt"><b>💬 ${unread.length} ${unread.length === 1 ? 'νέα σημείωση' : 'νέες σημειώσεις'}</b><div class="small">${esc(unread[0].byName)}: ${esc(unread[0].text.slice(0, 120))}</div><button class="btn sm soft mt" onclick="go('notes')">Διάβασέ τες</button></div>` : ''}
    <div class="card hero mt">
      <div class="row" style="justify-content:space-between;align-items:flex-start">
        <div><div class="lab" style="color:rgba(255,255,255,.8)">Σήμερα</div><div class="big">${Math.round(today)} / ${goal} λεπτά</div>
        <div style="margin-top:6px">${tasksToday.map(x => x[0] + ' ' + esc(x[1])).join('<br>')}</div></div>
        <div class="center"><div class="big">🔥 ${streak()}</div><div class="mute small">μέρες στη σειρά</div></div>
      </div>
      <div class="bar mt" style="background:rgba(255,255,255,.25)"><i style="width:${Math.min(100, pct(today, goal))}%;background:#fff"></i></div>
      <div class="row mt">${tasksToday.filter(x => x[2]).map(x => `<button class="btn sm" style="background:#fff;color:var(--acc)" onclick="doAction('${x[2]}')">Ξεκίνα</button>`).join('')}<button class="btn sm" style="background:rgba(255,255,255,.18)" onclick="go('plan')">📅 Πρόγραμμα</button></div>
      <div class="small mt" style="opacity:.9">${kidStatus(P)}</div>
    </div>
    <h2>Το κεφάλαιο που δουλεύεις</h2>
    <button class="tile" onclick="openChapter('${ch}')" style="width:100%">${topicTag(ch)}<b>${esc(THBY[ch] ? THBY[ch].title : TOP[ch].name)}</b>
      <span class="small mute">Μαθήματα ${cp.lessonsDone}/${cp.lessons}${cp.test ? ` · τεστ ${cp.test.score}%` : ''}${cp.stats.acc !== null ? ` · επιτυχία ${Math.round(cp.stats.acc * 100)}%` : ''}</span>
      <div class="bar"><i style="width:${pct(cp.lessonsDone, cp.lessons)}%"></i></div></button>
    <div class="grid g4 mt">
      <div class="card"><div class="lab">Επίπεδο</div><div class="big">${level(PROG.xp)}</div><div class="small mute">${PROG.xp || 0} XP</div></div>
      <div class="card"><div class="lab">Γλώσσα</div><div class="big" style="color:var(--lang)">${lang.acc === null ? '—' : Math.round(lang.acc * 100) + '%'}</div><div class="small mute">${lang.att} απαντήσεις</div></div>
      <div class="card"><div class="lab">Μαθηματικά</div><div class="big" style="color:var(--math)">${math.acc === null ? '—' : Math.round(math.acc * 100) + '%'}</div><div class="small mute">${math.att} απαντήσεις</div></div>
      <div class="card"><div class="lab">Διαγώνισμα</div><div class="big">${lastMock ? lastMock.score : '—'}</div><div class="small mute">${lastMock ? esc(lastMock.title) : 'κανένα ακόμα'}</div></div>
    </div>
    <h2>Γρήγορα</h2>
    <div class="grid g3">
      <button class="tile" onclick="startSmart()"><span class="ic">🧠</span><b>Έξυπνη εξάσκηση</b><span class="small mute">10 ερωτήσεις: λάθη + αδύναμες ενότητες</span></button>
      <button class="tile" onclick="startMistakes()"><span class="ic">🔁</span><b>Τα λάθη μου (${Q.filter(q => PROG.qs[q.id] && PROG.qs[q.id][4] === 0).length})</b><span class="small mute">Ξαναδοκίμασε όσες έχασες</span></button>
      <button class="tile" onclick="go('notes')"><span class="ic">💬</span><b>Σημειώσεις γονιών</b><span class="small mute">${NOTES.length} συνολικά</span></button>
    </div>
    <div class="row mt2"><button class="btn ghost sm" onclick="go('info')">ℹ️ Για την εξέταση</button><button class="btn ghost sm" onclick="go('account')">👤 Λογαριασμός</button></div>`);
};

/* ---------- Σημειώσεις ---------- */
VIEWS.notes = function () {
  render(`<h1>Σημειώσεις</h1><p class="sub">Ό,τι σου έγραψαν οι γονείς σου.</p>
    ${NOTES.length ? NOTES.map(n => `<div class="card notecard mt"><div class="small mute">${esc(n.byName)} · ${fmtDate(n.ts, { day: 'numeric', month: 'short' })} ${fmtTime(n.ts)}${n.seen ? '' : ' · <b style="color:var(--bad)">νέα</b>'}</div>
      <div style="margin-top:4px">${md(n.text)}</div>${n.qid && QBY[n.qid] ? `<button class="btn sm ghost mt" onclick="reviewOne('${n.qid}','')">Δες την ερώτηση</button>` : ''}${n.chapter && THBY[n.chapter] ? `<button class="btn sm ghost mt" onclick="openChapter('${n.chapter}')">Άνοιξε το κεφάλαιο</button>` : ''}</div>`).join('') : '<div class="card mute">Καμία σημείωση ακόμα.</div>'}`);
  if (isStudent()) NOTES.filter(n => !n.seen).forEach(n => updDoc('notes', n.id, { seen: true, seenTs: Date.now() }));
};

/* ---------- Πρόγραμμα ---------- */
function kidStatus(P) {
  return { ahead: '🚀 Πας πιο γρήγορα από το πρόγραμμα. Μπράβο!', ontrack: '✅ Είσαι ακριβώς στον στόχο.', behind: '💪 Λίγο πίσω: λίγα λεπτά παραπάνω αυτή την εβδομάδα και τα προλαβαίνουμε.', done: '🏁 Τελείωσες όλη τη θεωρία!', notstarted: '' }[P.status];
}
function chapterDoneDate(id) { const th = THBY[id]; let ts = 0; (th ? th.lessons : []).forEach(l => { const d = (PROG.lessons || {})[l.id]; if (d) ts = Math.max(ts, d.ts); }); const t = (PROG.tests || {})[id]; if (t) ts = Math.max(ts, t.bestTs || t.ts); return ts; }
function planChaptersHTML(P, forParent) {
  const cur = currentChapter(); const short = { day: 'numeric', month: 'short' };
  return P.sched.map((c, i) => { const u = chapterUnits(c.id), d = chapterUnitsDone(c.id); const isCur = c.id === cur;
    const icon = c.state === 'done' ? '<span class="chk on">✓</span>' : isCur ? '<span class="chk" style="border-color:var(--acc);color:var(--acc)">▶</span>' : '<span class="chk"></span>';
    const when = c.state === 'done' ? `ολοκληρώθηκε ${fmtDate(chapterDoneDate(c.id), short)}` : c.eta ? `εκτίμηση: ως ${fmtDate(c.eta, short)}` : '';
    const late = forParent && c.state !== 'done' && c.eta && c.eta > P.theoryEnd;
    return `<div class="list-item">${icon}<span class="grow"><b>${i + 1}. ${esc(TOP[c.id].name)}</b> <span class="small mute">${SUBJ[TOP[c.id].subject]}${(SET.taught || {})[c.id] ? ' · διδάχθηκε' : ''}</span><div class="small ${late ? '' : 'mute'}" ${late ? 'style="color:var(--bad)"' : ''}>${d}/${u} βήματα · ${when}${late ? ' (μετά την προθεσμία)' : ''}</div><div class="bar"><i style="width:${pct(d, u)}%;background:var(--${TOP[c.id].subject})"></i></div></span>${!forParent ? `<button class="btn sm ${isCur ? '' : 'ghost'}" onclick="openChapter('${c.id}')">${c.state === 'done' ? 'Ξανά' : 'Άνοιγμα'}</button>` : `<button class="btn sm ghost" onclick="go('chapter','${c.id}')">Άνοιγμα</button>`}</div>`; }).join('');
}
function phasesHTML(P) {
  const f = d => fmtDate(d, { day: 'numeric', month: 'short' });
  const rows = [[1, P.start, P.theoryEnd], [2, P.theoryEnd, P.mockStart], [3, P.mockStart, P.finalStart], [4, P.finalStart, P.exam]];
  return rows.map(([k, a, b]) => `<div class="week ${P.phase === k ? 'now' : P.phase > k ? 'past' : ''}" style="border-left-color:${PHASES[k].c}"><b style="color:${PHASES[k].c}">${k}. ${PHASES[k].n}</b> <span class="small mute">${f(a)} – ${f(b)}${P.phase === k ? ' · τώρα' : ''}</span><div class="small mute">${PHASES[k].d}</div></div>`).join('');
}
VIEWS.plan = function () {
  const P = planInfo(); const goal = SET.dailyMin || 25; const t = parseDay(todayStr());
  const mon = addDays(t, -((t.getDay() + 6) % 7));
  render(`<h1>Πρόγραμμα μελέτης</h1><p class="sub">Προχωράς με τον δικό σου ρυθμό: μόλις κλείσεις ένα κεφάλαιο (όλα τα μαθήματα + τεστ ${PASS}%), ανοίγει το επόμενο.</p>
    <div class="card"><b>${kidStatus(P) || 'Ξεκινάμε!'}</b><div class="bar mt"><i style="width:${pct(P.done, P.total)}%"></i></div><div class="small mute mt">Θεωρία: ${P.done}/${P.total} βήματα · στόχος να τελειώσει ως ${fmtDate(P.theoryEnd, { day: 'numeric', month: 'long' })}</div></div>
    <h2>Αυτή την εβδομάδα</h2><div class="card" style="padding:8px 12px">${[...Array(7)].map((_, i) => { const d = addDays(mon, i); const ds = todayStr(d); const m = secondsOn(ds) / 60; const ok = m >= goal * .8; const isT = ds === todayStr(); const fut = d > t;
      const tk = isT ? todayTasks(d) : [];
      return `<div class="day ${isT ? 'today' : ''}"><span class="chk ${ok ? 'on' : ''}">${ok ? '✓' : ''}</span><span class="d">${DOW[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}</span><span class="grow small">${isT ? tk.map(x => x[0] + ' ' + esc(x[1])).join('<br>') : fut ? '<span class="mute">—</span>' : `<span class="mute">${Math.round(m)}′</span>`}</span>${isT && tk[0] && tk[0][2] ? `<button class="btn sm" onclick="doAction('${tk[0][2]}')">Πάμε</button>` : ''}</div>`; }).join('')}</div>
    <h2>Κεφάλαια με τη σειρά</h2><div class="card">${planChaptersHTML(P, false)}</div>
    <h2>Φάσεις ως την εξέταση</h2>${phasesHTML(P)}
    <div class="week"><b>🎯 ${fmtDate(P.exam, { weekday: 'long', day: 'numeric', month: 'long' })}: Εξέταση</b><div class="small mute">Είσοδος ως τις ${C.exam.arrive}, έναρξη ${C.exam.start}.</div></div>`);
};

/* ---------- Κεφάλαια & θεωρία ---------- */
VIEWS.chapters = function () {
  const ch = currentChapter();
  const card = id => { const th = THBY[id]; const p = chapterProgress(id);
    return `<button class="tile" onclick="openChapter('${id}')" style="${id === ch ? 'outline:3px solid var(--acc)' : ''}">${topicTag(id)}<b>${chapterDone(id) ? '✓ ' : ''}${esc(th ? th.title : TOP[id].name)}</b>
      <span class="small mute">Μαθήματα ${p.lessonsDone}/${p.lessons}${p.test ? ` · τεστ ${bestTest(id)}%` : ''}${p.stats.acc !== null ? ` · ${Math.round(p.stats.acc * 100)}% σωστά` : ''}</span><div class="bar"><i style="width:${pct(p.lessonsDone, p.lessons)}%;background:var(--${TOP[id].subject})"></i></div></button>`; };
  render(`<h1>Κεφάλαια</h1><p class="sub">Η θεωρία που χρειάζεσαι, με λυμένα παραδείγματα από τις εξετάσεις. Με μπλε περίγραμμα: το κεφάλαιο που δουλεύεις τώρα.</p>
    <h2>Γλώσσα</h2><div class="grid g3">${C.topics.filter(t => t.subject === 'lang').map(t => card(t.id)).join('')}</div>
    <h2>Μαθηματικά</h2><div class="grid g3">${C.topics.filter(t => t.subject === 'math').map(t => card(t.id)).join('')}</div>
    <h2>Κείμενα</h2><button class="tile" onclick="go('reading')" style="width:100%"><span class="ic">📖</span><b>Κείμενα με ερωτήσεις</b><span class="small mute">Όπως στη Γλώσσα της εξέτασης</span></button>`);
};
function openChapter(id, nextLesson) {
  if (nextLesson) { const th = THBY[id]; const l = th && th.lessons.find(x => !(PROG.lessons || {})[x.id]); if (l) { openLesson(l.id); return; } }
  go('chapter', id);
}
function blocksHTML(blocks) {
  return blocks.map(b => {
    if (b.t === 'p') return `<p>${md(b.text)}</p>`;
    if (b.t === 'rule') return `<div class="blk-rule">📐 ${md(b.text)}</div>`;
    if (b.t === 'tip') return `<div class="blk-tip">💡 ${md(b.text)}</div>`;
    if (b.t === 'trap') return `<div class="blk-trap">⚠️ <b>Παγίδα:</b> ${md(b.text)}</div>`;
    if (b.t === 'list') return `<ul class="clean">${b.items.map(i => `<li>${md(i)}</li>`).join('')}</ul>`;
    if (b.t === 'table') return `<div class="blk-table"><table><thead><tr>${b.head.map(h => `<th>${md(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${md(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    if (b.t === 'example') return `<div class="blk-ex"><b>Παράδειγμα:</b> ${md(b.q)}<ol>${(b.steps || []).map(s => `<li>${md(s)}</li>`).join('')}</ol>${b.a ? `<b>Απάντηση:</b> ${md(b.a)}` : ''}</div>`;
    return '';
  }).join('');
}
VIEWS.chapter = function (id) {
  const th = THBY[id]; if (!th) { go('chapters'); return; }
  const p = chapterProgress(id);
  render(`<button class="btn ghost sm" onclick="go('chapters')">← Κεφάλαια</button>
    <h1 class="mt">${esc(th.title)}</h1><div class="row">${topicTag(id)}<span class="small mute">Μαθήματα ${p.lessonsDone}/${p.lessons}${p.test ? ` · τεστ: καλύτερο ${bestTest(id)}%` : ''}</span>${chapterDone(id) ? '<span class="tag new">✓ ολοκληρώθηκε</span>' : ''}</div>
    <div class="small mute">Το κεφάλαιο κλείνει όταν κάνεις όλα τα μαθήματα και πάρεις τουλάχιστον ${PASS}% στο τεστ κεφαλαίου.</div>
    <p>${md(th.intro || '')}</p>
    <h2>Μαθήματα</h2><div class="card">${th.lessons.map((l, i) => { const done = (PROG.lessons || {})[l.id]; return `<div class="list-item"><span class="chk ${done ? 'on' : ''}">${done ? '✓' : ''}</span><span class="grow"><b>${i + 1}. ${esc(l.title)}</b>${done ? `<div class="small mute">έγινε ${fmtDate(done.ts, { day: 'numeric', month: 'short' })}${done.score !== undefined ? ` · έλεγχος ${done.score}%` : ''}</div>` : ''}</span><button class="btn sm ${done ? 'ghost' : ''}" onclick="openLesson('${l.id}')">${done ? 'Ξανά' : 'Ξεκίνα'}</button></div>`; }).join('')}</div>
    <div class="row mt"><button class="btn" onclick="startChapterTest('${id}')">📝 Τεστ κεφαλαίου (15 ερωτήσεις)</button><button class="btn ghost" onclick="startTopic('${id}')">✏️ Εξάσκηση 10 ερωτήσεων</button></div>
    ${th.method && th.method.length ? `<h2>Πώς λύνω τέτοιες ερωτήσεις</h2><div class="card"><ol style="margin:0;padding-left:20px">${th.method.map(m => `<li>${md(m)}</li>`).join('')}</ol></div>` : ''}
    ${th.traps && th.traps.length ? `<h2>Συχνές παγίδες</h2><div class="card">${th.traps.map(m => `<div class="blk-trap">⚠️ ${md(m)}</div>`).join('')}</div>` : ''}
    ${th.examples && th.examples.length ? `<h2>Λυμένα θέματα εξετάσεων</h2><div class="card">${th.examples.map(e => QBY[e.qid] ? `<div class="list-item"><span class="grow"><span class="tag exam">${esc(QBY[e.qid].srcLabel)}</span><div class="small" style="margin-top:4px">${esc(e.why)}</div></span><button class="btn sm ghost" onclick="reviewOne('${e.qid}','${QBY[e.qid].answer}')">Δες λύση</button></div>` : '').join('')}</div>` : ''}
    ${th.bookRefs && th.bookRefs.length ? `<h2>Στο σχολικό βιβλίο</h2><div class="card small">${th.bookRefs.map(b => `<div class="list-item"><span class="grow"><b>${esc(b.book)}</b><br>${esc(b.where || '')}${b.pages ? ' · ' + esc(b.pages) : ''}</span></div>`).join('')}</div>` : ''}
    ${isParent() ? parentChapterBox(id) : ''}`);
};
let LS = null; // κατάσταση μαθήματος
function openLesson(lid) { const l = LESSONBY[lid]; if (!l) return; LS = { lid, start: Date.now() }; CUR = 'lesson'; history.replaceState(null, '', '#lesson'); VIEWS.lesson(); }
VIEWS.lesson = function () {
  if (!LS) { go('chapters'); return; }
  const l = LESSONBY[LS.lid]; const th = THBY[l.chapter]; const n = th.lessons.length;
  updateTabs();
  render(`<div class="progress"><button class="btn ghost sm" onclick="go('chapter','${l.chapter}')">✕</button><div class="bar"><i style="width:${pct(l.idx + 1, n)}%"></i></div><b class="small">${l.idx + 1}/${n}</b></div>
    <div class="small mute">${esc(th.title)}</div><h1>${esc(l.title)}</h1>
    <div class="card lesson mt">${blocksHTML(l.blocks)}</div>
    <div class="card mt center"><b>Έτοιμος; Δοκίμασε ${(l.check || []).length} ερωτήσεις για αυτό το μάθημα.</b><div class="row mt" style="justify-content:center"><button class="btn" onclick="startLessonCheck()">Έλεγχος →</button>${l.idx + 1 < n ? `<button class="btn ghost" onclick="markLesson(null);openLesson('${th.lessons[l.idx + 1].id}')">Επόμενο μάθημα χωρίς έλεγχο</button>` : ''}</div></div>`);
};
function markLesson(score) {
  if (!isStudent() && !STUDENT_PREVIEW) return;
  PROG.lessons = PROG.lessons || {};
  const prev = PROG.lessons[LS.lid] || {};
  PROG.lessons[LS.lid] = { ts: Date.now(), score: score ?? prev.score ?? null };
  logSession({ mode: 'lesson', title: 'Θεωρία: ' + LESSONBY[LS.lid].title, topic: LESSONBY[LS.lid].chapter, lesson: LS.lid, n: 0, c: 0, sec: Math.min((Date.now() - LS.start) / 1000, 1800) });
  saveProg(); LS.start = Date.now();
}
function startLessonCheck() {
  const l = LESSONBY[LS.lid]; const qs = (l.check || []).map(id => QBY[id]).filter(Boolean);
  markLesson(null);
  const lid = LS.lid;
  startQuiz(qs, 'Έλεγχος: ' + l.title, { mode: 'lesson-check', topic: l.chapter, onDone: (n, c) => { PROG.lessons[lid] = { ts: Date.now(), score: pct(c, n) }; saveProg(); }, next: () => { const th = THBY[l.chapter]; const nx = th.lessons[l.idx + 1]; if (nx) openLesson(nx.id); else go('chapter', l.chapter); }, nextLabel: (() => { const th = THBY[l.chapter]; return th.lessons[l.idx + 1] ? 'Επόμενο μάθημα →' : 'Πίσω στο κεφάλαιο'; })() });
}

/* ---------- Εξάσκηση ---------- */
let PS = { subj: 'all', topics: new Set(), src: 'all', n: 10 };
VIEWS.practice = function () {
  const chips = sj => C.topics.filter(t => t.subject === sj).map(t => { const s = topicStats(t.id); return `<button class="chip ${sj} ${PS.topics.has(t.id) ? 'on' : ''}" onclick="togTopic('${t.id}')">${esc(t.name)} <span style="opacity:.6">${s.acc === null ? '' : Math.round(s.acc * 100) + '%'}</span></button>`; }).join('');
  const pool = practicePool();
  render(`<h1>Εξάσκηση</h1><p class="sub">Μετά από κάθε απάντηση βλέπεις αμέσως τη λύση.</p>
    <div class="grid g3">
      <button class="tile" onclick="startSmart()"><span class="ic">🧠</span><b>Έξυπνη εξάσκηση</b><span class="small mute">Η εφαρμογή διαλέγει για σένα</span></button>
      <button class="tile" onclick="go('reading')"><span class="ic">📖</span><b>Κείμενα</b><span class="small mute">Διάβασε και απάντησε</span></button>
      <button class="tile" onclick="startMistakes()"><span class="ic">🔁</span><b>Τα λάθη μου</b><span class="small mute">Επανάληψη όσων έχασες</span></button>
    </div>
    <div class="card mt2"><h3>Δική μου επιλογή</h3>
      <div class="row" style="margin:8px 0 12px">${[['all', 'Όλα'], ['lang', 'Γλώσσα'], ['math', 'Μαθηματικά']].map(([k, l]) => `<button class="chip ${k !== 'all' ? k : ''} ${PS.subj === k ? 'on' : ''}" onclick="PS.subj='${k}';PS.topics.clear();route()">${l}</button>`).join('')}</div>
      ${PS.subj !== 'math' ? `<div class="lab">Γλώσσα</div><div class="row" style="margin:6px 0 12px">${chips('lang')}</div>` : ''}
      ${PS.subj !== 'lang' ? `<div class="lab">Μαθηματικά</div><div class="row" style="margin:6px 0 12px">${chips('math')}</div>` : ''}
      <div class="lab">Πηγή</div><div class="row" style="margin:6px 0 12px">${[['all', 'Όλες'], ['exam', 'Εξετάσεις'], ['indicative', 'Ενδεικτικά'], ['new', 'Νέες']].map(([k, l]) => `<button class="chip ${PS.src === k ? 'on' : ''}" onclick="PS.src='${k}';route()">${l}</button>`).join('')}</div>
      <div class="lab">Πόσες</div><div class="row" style="margin:6px 0 14px">${[5, 10, 20].map(n => `<button class="chip ${PS.n === n ? 'on' : ''}" onclick="PS.n=${n};route()">${n}</button>`).join('')}</div>
      <button class="btn block" ${pool.length ? '' : 'disabled'} onclick="startCustom()">Ξεκίνα (${Math.min(PS.n, pool.length)} από ${pool.length})</button></div>`);
};
function togTopic(t) { PS.topics.has(t) ? PS.topics.delete(t) : PS.topics.add(t); route(); }
function practicePool() { return Q.filter(q => (PS.subj === 'all' || q.subject === PS.subj) && (!PS.topics.size || PS.topics.has(q.topic)) && (PS.src === 'all' || (PS.src === 'indicative' ? (q.kind === 'indicative' || q.kind === 'collection') : q.kind === PS.src))); }
function orderFresh(arr) {
  const pr = q => q.kind === 'exam' && q.year >= 2020 ? 0 : q.kind === 'indicative' && q.year >= 2025 ? 0 : 1; // πρώτα νέας μορφής
  const g = f => shuffle(arr.filter(f)).sort((a, b) => pr(a) - pr(b));
  const un = g(q => !PROG.qs[q.id]), wr = g(q => PROG.qs[q.id] && PROG.qs[q.id][4] === 0), du = g(q => PROG.qs[q.id] && PROG.qs[q.id][4] === 1 && isDue(PROG.qs[q.id])), rest = g(q => PROG.qs[q.id] && PROG.qs[q.id][4] === 1 && !isDue(PROG.qs[q.id]));
  return [...un, ...wr, ...du, ...rest];
}
function startCustom() { startQuiz(orderFresh(practicePool()).slice(0, PS.n), 'Εξάσκηση'); }
function startTopic(t) { startQuiz(orderFresh(Q.filter(q => q.topic === t)).slice(0, 10), 'Εξάσκηση: ' + TOP[t].name, { topic: t }); }
function startChapterTest(t) {
  const pool = orderFresh(Q.filter(q => q.topic === t && q.kind !== 'new')).concat(orderFresh(Q.filter(q => q.topic === t && q.kind === 'new')));
  startQuiz(pool.slice(0, 15), 'Τεστ κεφαλαίου: ' + TOP[t].name, { mode: 'chapter-test', topic: t, onDone: (n, c) => { PROG.tests = PROG.tests || {}; const prev = PROG.tests[t] || {}; const sc = pct(c, n); const best = Math.max(sc, prev.best || prev.score || 0); PROG.tests[t] = { score: sc, ts: Date.now(), n, best, bestTs: best === sc ? Date.now() : (prev.bestTs || prev.ts), tries: (prev.tries || 0) + 1 }; saveProg(); if (sc >= PASS) toast('🎉 Πέρασες το τεστ! Το κεφάλαιο ολοκληρώθηκε.', 4000); else toast(`Χρειάζεσαι ${PASS}% για να κλείσει το κεφάλαιο. Ξαναδοκίμασε μετά από εξάσκηση!`, 4500); } });
}
function startMistakes() { const arr = shuffle(Q.filter(q => PROG.qs[q.id] && PROG.qs[q.id][4] === 0)).slice(0, 10); if (!arr.length) { toast('Δεν έχεις λάθη για επανάληψη 🎉'); return; } startQuiz(arr, 'Τα λάθη μου', { mode: 'mistakes' }); }
function startSmart() {
  const out = [], used = new Set(); const add = q => { if (q && !used.has(q.id)) { used.add(q.id); out.push(q); } };
  shuffle(Q.filter(q => { const s = PROG.qs[q.id]; return s && (s[4] === 0 || isDue(s)); })).slice(0, 3).forEach(add);
  const ch = currentChapter(); orderFresh(Q.filter(q => q.topic === ch)).slice(0, 3).forEach(add);
  weakTopics(2).forEach(t => orderFresh(Q.filter(q => q.topic === t)).slice(0, 2).forEach(add));
  orderFresh(Q).forEach(q => { if (out.length < 10) add(q); });
  startQuiz(shuffle(out).slice(0, 10), 'Έξυπνη εξάσκηση', { mode: 'smart' });
}
VIEWS.reading = function () {
  const card = ps => { const qs = Q.filter(q => q.passage === ps.id); if (!qs.length) return ''; const seen = qs.filter(q => PROG.qs[q.id]).length; const ok = qs.filter(q => PROG.qs[q.id] && PROG.qs[q.id][4]).length; const q0 = qs[0];
    return `<button class="tile" onclick="startPassage('${ps.id}')">${srcTag(q0)}<b>${esc(ps.title)}</b><span class="small mute">${qs.length} ερωτήσεις${seen ? ` · ${ok}/${qs.length} σωστές` : ''}</span><div class="bar"><i style="width:${pct(seen, qs.length)}%;background:var(--lang)"></i></div></button>`; };
  const grp = f => C.passages.filter(p => { const q = Q.find(x => x.passage === p.id); return q && f(q); });
  render(`<h1>Κείμενα</h1><p class="sub">Η Γλώσσα της εξέτασης βασίζεται σε δύο κείμενα. Διάβασε μία φορά όλο το κείμενο, μετά απάντα γυρνώντας στο σημείο που αφορά κάθε ερώτηση.</p>
    <h2>Εξετάσεις 2020–2026</h2><div class="grid g3">${grp(q => q.kind === 'exam' && q.year >= 2020).sort((a, b) => b.id.localeCompare(a.id)).map(card).join('')}</div>
    <h2>Ενδεικτικά θέματα</h2><div class="grid g3">${grp(q => q.kind === 'indicative').map(card).join('')}</div>
    <h2>Νέα κείμενα εξάσκησης</h2><div class="grid g3">${grp(q => q.kind === 'new').map(card).join('')}</div>
    <h2>Παλιότερες εξετάσεις (2014–2019)</h2><div class="grid g3">${grp(q => q.kind === 'exam' && q.year < 2020).map(card).join('')}</div>`);
};
function startPassage(pid) { const qs = Q.filter(q => q.passage === pid).sort((a, b) => (a.num || 0) - (b.num || 0) || a.id.localeCompare(b.id)); startQuiz(qs, 'Κείμενο: ' + PBY[pid].title, { mode: 'reading' }); }

/* ---------- Κουίζ με άμεση διόρθωση ---------- */
let QZ = null;
function startQuiz(list, title, opts) {
  list = list.filter(Boolean); if (!list.length) { toast('Δεν βρέθηκαν ερωτήσεις'); return; }
  QZ = { list, title, i: 0, answers: {}, start: Date.now(), opts: opts || {}, popen: true };
  CUR = 'quiz'; history.replaceState(null, '', '#quiz'); renderQuiz();
  LEAVE_GUARD = () => { if (QZ && !QZ.done && Object.keys(QZ.answers).length) finishQuiz(true); QZ = null; return true; };
}
VIEWS.quiz = function () { if (!QZ) { go('home'); return; } renderQuiz(); };
let LASTP = null;
function passageHTML(pid, coll) {
  const p = PBY[pid]; if (!p) return '';
  const hide = coll && LASTP === pid; LASTP = pid;
  return `${coll ? `<button class="btn ghost sm pt-toggle" onclick="document.querySelector('.ptxt').classList.toggle('coll')">📖 Δείξε / κρύψε το κείμενο</button>` : ''}
    <div class="card ptxt ${hide ? 'coll' : ''}"><div class="lab" style="font-family:Commissioner">${esc(p.year ? 'Κείμενο ' + p.year : 'Κείμενο')}</div><h3 style="font-family:Commissioner;font-size:18px;margin:4px 0 10px">${esc(p.title)}</h3>${p.figure ? figHTML(p.figure) : ''}${paragraphs(p.text)}${p.source ? `<div class="src">${esc(p.source)}</div>` : ''}</div>`;
}
function qBody(q) {
  return `<div class="row" style="margin-bottom:8px">${topicTag(q.topic)}${srcTag(q)}<span class="tag">${'●'.repeat(q.difficulty || 1)}${'○'.repeat(3 - (q.difficulty || 1))}</span></div>
    <div class="stem">${esc(q.stem)}</div>${figHTML(q.figure)}`;
}
function explHTML(q, ok) {
  return `<div class="expl ${ok ? 'ok' : 'bad'}"><b>${ok ? 'Σωστά! 🎉' : 'Όχι ακριβώς — σωστή είναι η ' + q.answer + '.'}</b><div style="margin-top:6px">${md(q.explanation || '')}</div>
    ${q.tip ? `<div class="tip">💡 ${md(q.tip)}</div>` : ''}${q.note ? `<div class="note">📝 ${md(q.note)}</div>` : ''}
    ${THBY[q.topic] ? `<div class="tip"><a href="#" onclick="event.preventDefault();openChapter('${q.topic}')">📘 Θεωρία: ${esc(THBY[q.topic].title)}</a></div>` : ''}</div>`;
}
function renderQuiz() {
  const q = QZ.list[QZ.i], a = QZ.answers[q.id], n = QZ.list.length, done = Object.keys(QZ.answers).length;
  updateTabs();
  render(`<div class="progress"><button class="btn ghost sm" onclick="go('home')">✕</button><div class="bar"><i style="width:${pct(done, n)}%"></i></div><b class="small">${QZ.i + 1}/${n}</b></div>
    <div class="small mute" style="margin-bottom:6px">${esc(QZ.title)}</div>
    <div class="qwrap ${q.passage ? 'withp' : ''}">${q.passage ? passageHTML(q.passage, true) : ''}
      <div class="card">${qBody(q)}
        <div class="opts">${q.options.map(o => { let c = ''; if (a) { if (o.k === q.answer) c = 'ok'; else if (o.k === a) c = 'bad'; } return `<button class="opt ${c}" ${a ? 'disabled' : ''} onclick="answerQuiz('${o.k}')"><span class="k">${o.k}</span><span>${esc(o.t)}</span></button>`; }).join('')}</div>
        ${a ? explHTML(q, a === q.answer) : ''}
        ${a ? `<div class="row mt" style="justify-content:flex-end"><button class="btn" onclick="nextQuiz()">${QZ.i + 1 < n ? 'Επόμενη →' : 'Αποτελέσματα'}</button></div>` : ''}</div></div>`);
}
function answerQuiz(k) {
  const q = QZ.list[QZ.i]; if (QZ.answers[q.id]) return;
  QZ.answers[q.id] = k; if (canRecord()) { recordAnswer(q, k === q.answer); saveProg(); } renderQuiz();
  const e = $('.expl'); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function nextQuiz() { if (QZ.i + 1 < QZ.list.length) { QZ.i++; renderQuiz(); } else finishQuiz(); }
function finishQuiz(silent) {
  const ans = QZ.answers, ids = Object.keys(ans); const c = ids.filter(id => ans[id] === QBY[id].answer).length; const sec = (Date.now() - QZ.start) / 1000;
  QZ.done = true; LEAVE_GUARD = null;
  if (ids.length) {
    logSession({ mode: QZ.opts.mode || 'practice', title: QZ.title, topic: QZ.opts.topic || null, n: ids.length, c, sec: Math.min(sec, ids.length * 300), answers: ids.map(id => ({ q: id, a: ans[id], ok: ans[id] === QBY[id].answer })) });
    if (QZ.opts.onDone && canRecord()) QZ.opts.onDone(ids.length, c);
    completeTask(`${c}/${ids.length} σωστές`);
  }
  if (silent) { QZ = null; return; }
  const byT = {}; ids.forEach(id => { const t = QBY[id].topic; byT[t] = byT[t] || [0, 0]; byT[t][0]++; if (ans[id] === QBY[id].answer) byT[t][1]++; });
  const Z = QZ; QZ = null; updateTabs();
  render(`<h1>${c === ids.length ? 'Τέλεια! 🏆' : c >= ids.length * .7 ? 'Πολύ καλά! 👏' : 'Συνέχισε! 💪'}</h1><p class="sub">${esc(Z.title)} · ${fmtMin(sec)}</p>
    <div class="card center"><div class="big">${c} / ${ids.length}</div><div class="mute">σωστές · +${c * 10 + (ids.length - c) * 2} XP</div></div>
    <h2>Ανά ενότητα</h2><div class="card">${Object.entries(byT).map(([t, [n, k]]) => `<div class="list-item">${topicTag(t)}<span class="grow"></span><b class="${k === n ? 'pill-ok' : ''}">${k}/${n}</b></div>`).join('')}</div>
    <h2>Οι απαντήσεις σου</h2><div class="card">${Z.list.filter(q => ans[q.id]).map(q => `<div class="list-item"><span class="${ans[q.id] === q.answer ? 'pill-ok' : 'pill-bad'}">${ans[q.id] === q.answer ? '✓' : '✗'}</span><span class="grow small">${esc(q.stem.slice(0, 110))}${q.stem.length > 110 ? '…' : ''}</span><button class="btn ghost sm" onclick="reviewOne('${q.id}','${ans[q.id]}')">Λύση</button></div>`).join('')}</div>
    <div class="row mt2">${Z.opts.next ? `<button class="btn" id="qzNext">${esc(Z.opts.nextLabel || 'Συνέχεια')}</button>` : `<button class="btn" onclick="startSmart()">Άλλες 10 →</button>`}<button class="btn ghost" onclick="go('home')">Αρχική</button></div>`);
  if (Z.opts.next) $('#qzNext').onclick = Z.opts.next;
}
function reviewOne(id, a) {
  const q = QBY[id]; if (!q) return;
  modal(`${q.passage ? `<details><summary class="small mute">Κείμενο: «${esc(PBY[q.passage].title)}»</summary><div class="ptxt" style="font-size:15px">${paragraphs(PBY[q.passage].text)}</div></details>` : ''}${qBody(q)}
    <div class="opts">${q.options.map(o => `<div class="opt ro ${o.k === q.answer ? 'ok' : o.k === a ? 'bad' : ''}"><span class="k">${o.k}</span><span>${esc(o.t)}</span></div>`).join('')}</div>${explHTML(q, a === q.answer)}
    <div class="row mt" style="justify-content:flex-end">${isParent() ? `<button class="btn ghost" onclick="closeModal();noteForm({qid:'${id}'})">💬 Σημείωση στον Νικόλα</button>` : ''}<button class="btn" onclick="closeModal()">Κλείσιμο</button></div>`);
}

/* ---------- Παιχνίδια ---------- */
let GM = null;
VIEWS.games = function () {
  const b = k => (PROG.games || {})[k] || 0;
  render(`<h1>Παιχνίδια</h1><p class="sub">60 δευτερόλεπτα. Κάθε λάθος κοστίζει 3″!</p>
    <div class="grid g3">
      <button class="tile" onclick="startGame('syn')"><span class="ic">🔤</span><b>Συνώνυμα & αντώνυμα</b><span class="small mute">ρεκόρ ${b('syn')}</span></button>
      <button class="tile" onclick="startGame('def')"><span class="ic">📚</span><b>Τι σημαίνει;</b><span class="small mute">ρεκόρ ${b('def')}</span></button>
      <button class="tile" onclick="startGame('calc')"><span class="ic">⚡</span><b>Γρήγοροι υπολογισμοί</b><span class="small mute">ρεκόρ ${b('calc')}</span></button>
    </div>
    <h2>Λέξεις της εβδομάδας</h2><div class="card">${weekWords().map(v => `<div class="list-item"><div class="grow"><b>${esc(v.w)}</b> <span class="small mute">— ${esc(v.def)}</span><div class="small">Συν.: <b>${esc(v.syn)}</b>${v.ant ? ` · Αντ.: <b>${esc(v.ant)}</b>` : ''}</div><div class="small mute"><i>«${esc(v.ex)}»</i></div></div></div>`).join('')}</div>`);
};
function weekWords() { const V = C.vocab; const wk = Math.floor((Date.now() / DAYMS + 3) / 7); return [...Array(6)].map((_, i) => V[(wk * 6 + i) % V.length]); }
function genCalc() {
  const t = Math.random() * 7 | 0; let qq, ans, wr = []; const fmt = n => String(n).replace('.', ',');
  if (t === 0) { const p = pick([10, 20, 25, 50, 75, 5, 15]); const n = pick([20, 40, 60, 80, 120, 200, 240, 360, 400, 500].filter(x => x * p % 100 === 0)); qq = `${p}% του ${n}`; ans = n * p / 100; wr = [n * p / 10, ans + p, n - ans, ans * 2]; }
  else if (t === 1) { const d = pick([2, 3, 4, 5, 6, 8]); const k = 1 + (Math.random() * (d - 1) | 0); const n = d * pick([3, 4, 5, 6, 7, 8, 9, 12]); qq = `Τα ${k}/${d} του ${n}`; ans = n / d * k; wr = [n / d, ans + k, n - ans, n * k]; }
  else if (t === 2) { const h = 8 + (Math.random() * 10 | 0), m = pick([5, 10, 15, 20, 25, 35, 40, 45, 50]), dh = Math.random() * 3 | 0, dm = pick([15, 20, 25, 30, 40, 45, 50]); const tot = h * 60 + m + dh * 60 + dm; const f = x => `${Math.floor(x / 60)}:${z2(x % 60)}`; qq = `${h}:${z2(m)} + ${dh ? dh + ' ώρ. ' : ''}${dm} λεπτά`; ans = f(tot); wr = [f(tot + 60), f(tot - 10), f(tot - 60), f(tot + 10)]; }
  else if (t === 3) { const a = 2 + (Math.random() * 9 | 0), b = 2 + (Math.random() * 8 | 0), c = 2 + (Math.random() * 8 | 0); qq = `${a} + ${b} × ${c}`; ans = a + b * c; wr = [(a + b) * c, a * b + c, a + b + c, ans + 1]; }
  else if (t === 4) { const x = pick([2.5, 0.4, 1.25, 3.6, 0.75, 12.5, 4.8]); const k = pick([10, 100]); qq = `${fmt(x)} × ${k}`; ans = fmt(+(x * k).toFixed(3)); wr = [fmt(+(x * k / 10).toFixed(3)), fmt(+(x * k * 10).toFixed(3)), fmt(+(x + k).toFixed(3)), fmt(+(x / k).toFixed(4))]; }
  else if (t === 5) { const pr = pick([20, 40, 50, 60, 80, 120]); const p = pick([10, 20, 25, 50]); qq = `${pr} € με έκπτωση ${p}%`; ans = (pr - pr * p / 100) + ' €'; wr = [pr * p / 100 + ' €', (pr - p) + ' €', (pr + pr * p / 100) + ' €', (pr - pr * p / 100 + 5) + ' €']; }
  else { const F = [[1, 2], [1, 3], [2, 3], [3, 4], [1, 4], [2, 5], [3, 5], [5, 6]]; const a = pick(F), b = pick(F); if (a[0] * b[1] === b[0] * a[1]) return genCalc(); qq = `Μεγαλύτερο: ${a[0]}/${a[1]} ή ${b[0]}/${b[1]};`; ans = (a[0] * b[1] > b[0] * a[1] ? a : b).join('/'); wr = [(a[0] * b[1] > b[0] * a[1] ? b : a).join('/'), 'Είναι ίσα']; }
  ans = String(ans); const opts = [ans]; for (const w of shuffle(wr.map(String))) { if (opts.length >= 4) break; if (!opts.includes(w) && !/NaN|-/.test(w)) opts.push(w); }
  return { q: qq, ans, opts: shuffle(opts) };
}
function genWord(kind) {
  const V = C.vocab;
  if (kind === 'def') { const v = pick(V); return { q: v.def, ans: v.w, opts: shuffle([v.w, ...shuffle(V.filter(x => x.w !== v.w)).slice(0, 3).map(x => x.w)]), label: 'Ποια λέξη σημαίνει:' }; }
  const useAnt = Math.random() < .45; const v = pick(useAnt ? V.filter(x => x.ant) : V); const ans = useAnt ? v.ant : v.syn;
  const opts = [ans]; if (useAnt && v.syn && Math.random() < .6) opts.push(v.syn);
  for (const d of shuffle(V.filter(x => x.w !== v.w)).slice(0, 8).map(x => pick([x.syn, x.w, x.ant].filter(Boolean)))) { if (opts.length >= 4) break; if (!opts.includes(d) && d !== v.w) opts.push(d); }
  return { q: v.w, ans, opts: shuffle(opts), label: useAnt ? 'Βρες το ΑΝΤΙΘΕΤΟ' : 'Βρες λέξη με ΙΔΙΑ σημασία' };
}
function startGame(kind) { GM = { kind, score: 0, wrong: 0, end: Date.now() + 60000, start: Date.now(), missed: [], lock: false }; CUR = 'game'; history.replaceState(null, '', '#game'); updateTabs(); nextGame(); TIMERS.push(setInterval(gameTick, 200)); }
VIEWS.game = () => go('games');
function nextGame() { GM.cur = GM.kind === 'calc' ? genCalc() : genWord(GM.kind); GM.lock = false; const c = GM.cur;
  render(`<div class="row" style="justify-content:space-between"><button class="btn ghost sm" onclick="stopTimers();GM=null;go('games')">✕</button><b style="font-size:20px">⭐ ${GM.score}</b><span class="timer" id="gt">60″</span></div>
    <div class="bar mt"><i id="gbar" style="width:100%;background:var(--warn)"></i></div>
    <div class="card mt2 center"><div class="small mute" style="font-weight:700">${GM.kind === 'calc' ? 'Υπολόγισε' : esc(c.label)}</div>
    <div class="game-word" style="${GM.kind === 'def' ? 'font-size:20px;font-weight:600' : ''}">${esc(c.q)}</div>
    <div class="opts" style="grid-template-columns:1fr 1fr">${c.opts.map((o, i) => `<button class="opt" style="justify-content:center;font-weight:700;font-size:18px" onclick="answerGame(${i},this)">${esc(o)}</button>`).join('')}</div></div>`); gameTick(); }
function gameTick() { if (!GM) return; const left = Math.max(0, GM.end - Date.now()); const el = $('#gt'); if (el) el.textContent = Math.ceil(left / 1000) + '″'; const b = $('#gbar'); if (b) b.style.width = (left / 600) + '%'; if (left <= 0) endGame(); }
function answerGame(i, el) { if (GM.lock) return; GM.lock = true; const c = GM.cur; const ok = c.opts[i] === c.ans; el.classList.add(ok ? 'ok' : 'bad');
  if (ok) GM.score++; else { GM.wrong++; GM.end -= 3000; GM.missed.push(c); $$('.opt').forEach((b, j) => { if (c.opts[j] === c.ans) b.classList.add('ok'); }); }
  setTimeout(() => { if (GM) nextGame(); }, ok ? 250 : 900); }
function endGame() { stopTimers(); const g = GM; GM = null; PROG.games = PROG.games || {}; const rec = g.score > (PROG.games[g.kind] || 0); if (rec) PROG.games[g.kind] = g.score; PROG.xp = (PROG.xp || 0) + g.score * 3; saveProg();
  logSession({ mode: 'game', title: { syn: 'Συνώνυμα & αντώνυμα', def: 'Τι σημαίνει;', calc: 'Γρήγοροι υπολογισμοί' }[g.kind], n: g.score + g.wrong, c: g.score, sec: (Date.now() - g.start) / 1000 });
  CUR = 'gameres'; history.replaceState(null, '', '#games'); updateTabs();
  render(`<h1>${rec ? 'Νέο ρεκόρ! 🏆' : 'Τέλος χρόνου!'}</h1><div class="card center"><div class="big">${g.score}</div><div class="mute">σωστές · ${g.wrong} λάθη</div></div>
    ${g.missed.length ? `<h2>Να θυμάσαι</h2><div class="card">${g.missed.slice(0, 8).map(m => `<div class="list-item"><span class="grow">${esc(m.q)}</span><b>${esc(m.ans)}</b></div>`).join('')}</div>` : ''}
    <div class="row mt2"><button class="btn" onclick="startGame('${g.kind}')">Ξανά!</button><button class="btn ghost" onclick="route()">Παιχνίδια</button></div>`); }

/* ---------- Πληροφορίες εξέτασης ---------- */
VIEWS.info = function () {
  const E = C.exam;
  render(`<h1>Για την εξέταση</h1>
  <div class="grid g2">
    <div class="card"><h3>📅 Πότε</h3><ul class="clean"><li>Εξέταση: <b>${fmtDate(parseDay(examDate()), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</b>${E.dateEstimated && !SET.examDate ? ` <span class="tag exam">εκτίμηση</span><div class="small mute">${esc(E.dateNote)}</div>` : ''}</li><li>${esc(E.applications)}</li><li>Είσοδος ως τις <b>${E.arrive}</b>, έναρξη <b>${E.start}</b>.</li></ul></div>
    <div class="card"><h3>📝 Πώς είναι</h3><ul class="clean"><li>Μία δοκιμασία <b>${E.minutes} λεπτών</b>: Γλώσσα (01–20) + Μαθηματικά (21–40).</li><li>Α΄ ομάδα: 4 επιλογές, <b>2 μονάδες</b>. Β΄ ομάδα: 5 επιλογές, <b>3 μονάδες</b>. Σύνολο 100.</li><li>Απαντάς σε <b>φύλλο απαντήσεων</b>: γεμίζεις ολόκληρο τον κύκλο. ✓ ή Χ δεν μετράνε· δύο κύκλοι στην ίδια ερώτηση = 0.</li><li>Δεν υπάρχει αρνητική βαθμολογία → μην αφήνεις κενά.</li></ul></div>
  </div>
  ${(E.announcements || []).length ? `<h2>Ανακοινώσεις</h2><div class="card">${E.announcements.map(a => `<div class="list-item"><span class="small mute" style="width:90px">${fmtDate(parseDay(a.date), { day: 'numeric', month: 'short', year: 'numeric' })}</span><span class="grow">${esc(a.text)}</span></div>`).join('')}</div>` : ''}
  <h2>Την ημέρα της εξέτασης</h2><div class="card"><ul class="clean"><li>Πάρε μαζί την εκτυπωμένη αίτηση με τον 6ψήφιο κωδικό υποψηφίου.</li><li>Πρώτα όσες ξέρεις σίγουρα· σημάδεψε τις δύσκολες και γύρνα μετά.</li><li>Πρόσεξε τις ερωτήσεις «ποιο <b>δεν</b>…».</li><li>Τα τελευταία 10′: έλεγξε ότι όλο το φύλλο είναι συμπληρωμένο σωστά.</li></ul></div>
  <div class="row mt2"><button class="btn ghost" onclick="go('home')">← Πίσω</button></div>`);
};
