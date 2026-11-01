"use strict";
/* ================= ΓΟΝΕΙΣ ================= */
const MODE_LABEL = { practice: 'Εξάσκηση', smart: 'Έξυπνη εξάσκηση', mistakes: 'Λάθη', reading: 'Κείμενο', lesson: 'Θεωρία', 'lesson-check': 'Έλεγχος μαθήματος', 'chapter-test': 'Τεστ κεφαλαίου', mock: 'Διαγώνισμα', game: 'Παιχνίδι' };
function setSettings(obj) { return FB.setDoc(R.set(), obj, { merge: true }).then(() => toast('Αποθηκεύτηκε')).catch(e => toast('Σφάλμα: ' + e.message)); }
function myFocus() { return USER.focus || 'math'; }
function minutesByDay(n) { const out = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(Date.now() - i * DAYMS); out.push([d, Math.round(secondsOn(todayStr(d)) / 60)]); } return out; }
function sessLine(s) {
  return `<div class="list-item"><span class="small mute" style="width:84px">${fmtDate(s.ts, { weekday: 'short', day: 'numeric', month: 'short' })}<br>${fmtTime(s.ts)}</span>
    <span class="grow"><b>${esc(s.title || MODE_LABEL[s.mode] || s.mode)}</b><div class="small mute">${MODE_LABEL[s.mode] || ''}${s.n ? ` · ${s.c}/${s.n} σωστές` : ''} · ${fmtMin(s.sec || 0)}</div></span>
    ${s.answers && s.answers.length ? `<button class="btn ghost sm" onclick="sessionDetail('${s.id}')">Απαντήσεις</button>` : ''}</div>`;
}

/* ---------- Επισκόπηση ---------- */
VIEWS['p-home'] = function () {
  const f = myFocus(), other = f === 'lang' ? 'math' : 'lang';
  const ch = currentChapter(), cp = chapterProgress(ch), th = THBY[ch];
  const week = minutesByDay(7), goal = SET.dailyMin || 25, mx = Math.max(goal, ...week.map(x => x[1]));
  const st = { lang: subjectStats('lang'), math: subjectStats('math') };
  const open = TASKS.filter(t => t.status !== 'done'), done = TASKS.filter(t => t.status === 'done').slice(0, 3);
  const lastMock = MOCKS[0];
  render(`<h1>Πρόοδος του Νικόλα</h1><p class="sub">${daysToExam()} μέρες ως την εξέταση · ${fmtDate(parseDay(examDate()), { day: 'numeric', month: 'long', year: 'numeric' })}${C.exam.dateEstimated && !SET.examDate ? ' (εκτίμηση)' : ''}</p>
    <div class="card hero"><div class="lab" style="color:rgba(255,255,255,.8)">Τρέχον κεφάλαιο${SET.currentChapter ? ' (το ορίσατε εσείς)' : ' (από το πρόγραμμα)'}</div>
      <div class="big">${esc(th ? th.title : TOP[ch].name)}</div><div class="mute">${SUBJ[TOP[ch].subject]} · μαθήματα ${cp.lessonsDone}/${cp.lessons}${cp.test ? ` · τεστ ${cp.test.score}%` : ' · τεστ: όχι ακόμα'}${cp.stats.acc !== null ? ` · ${Math.round(cp.stats.acc * 100)}% σωστές στην ενότητα` : ''}</div>
      <div class="row mt"><button class="btn sm" style="background:#fff;color:var(--acc)" onclick="go('chapter','${ch}')">Θεωρία & οδηγός γονέα</button><button class="btn sm" style="background:rgba(255,255,255,.18)" onclick="taskForm({action:'chapter:${ch}',title:'Θεωρία: ${esc(TOP[ch].name)}'})">📌 Ανάθεση</button></div></div>
    <div class="grid g4 mt">
      <div class="card"><div class="lab">Σήμερα</div><div class="big">${week[6][1]}′</div><div class="small mute">στόχος ${goal}′</div></div>
      <div class="card"><div class="lab">Σερί</div><div class="big">🔥 ${streak()}</div><div class="small mute">μέρες</div></div>
      <div class="card"><div class="lab">${SUBJ[f]}</div><div class="big" style="color:var(--${f})">${st[f].acc === null ? '—' : Math.round(st[f].acc * 100) + '%'}</div><div class="small mute">${st[f].att} απαντήσεις</div></div>
      <div class="card"><div class="lab">${SUBJ[other]}</div><div class="big" style="color:var(--${other})">${st[other].acc === null ? '—' : Math.round(st[other].acc * 100) + '%'}</div><div class="small mute">${st[other].att} απαντήσεις</div></div>
    </div>
    <h2>Τελευταίες 7 μέρες</h2><div class="card"><div style="display:flex;gap:8px;align-items:flex-end;height:110px">${week.map(([d, m]) => `<div style="flex:1;text-align:center"><div style="height:${Math.round(80 * m / mx)}px;background:${m >= goal * .8 ? 'var(--ok)' : 'var(--acc)'};border-radius:6px 6px 0 0;min-height:2px"></div><div class="small mute">${DOW[d.getDay()]}</div><div class="small"><b>${m}</b></div></div>`).join('')}</div></div>
    <h2>Πού χρειάζεται βοήθεια (${SUBJ[f]})</h2><div class="card">${topicBars(f)}</div>
    <details class="mt"><summary class="small"><b>${SUBJ[other]}</b></summary><div class="card mt">${topicBars(other)}</div></details>
    <h2>Αναθέσεις</h2><div class="card">${open.length ? open.map(t => `<div class="list-item"><span class="grow"><b>${esc(t.title)}</b><div class="small mute">${esc(t.byName)}${t.due ? ' · ως ' + fmtDate(parseDay(t.due), { day: 'numeric', month: 'short' }) : ''}</div></span><span class="tag exam">σε εκκρεμότητα</span></div>`).join('') : '<div class="small mute">Καμία ανοιχτή ανάθεση.</div>'}
      ${done.map(t => `<div class="list-item"><span class="grow"><b>${esc(t.title)}</b><div class="small mute">έγινε ${t.doneTs ? fmtDate(t.doneTs, { day: 'numeric', month: 'short' }) : ''}${t.result ? ' · ' + esc(t.result) : ''}</div></span><span class="pill-ok">✓</span></div>`).join('')}
      <div class="row mt"><button class="btn sm" onclick="taskForm({})">📌 Νέα ανάθεση</button><button class="btn sm ghost" onclick="noteForm({})">💬 Σημείωση στον Νικόλα</button></div></div>
    <h2>Πρόσφατη δουλειά</h2><div class="card">${SESS.length ? SESS.slice(0, 8).map(sessLine).join('') : '<div class="small mute">Δεν έχει δουλέψει ακόμα.</div>'}<div class="row mt"><button class="btn sm ghost" onclick="go('history')">Όλο το ιστορικό →</button></div></div>
    ${lastMock ? `<h2>Τελευταίο διαγώνισμα</h2><div class="card"><div class="list-item"><span class="grow"><b>${esc(lastMock.title)}</b><div class="small mute">${fmtDate(lastMock.ts, { day: 'numeric', month: 'short' })} · Γλ. ${lastMock.langPct ?? '—'}% · Μαθ. ${lastMock.mathPct ?? '—'}%</div></span><b>${lastMock.score}/${lastMock.max}</b><button class="btn ghost sm" onclick="showMockResult('${lastMock.id}')">Δες</button></div></div>` : ''}`);
};
function topicBars(sj) {
  return C.topics.filter(t => t.subject === sj).map(t => { const s = topicStats(t.id); const p = chapterProgress(t.id); const a = s.acc === null ? null : Math.round(s.acc * 100);
    return `<div class="stat-row"><span class="nm"><a href="#" onclick="event.preventDefault();go('chapter','${t.id}')">${esc(t.name)}</a></span><span class="bar"><i style="width:${a || 0}%;background:${a === null ? 'var(--line)' : a < 60 ? 'var(--bad)' : a < 80 ? 'var(--warn)' : 'var(--ok)'}"></i></span><span class="small" style="width:82px;text-align:right">${a === null ? '—' : a + '%'} · θ ${p.lessonsDone}/${p.lessons}</span></div>`; }).join('')
    + `<div class="small mute mt">% σωστές απαντήσεις · θ = μαθήματα θεωρίας που ολοκλήρωσε</div>`;
}

/* ---------- Κεφάλαια ---------- */
VIEWS['p-chapters'] = function () {
  const ch = currentChapter(); const f = myFocus();
  const sorted = [...C.topics].sort((a, b) => (a.subject === f ? 0 : 1) - (b.subject === f ? 0 : 1) || CHAPTER_ORDER.indexOf(a.id) - CHAPTER_ORDER.indexOf(b.id));
  const lastAct = id => { const s = SESS.find(x => x.topic === id || (x.answers || []).some(a => QBY[a.q] && QBY[a.q].topic === id)); return s ? fmtDate(s.ts, { day: 'numeric', month: 'short' }) : '—'; };
  render(`<h1>Κεφάλαια</h1><p class="sub">Η θεωρία που βλέπει ο Νικόλας, με οδηγό για εσάς: τι να ελέγξετε, δραστηριότητες, ερωτήσεις-διάγνωση.</p>
    <div class="card">${sorted.map(t => { const p = chapterProgress(t.id); const s = p.stats; return `<div class="list-item"><span class="grow">${topicTag(t.id)}<br><b>${esc(THBY[t.id] ? THBY[t.id].title : t.name)}</b>${t.id === ch ? ' <span class="tag new">τρέχον</span>' : ''}<div class="small mute">μαθήματα ${p.lessonsDone}/${p.lessons} · τεστ ${p.test ? p.test.score + '%' : '—'} · σωστές ${s.acc === null ? '—' : Math.round(s.acc * 100) + '%'} · τελευταία φορά ${lastAct(t.id)}</div></span><button class="btn sm ghost" onclick="go('chapter','${t.id}')">Άνοιγμα</button></div>`; }).join('')}</div>`);
};
function parentChapterBox(id) {
  const th = THBY[id]; const g = th.parentGuide || {}; const p = chapterProgress(id);
  const sess = SESS.filter(s => s.topic === id).slice(0, 8);
  const ls = LESSONS.filter(l => l.chapter === id);
  const lessonRows = th.lessons.map(l => { const d = (PROG.lessons || {})[l.id]; return `<div class="list-item"><span class="chk ${d ? 'on' : ''}">${d ? '✓' : ''}</span><span class="grow small">${esc(l.title)}${d ? ` <span class="mute">· ${fmtDate(d.ts, { day: 'numeric', month: 'short' })}${d.score !== null && d.score !== undefined ? ' · έλεγχος ' + d.score + '%' : ''}</span>` : ''}</span></div>`; }).join('');
  return `<h2>👩‍🏫 Για τους γονείς</h2><div class="parentbox">
    ${g.summary ? `<p style="margin-top:0">${md(g.summary)}</p>` : ''}
    ${g.activities && g.activities.length ? `<b>Δραστηριότητες στο σπίτι</b><ul>${g.activities.map(a => `<li>${md(a)}</li>`).join('')}</ul>` : ''}
    ${g.diagnostic && g.diagnostic.length ? `<b>Ερωτήσεις για να δείτε αν το κατάλαβε</b><ul>${g.diagnostic.map(a => `<li>${md(a)}</li>`).join('')}</ul>` : ''}
    <div class="row mt"><button class="btn sm" onclick="taskForm({action:'chapter:${id}',title:'Θεωρία: ${esc(TOP[id].name)}'})">📌 Ανάθεση θεωρίας</button><button class="btn sm ghost" onclick="taskForm({action:'test:${id}',title:'Τεστ: ${esc(TOP[id].name)}'})">📌 Ανάθεση τεστ</button>
      <button class="btn sm ghost" onclick="lessonForm('${id}')">📝 Κάναμε μάθημα</button>
      ${SET.currentChapter === id ? `<button class="btn sm ghost" onclick="setSettings({currentChapter:null})">↺ Αυτόματο τρέχον κεφάλαιο</button>` : `<button class="btn sm ghost" onclick="setSettings({currentChapter:'${id}'})">⭐ Κάν' το τρέχον</button>`}</div></div>
    <h2>Η πρόοδός του εδώ</h2><div class="card">${lessonRows}<div class="small mute mt">Τεστ κεφαλαίου: ${p.test ? `${p.test.score}% (${fmtDate(p.test.ts, { day: 'numeric', month: 'short' })})` : 'δεν έχει γίνει'} · σωστές στην ενότητα: ${p.stats.acc === null ? '—' : Math.round(p.stats.acc * 100) + '%'} (${p.stats.seen}/${p.stats.total} ερωτήσεις)</div></div>
    ${sess.length ? `<div class="card mt">${sess.map(sessLine).join('')}</div>` : ''}
    ${ls.length ? `<h2>Μαθήματα με γονιό</h2><div class="card">${ls.map(l => `<div class="list-item"><span class="small mute" style="width:80px">${fmtDate(parseDay(l.date), { day: 'numeric', month: 'short' })}</span><span class="grow"><b>${esc(l.byName)}</b> · ${l.minutes || '?'}′<div class="small">${md(l.text || '')}</div></span></div>`).join('')}</div>` : ''}`;
}
function lessonForm(ch) {
  modal(`<h3 style="margin-top:0">Μάθημα με τον Νικόλα</h3><div class="small mute">${esc(TOP[ch].name)}</div>
    <div class="field mt"><label>Ημερομηνία</label><input type="date" id="lfD" value="${todayStr()}"></div>
    <div class="field"><label>Λεπτά</label><input type="number" id="lfM" value="30" min="5" max="240"></div>
    <div class="field"><label>Τι κάνατε / τι παρατηρήσατε</label><textarea id="lfT" placeholder="π.χ. δουλέψαμε τις αντωνυμίες στο κείμενο της σελ. 34· μπερδεύει ακόμα το «του» με το «τού»"></textarea></div>
    <label class="row small"><input type="checkbox" id="lfN"> Να το δει και ο Νικόλας ως σημείωση</label>
    <div class="row mt" style="justify-content:flex-end"><button class="btn ghost" onclick="closeModal()">Άκυρο</button><button class="btn" onclick="saveLessonForm('${ch}')">Αποθήκευση</button></div>`);
}
function saveLessonForm(ch) {
  const o = { chapter: ch, date: $('#lfD').value || todayStr(), minutes: +$('#lfM').value || 0, text: $('#lfT').value.trim() };
  addDocTo('lessons', o); if ($('#lfN').checked && o.text) addDocTo('notes', { text: o.text, chapter: ch, seen: false });
  closeModal(); toast('Καταγράφηκε'); route(true);
}

/* ---------- Αναθέσεις ---------- */
function taskTargets() {
  const T = [['', '— Χωρίς σύνδεσμο (ελεύθερη εργασία) —']];
  C.theory.forEach(th => { T.push(['chapter:' + th.id, '📘 Θεωρία: ' + th.title]); th.lessons.forEach(l => T.push(['lesson:' + l.id, '　· μάθημα: ' + l.title])); });
  C.topics.forEach(t => T.push(['topic:' + t.id, '✏️ 10 ερωτήσεις: ' + t.name], ['test:' + t.id, '📝 Τεστ κεφαλαίου: ' + t.name]));
  T.push(['smart', '🧠 Έξυπνη εξάσκηση'], ['mistakes', '🔁 Τα λάθη του'], ['reading', '📖 Ένα κείμενο (επιλογή του)']);
  C.passages.forEach(p => { if (Q.some(q => q.passage === p.id)) T.push(['passage:' + p.id, '📖 Κείμενο: ' + p.title]); });
  OFFICIAL_YEARS.forEach(y => T.push(['exam:off-' + y, `⏱️ Επίσημα θέματα ${y}`]));
  T.push(['exam:gen-full', '⏱️ Νέο πλήρες διαγώνισμα'], ['exam:gen-lang', '⏱️ Μισό: Γλώσσα'], ['exam:gen-math', '⏱️ Μισό: Μαθηματικά']);
  return T;
}
function taskForm(pre) {
  pre = pre || {};
  modal(`<h3 style="margin-top:0">Νέα ανάθεση</h3>
    <div class="field"><label>Τι να κάνει</label><select id="tfA" onchange="if(!$('#tfT').dataset.touched)$('#tfT').value=this.options[this.selectedIndex].text.replace(/^[^\\wΑ-ωά-ώ]+/,'').replace(/^·\\s*μάθημα:\\s*/,'')">${taskTargets().map(([v, l]) => `<option value="${esc(v)}" ${v === (pre.action || '') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
    <div class="field"><label>Τίτλος που θα δει</label><input type="text" id="tfT" value="${esc(pre.title || '')}" oninput="this.dataset.touched=1"></div>
    <div class="field"><label>Μήνυμα (προαιρετικό)</label><textarea id="tfX" placeholder="π.χ. Πρόσεξε τις ερωτήσεις με «δεν»."></textarea></div>
    <div class="field"><label>Ως πότε (προαιρετικό)</label><input type="date" id="tfD"></div>
    <div class="row mt" style="justify-content:flex-end"><button class="btn ghost" onclick="closeModal()">Άκυρο</button><button class="btn" onclick="saveTask()">Ανάθεση</button></div>`);
}
function saveTask() {
  const action = $('#tfA').value || null; const title = $('#tfT').value.trim() || ($('#tfA').selectedOptions[0] || {}).text || 'Εργασία';
  addDocTo('tasks', { action, title, text: $('#tfX').value.trim(), due: $('#tfD').value || null, status: 'open' });
  closeModal(); toast('Ανατέθηκε στον Νικόλα'); route(true);
}
VIEWS['p-tasks'] = function () {
  const open = TASKS.filter(t => t.status !== 'done'), done = TASKS.filter(t => t.status === 'done');
  const row = t => `<div class="list-item"><span class="grow"><b>${esc(t.title)}</b><div class="small mute">${esc(t.byName)} · ${fmtDate(t.ts, { day: 'numeric', month: 'short' })}${t.due ? ' · ως ' + fmtDate(parseDay(t.due), { day: 'numeric', month: 'short' }) : ''}${t.text ? ' · «' + esc(t.text) + '»' : ''}</div>
    ${t.status === 'done' ? `<div class="small">✓ έγινε ${t.doneTs ? fmtDate(t.doneTs, { day: 'numeric', month: 'short' }) + ' ' + fmtTime(t.doneTs) : ''}${t.result ? ' · <b>' + esc(t.result) + '</b>' : ''}</div>` : ''}</span>
    <button class="btn ghost sm" onclick="confirmBox('Διαγραφή της ανάθεσης;','Διαγραφή',()=>delDoc('tasks','${t.id}'),true)">🗑</button></div>`;
  render(`<h1>Αναθέσεις</h1><p class="sub">Ό,τι αναθέτετε εμφανίζεται πρώτο στην αρχική του Νικόλα. Όταν το ολοκληρώσει, σημειώνεται μόνο του με το αποτέλεσμα.</p>
    <button class="btn" onclick="taskForm({})">📌 Νέα ανάθεση</button>
    <h2>Ανοιχτές (${open.length})</h2><div class="card">${open.length ? open.map(row).join('') : '<div class="small mute">Καμία.</div>'}</div>
    <h2>Ολοκληρωμένες</h2><div class="card">${done.length ? done.slice(0, 40).map(row).join('') : '<div class="small mute">Καμία ακόμα.</div>'}</div>
    <h2>Σημειώσεις που στείλατε</h2><button class="btn sm ghost" onclick="noteForm({})">💬 Νέα σημείωση</button><div class="card mt">${NOTES.length ? NOTES.slice(0, 30).map(n => `<div class="list-item"><span class="grow small"><b>${esc(n.byName)}</b> · ${fmtDate(n.ts, { day: 'numeric', month: 'short' })} · ${n.seen ? '👁 την είδε' : 'δεν την έχει δει'}<div>${md(n.text)}</div></span><button class="btn ghost sm" onclick="delDoc('notes','${n.id}')">🗑</button></div>`).join('') : '<div class="small mute">Καμία.</div>'}</div>`);
};
function noteForm(o) {
  o = o || {}; const q = o.qid && QBY[o.qid];
  modal(`<h3 style="margin-top:0">Σημείωση στον Νικόλα</h3>${q ? `<div class="small mute">Για την ερώτηση: ${esc(q.srcLabel)} — «${esc(q.stem.slice(0, 80))}…»</div>` : ''}
    <div class="field mt"><textarea id="nfT" placeholder="Γράψε κάτι ενθαρρυντικό ή μια εξήγηση…"></textarea></div>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost" onclick="closeModal()">Άκυρο</button><button class="btn" onclick="saveNote(${o.qid ? `'${o.qid}'` : 'null'},${o.chapter ? `'${o.chapter}'` : 'null'})">Αποστολή</button></div>`);
  setTimeout(() => $('#nfT') && $('#nfT').focus(), 50);
}
function saveNote(qid, chapter) { const t = $('#nfT').value.trim(); if (!t) return; addDocTo('notes', { text: t, qid: qid || null, chapter: chapter || null, seen: false }); closeModal(); toast('Στάλθηκε'); }

/* ---------- Ιστορικό ---------- */
let HF = 'all';
VIEWS['p-history'] = function () {
  const match = s => HF === 'all' || (HF === 'mock' ? s.mode === 'mock' : (s.topic ? TOP[s.topic] && TOP[s.topic].subject === HF : (s.answers || []).some(a => QBY[a.q] && QBY[a.q].subject === HF)));
  const list = SESS.filter(match); const byDay = {}; list.forEach(s => (byDay[s.day] = byDay[s.day] || []).push(s));
  render(`<h1>Ιστορικό</h1><p class="sub">Κάθε συνεδρία με τις απαντήσεις του. Μπορείτε να αφήσετε σημείωση σε οποιαδήποτε απάντηση.</p>
    <div class="row">${[['all', 'Όλα'], ['lang', 'Γλώσσα'], ['math', 'Μαθηματικά'], ['mock', 'Διαγωνίσματα']].map(([k, l]) => `<button class="chip ${k === 'lang' || k === 'math' ? k : ''} ${HF === k ? 'on' : ''}" onclick="HF='${k}';route()">${l}</button>`).join('')}</div>
    ${MOCKS.length && (HF === 'all' || HF === 'mock') ? `<h2>Διαγωνίσματα</h2><div class="card">${MOCKS.map(m => `<div class="list-item"><span class="small mute" style="width:70px">${fmtDate(m.ts, { day: 'numeric', month: 'short' })}</span><span class="grow"><b>${esc(m.title)}</b><div class="small mute">${m.mode === 'sheet' ? '📄 με φύλλο · ' : ''}${fmtMin(m.sec)} · Γλ. ${m.langPct ?? '—'}% · Μαθ. ${m.mathPct ?? '—'}%${m.code && m.code.issues && m.code.issues.length ? ' · ⚠️ κωδικός' : ''}</div></span><b>${m.score}/${m.max}</b><button class="btn sm ghost" onclick="showMockResult('${m.id}')">Δες</button></div>`).join('')}</div>` : ''}
    ${HF !== 'mock' && LESSONS.length ? `<h2>Μαθήματα με γονιό</h2><div class="card">${LESSONS.slice(0, 20).map(l => `<div class="list-item"><span class="small mute" style="width:70px">${fmtDate(parseDay(l.date), { day: 'numeric', month: 'short' })}</span><span class="grow"><b>${esc(TOP[l.chapter] ? TOP[l.chapter].name : '')}</b> · ${esc(l.byName)} · ${l.minutes}′<div class="small">${md(l.text || '')}</div></span><button class="btn ghost sm" onclick="delDoc('lessons','${l.id}')">🗑</button></div>`).join('')}</div>` : ''}
    <h2>Συνεδρίες</h2>${Object.keys(byDay).length ? Object.entries(byDay).map(([d, ss]) => `<div class="lab mt">${fmtDate(parseDay(d), { weekday: 'long', day: 'numeric', month: 'long' })} · ${fmtMin(ss.reduce((a, s) => a + (s.sec || 0), 0))}</div><div class="card">${ss.map(sessLine).join('')}</div>`).join('') : '<div class="card small mute">Τίποτα ακόμα.</div>'}`);
};
function sessionDetail(id) {
  const s = SESS.find(x => x.id === id); if (!s) return;
  modal(`<h3 style="margin-top:0">${esc(s.title)}</h3><div class="small mute">${fmtDate(s.ts, { weekday: 'long', day: 'numeric', month: 'long' })} ${fmtTime(s.ts)} · ${s.c}/${s.n} σωστές · ${fmtMin(s.sec)}</div>
    <div class="mt">${(s.answers || []).map(a => { const q = QBY[a.q]; if (!q) return ''; return `<div class="list-item"><span class="${a.ok ? 'pill-ok' : 'pill-bad'}">${a.ok ? '✓' : '✗'}</span><span class="grow small">${esc(q.stem.slice(0, 100))}${q.stem.length > 100 ? '…' : ''}<div class="mute">${topicTag(q.topic)} έδωσε <b>${esc(a.a)}</b>${a.ok ? '' : ' · σωστό <b>' + q.answer + '</b>'}</div></span><button class="btn ghost sm" onclick="reviewOne('${a.q}','${esc(a.a)}')">Λύση</button></div>`; }).join('')}</div>
    <div class="row mt" style="justify-content:flex-end">${(s.answers || []).some(a => !a.ok) ? `<button class="btn ghost" onclick="assignWrong('${s.id}')">📌 Ανάθεσε ξανά τα λάθη</button>` : ''}<button class="btn" onclick="closeModal()">Κλείσιμο</button></div>`);
}

/* ---------- Ρυθμίσεις ---------- */
VIEWS['p-settings'] = function () {
  const E = C.exam;
  render(`<h1>Ρυθμίσεις</h1>
    <div class="card"><div class="field"><label>Ημερομηνία εξέτασης</label><input type="date" id="sD" value="${esc(SET.examDate || '')}"><div class="small mute">Κενό = ${fmtDate(parseDay(E.date), { day: 'numeric', month: 'long', year: 'numeric' })}${E.dateEstimated ? ' (εκτίμηση: ' + esc(E.dateNote) + ')' : ''}. Θα ενημερωθεί και με το περιεχόμενο όταν ανακοινωθεί.</div></div>
      <div class="field"><label>Στόχος λεπτών τη μέρα</label><input type="number" id="sM" min="10" max="120" value="${SET.dailyMin || 25}"></div>
      <div class="field"><label>Έναρξη προγράμματος</label><input type="date" id="sP" value="${esc(SET.planStart || '2026-11-02')}"></div>
      <div class="field"><label>Τρέχον κεφάλαιο</label><select id="sC"><option value="">Αυτόματα από το πρόγραμμα</option>${CHAPTER_ORDER.map(c => `<option value="${c}" ${SET.currentChapter === c ? 'selected' : ''}>${esc(THBY[c] ? THBY[c].title : TOP[c].name)} (${SUBJ[TOP[c].subject]})</option>`).join('')}</select></div>
      <button class="btn" onclick="setSettings({examDate:$('#sD').value||null,dailyMin:+$('#sM').value||25,planStart:$('#sP').value||null,currentChapter:$('#sC').value||null})">Αποθήκευση</button></div>
    <h2>Περιεχόμενο</h2><div class="card small">Έκδοση <b>${C.version}</b> · ${Q.length} ερωτήσεις (${Q.filter(q => q.kind === 'exam').length} από εξετάσεις, ${Q.filter(q => q.kind === 'indicative' || q.kind === 'collection').length} ενδεικτικές, ${Q.filter(q => q.kind === 'new').length} νέες εξάσκησης) · ${C.passages.length} κείμενα · ${C.theory.length} κεφάλαια θεωρίας.
      <div class="mt">Το νέο περιεχόμενο κατεβαίνει μόνο του όταν ανοίγει η εφαρμογή· η πρόοδος δεν χάνεται.</div><button class="btn sm ghost mt" onclick="checkRemoteContent().then(()=>toast('Έγινε έλεγχος'))">⟳ Έλεγχος τώρα</button></div>
    <h2>Λογαριασμός</h2><div class="card"><div class="small">${esc(USER.name)} · ${esc(USER.email)}</div><div class="row mt"><button class="btn soft" onclick="togglePreview()">👀 Δες την εφαρμογή όπως ο Νικόλας</button><button class="btn danger" onclick="logout()">Αποσύνδεση</button></div></div>`);
};
function assignWrong(sid) {
  const s = SESS.find(x => x.id === sid); const ids = (s.answers || []).filter(a => !a.ok).map(a => a.q);
  addDocTo('tasks', { action: 'qids:list', qids: ids, title: 'Ξανά τα λάθη: ' + s.title, text: '', due: null, status: 'open' }); closeModal(); toast('Ανατέθηκε');
}
