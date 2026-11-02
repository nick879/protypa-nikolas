"use strict";
/* ================= ΒΑΣΙΚΑ: εργαλεία, περιεχόμενο, Firebase, δρομολόγηση ================= */
const CFG = window.APP_CONFIG;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.random() * a.length | 0];
const DAYMS = 864e5;
const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
const z2 = n => String(n).padStart(2, '0');
const todayStr = (d = new Date()) => d.getFullYear() + '-' + z2(d.getMonth() + 1) + '-' + z2(d.getDate());
const parseDay = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtDate = (d, o = { day: 'numeric', month: 'long' }) => (d instanceof Date ? d : new Date(d)).toLocaleDateString('el-GR', o);
const fmtTime = d => new Date(d).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
const DOW = ['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'];
const fmtMin = s => { const m = Math.round(s / 60); return m < 60 ? m + '′' : Math.floor(m / 60) + 'ω ' + (m % 60) + '′'; };
const SUBJ = { lang: 'Γλώσσα', math: 'Μαθηματικά' };
function toast(msg, ms = 2600) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), ms); }
function render(html) { $('#app').innerHTML = html; }
// μικρή μορφοποίηση: **έντονα**, _πλάγια_
function md(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[\s(«])_(.+?)_(?=[\s.,;:!»)]|$)/g, '$1<i>$2</i>').replace(/\n/g, '<br>'); }
function paragraphs(t) { return String(t || '').split(/\n\s*\n/).map(p => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>').join(''); }

/* ---------- IndexedDB (cache περιεχομένου) ---------- */
const IDB = {
  db: null,
  open() { return this.db ? Promise.resolve(this.db) : new Promise((res, rej) => { const r = indexedDB.open('protypa', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => { this.db = r.result; res(this.db); }; r.onerror = () => rej(r.error); }); },
  async get(k) { try { const db = await this.open(); return await new Promise(res => { const r = db.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => res(r.result); r.onerror = () => res(null); }); } catch (e) { return null; } },
  async put(k, v) { try { const db = await this.open(); await new Promise(res => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = res; }); } catch (e) { } }
};

/* ---------- Περιεχόμενο ---------- */
let C = null, Q = [], QBY = {}, PBY = {}, TOP = {}, THBY = {}, LESSONBY = {}, FBY = {};
const CHAPTER_ORDER = ['γλ-κατανόηση', 'μθ-αριθμοί', 'γλ-λεξιλόγιο', 'μθ-κλάσματα', 'γλ-γραμματική', 'μθ-ποσοστά', 'γλ-σύνταξη', 'μθ-μετρήσεις', 'γλ-νόημα', 'μθ-εξισώσεις', 'γλ-ορθογραφία', 'μθ-γεωμετρία', 'μθ-στατιστική', 'μθ-λογική'];
function indexContent() {
  Q = C.questions.filter(q => !q.retired);
  QBY = Object.fromEntries(C.questions.map(q => [q.id, q]));
  PBY = Object.fromEntries(C.passages.map(p => [p.id, p]));
  TOP = Object.fromEntries(C.topics.map(t => [t.id, t]));
  THBY = Object.fromEntries(C.theory.map(t => [t.id, t]));
  FBY = Object.fromEntries((C.files || []).map(f => [f.id, f]));
  LESSONBY = {}; C.theory.forEach(ch => ch.lessons.forEach((l, i) => LESSONBY[l.id] = { ...l, chapter: ch.id, idx: i }));
}
async function loadContent() {
  let local = null;
  try { local = await (await fetch('content/content.json', { cache: 'no-cache' })).json(); } catch (e) { }
  const cached = await IDB.get('content');
  C = (cached && (!local || cached.version > local.version)) ? cached : local;
  if (!C) throw new Error('Δεν βρέθηκε περιεχόμενο');
  indexContent();
  checkRemoteContent();
}
async function checkRemoteContent() {
  try {
    const man = await (await fetch(CFG.remoteBase + 'content/manifest.json?t=' + Date.now(), { cache: 'no-store' })).json();
    if (man.version > C.version) {
      const nc = await (await fetch(CFG.remoteBase + 'content/content.json?v=' + man.version, { cache: 'no-store' })).json();
      await IDB.put('content', nc); C = nc; indexContent();
      toast(`Νέο περιεχόμενο (έκδοση ${man.version}): ${man.notes || ''}`, 5000);
      route();
    }
  } catch (e) { /* εκτός σύνδεσης: συνεχίζουμε με ό,τι έχουμε */ }
}
function figHTML(path, alt = 'Σχήμα') { return path ? `<img class="fig" src="${esc(path)}" alt="${alt}" onerror="this.onerror=null;this.src='${CFG.remoteBase}${esc(path)}'">` : ''; }
function examDate() { return (SET && SET.examDate) || C.exam.date; }
function daysToExam() { return Math.ceil((parseDay(examDate()) - parseDay(todayStr())) / DAYMS); }

/* ---------- Firebase ---------- */
let fbApp, auth, db, USER = null;
let PROG = null, PROG_SERVER = null, SET = {}, SESS = [], MOCKS = [], TASKS = [], NOTES = [], LESSONS = [];
let progDirty = false, progTimer = null, unsubs = [];
function fbInit() {
  fbApp = FB.initializeApp(CFG.firebase);
  auth = FB.initializeAuth(fbApp, { persistence: [FB.indexedDBLocalPersistence, FB.browserLocalPersistence] });
  try { db = FB.initializeFirestore(fbApp, { localCache: FB.persistentLocalCache({ tabManager: FB.persistentSingleTabManager() }) }); }
  catch (e) { db = FB.initializeFirestore(fbApp, { localCache: FB.memoryLocalCache() }); }
}
const R = {
  prog: () => FB.doc(db, 'family', 'main', 'progress', 'main'),
  progOld: () => FB.doc(db, 'family', 'main', 'progress', 'nikolas'), // παλιά θέση (μεταφέρεται αυτόματα)
  set: () => FB.doc(db, 'family', 'main', 'meta', 'settings'),
  owner: () => FB.doc(db, 'family', 'main', 'meta', 'owner'),
  member: email => FB.doc(db, 'family', 'main', 'members', email),
  members: () => FB.collection(db, 'family', 'main', 'members'),
  col: name => FB.collection(db, 'family', 'main', name),
  doc: (name, id) => FB.doc(db, 'family', 'main', name, id)
};
/* ---------- Μέλη οικογένειας (αποθηκεύονται στη βάση, όχι στον κώδικα) ---------- */
let MEMBERS = {};
function studentMember() { return Object.values(MEMBERS).find(m => m.role === 'student') || (USER && USER.role === 'student' ? USER : null); }
// Όνομα του παιδιού με άρθρο: sn('nom') → «ο Νικόλας», sn('gen') → «του Νικόλα», sn('acc') → «τον Νικόλα», sn('voc') → «Νικόλα»
function sn(c, cap) {
  const m = studentMember() || { name: 'μαθητής', gender: 'm' };
  const f = m.gender === 'f';
  const forms = { nom: m.name, gen: m.gen || m.name, acc: m.acc || m.name, voc: m.vocative || m.name };
  const art = { nom: f ? 'η' : 'ο', gen: f ? 'της' : 'του', acc: f ? 'την' : 'τον', voc: '' }[c];
  let out = (art ? art + ' ' : '') + forms[c];
  return cap ? out.charAt(0).toUpperCase() + out.slice(1) : out;
}
// Πρόταση πτώσεων από την ονομαστική (μπορεί να διορθωθεί στη φόρμα)
function nameForms(n, g) {
  n = (n || '').trim(); const r = (a, b) => n.slice(0, -a.length) + b;
  if (g === 'f') { if (/α$/.test(n)) return { gen: r('α', 'ας'), acc: n, vocative: n }; if (/η$/.test(n)) return { gen: r('η', 'ης'), acc: n, vocative: n }; return { gen: n, acc: n, vocative: n }; }
  if (/ας$/.test(n)) return { gen: r('ας', 'α'), acc: r('ας', 'α'), vocative: r('ας', 'α') };
  if (/ης$/.test(n)) return { gen: r('ης', 'η'), acc: r('ης', 'η'), vocative: r('ης', 'η') };
  if (/ος$/.test(n)) return { gen: r('ος', 'ου'), acc: r('ος', 'ο'), vocative: r('ος', 'ε') };
  return { gen: n, acc: n, vocative: n };
}
function emptyProg() { return { qs: {}, xp: 0, games: {}, lessons: {}, tests: {}, updatedAt: 0 }; }
function startListeners() {
  unsubs.forEach(u => u()); unsubs = [];
  const onErr = e => { console.warn(e); if (e.code === 'permission-denied') { render(`<div class="card mt2"><h3>Δεν υπάρχει πρόσβαση</h3><p>Οι κανόνες της βάσης δεν επιτρέπουν σε αυτόν τον λογαριασμό να δει τα δεδομένα. Ο γονιός πρέπει να ενημερώσει τους κανόνες στο Firebase (δες το README).</p><button class="btn" onclick="logout()">Αποσύνδεση</button></div>`); } };
  unsubs.push(FB.onSnapshot(R.prog(), s => { PROG_SERVER = Object.assign(emptyProg(), s.exists() ? s.data() : {}); if (PROG_SERVER.resetAt && PROG && (PROG.resetAt || 0) < PROG_SERVER.resetAt) { progDirty = false; clearTimeout(progTimer); IDB.put('exam-run', null); } if (!progDirty && !STUDENT_PREVIEW) { PROG = JSON.parse(JSON.stringify(PROG_SERVER)); softRefresh(); } }, onErr));
  unsubs.push(FB.onSnapshot(R.members(), s => { MEMBERS = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); if (MEMBERS[USER.email]) Object.assign(USER, MEMBERS[USER.email]); const mb = $('#memBox'); if (mb && window.membersHTML) mb.innerHTML = membersHTML(); softRefresh(); }, onErr));
  unsubs.push(FB.onSnapshot(R.set(), s => { SET = s.exists() ? s.data() : {}; softRefresh(); }, onErr));
  const q = (n, lim) => FB.query(R.col(n), FB.orderBy('ts', 'desc'), FB.limit(lim));
  unsubs.push(FB.onSnapshot(q('sessions', 500), s => { SESS = s.docs.map(d => ({ id: d.id, ...d.data() })); softRefresh(); }, onErr));
  unsubs.push(FB.onSnapshot(q('mocks', 100), s => { MOCKS = s.docs.map(d => ({ id: d.id, ...d.data() })); softRefresh(); }, onErr));
  unsubs.push(FB.onSnapshot(q('tasks', 200), s => { TASKS = s.docs.map(d => ({ id: d.id, ...d.data() })); softRefresh(); }, onErr));
  unsubs.push(FB.onSnapshot(q('notes', 300), s => { NOTES = s.docs.map(d => ({ id: d.id, ...d.data() })); softRefresh(); }, onErr));
  unsubs.push(FB.onSnapshot(q('lessons', 200), s => { LESSONS = s.docs.map(d => ({ id: d.id, ...d.data() })); softRefresh(); }, onErr));
}
// Ανανέωση οθόνης όταν έρθουν δεδομένα — μόνο σε «ήσυχες» οθόνες
let softTimer = null;
function softRefresh() { clearTimeout(softTimer); softTimer = setTimeout(() => { if (QUIET_VIEWS.has(CUR)) route(true); updateTabs(); if (window.scheduleNotifications) { scheduleNotifications(); notifyNewTasks(); } }, 250); }
function saveProg() {
  if (!isStudent()) return;
  progDirty = true; PROG.updatedAt = Date.now();
  clearTimeout(progTimer);
  progTimer = setTimeout(() => { const data = JSON.parse(JSON.stringify(PROG)); FB.setDoc(R.prog(), data).catch(e => console.warn(e)); progDirty = false; }, 1200);
}
function addDocTo(name, obj) { return FB.addDoc(R.col(name), Object.assign({ ts: Date.now(), by: USER.email, byName: USER.name }, obj)).catch(e => { console.warn(e); toast('Δεν αποθηκεύτηκε: ' + e.message); }); }
function updDoc(name, id, obj) { return FB.updateDoc(R.doc(name, id), obj).catch(e => console.warn(e)); }
function delDoc(name, id) { return FB.deleteDoc(R.doc(name, id)).catch(e => console.warn(e)); }
function isStudent() { return USER && USER.role === 'student'; }
function isParent() { return USER && USER.role === 'parent'; }
async function logout() { unsubs.forEach(u => u()); unsubs = []; await FB.signOut(auth); }

/* ---------- Μοντέλο μάθησης ---------- */
const BOX_INT = [0, 1, 3, 7, 16, 35];
function recordAnswer(q, ok) {
  const s = PROG.qs[q.id] || [0, 0, 0, 0, 0];
  s[0]++; if (ok) s[1]++; s[2] = Date.now(); s[3] = ok ? Math.min(s[3] + 1, 5) : 1; s[4] = ok ? 1 : 0;
  PROG.qs[q.id] = s; PROG.xp = (PROG.xp || 0) + (ok ? 10 : 2);
}
const isDue = s => s && Date.now() >= s[2] + BOX_INT[s[3]] * DAYMS;
function topicStats(t, prog = PROG) {
  const qs = Q.filter(q => q.topic === t); let att = 0, cor = 0, seen = 0;
  for (const q of qs) { const s = prog.qs[q.id]; if (s) { att += s[0]; cor += s[1]; seen++; } }
  return { total: qs.length, seen, att, cor, acc: att ? cor / att : null };
}
function subjectStats(sj) { let att = 0, cor = 0; for (const q of Q) { if (q.subject !== sj) continue; const s = PROG.qs[q.id]; if (s) { att += s[0]; cor += s[1]; } } return { att, cor, acc: att ? cor / att : null }; }
function weakTopics(n = 3, subj) {
  return C.topics.filter(t => !subj || t.subject === subj).map(t => { const s = topicStats(t.id); return { t: t.id, sc: (s.acc === null ? .55 : s.acc) - .15 * (s.seen / s.total) }; })
    .sort((a, b) => a.sc - b.sc).slice(0, n).map(x => x.t);
}
function chapterProgress(chId) {
  const ch = THBY[chId]; if (!ch) return { lessonsDone: 0, lessons: 0, test: null, stats: topicStats(chId) };
  const done = ch.lessons.filter(l => PROG.lessons && PROG.lessons[l.id]).length;
  return { lessonsDone: done, lessons: ch.lessons.length, test: (PROG.tests || {})[chId] || null, stats: topicStats(chId) };
}
function secondsOn(day) { return SESS.filter(s => s.day === day).reduce((a, s) => a + (s.sec || 0), 0); }
function streak() { let n = 0, d = new Date(); if (!secondsOn(todayStr(d))) d = new Date(d - DAYMS); while (secondsOn(todayStr(d)) > 0) { n++; d = new Date(d - DAYMS); } return n; }
const level = xp => Math.floor(Math.sqrt((xp || 0) / 50)) + 1;
function logSession(o) {
  const s = Object.assign({ day: todayStr(), who: USER.email }, o); s.sec = Math.round(s.sec || 0);
  if (isStudent()) addDocTo('sessions', s);
  return s;
}

/* ---------- Πρόγραμμα μελέτης (δυναμικό) ----------
   Το πρόγραμμα δεν είναι δεμένο με εβδομάδες: το παιδί προχωρά στο επόμενο κεφάλαιο μόλις «κλείσει» το τρέχον
   (όλα τα μαθήματα θεωρίας + τεστ κεφαλαίου ≥ PASS%). Οι ημερομηνίες χρησιμοποιούνται μόνο για να συγκρίνουμε
   τον πραγματικό ρυθμό με τον αναμενόμενο (μπροστά / στον στόχο / πίσω). */
const PASS = 70;
const DEFAULT_START = '2026-11-02';
// Προτεινόμενη σειρά «πριν από»: μόνο για προειδοποίηση στον γονέα, δεν μπλοκάρει τίποτα.
const CH_DEPS = { 'μθ-κλάσματα': ['μθ-αριθμοί'], 'μθ-ποσοστά': ['μθ-κλάσματα'], 'μθ-εξισώσεις': ['μθ-αριθμοί'], 'γλ-σύνταξη': ['γλ-γραμματική'] };
function chapterOrder() {
  const o = (SET.chapterOrder || []).filter(id => TOP[id]);
  CHAPTER_ORDER.forEach(id => { if (!o.includes(id)) o.push(id); });
  C.topics.forEach(t => { if (!o.includes(t.id)) o.push(t.id); });
  return o;
}
function bestTest(id) { const t = (PROG.tests || {})[id]; return t ? Math.max(t.best || 0, t.score || 0) : null; }
function chapterUnits(id) { const th = THBY[id]; return (th ? th.lessons.length : 0) + 1; } // μαθήματα + τεστ
function chapterUnitsDone(id) { const p = chapterProgress(id); const b = bestTest(id); return p.lessonsDone + (b !== null && b >= PASS ? 1 : 0); }
function chapterDone(id) { return chapterUnitsDone(id) >= chapterUnits(id); }
function chapterState(id) { if (chapterDone(id)) return 'done'; return chapterUnitsDone(id) > 0 || (PROG.tests || {})[id] ? 'started' : 'todo'; }
// Το επόμενο βήμα μέσα σε ένα κεφάλαιο
function chapterNextStep(id) {
  const th = THBY[id]; const l = th && th.lessons.find(x => !(PROG.lessons || {})[x.id]);
  if (l) return { kind: 'lesson', icon: '📘', text: `Θεωρία: ${TOP[id].name} — «${l.title}»`, action: 'lesson:' + l.id };
  const t = (PROG.tests || {})[id];
  if (!t) return { kind: 'test', icon: '📝', text: `Τεστ κεφαλαίου: ${TOP[id].name}`, action: 'test:' + id };
  return { kind: 'retest', icon: '🔁', text: `${TOP[id].name}: εξάσκηση στα λάθη και νέο τεστ (θέλει ${PASS}%, έχεις ${bestTest(id)}%)`, action: 'topic:' + id, then: 'test:' + id };
}
function addDays(d, n) { return new Date(d.getTime() + n * DAYMS); }
function planInfo() {
  const today = parseDay(todayStr());
  const exam = parseDay(examDate());
  const start = parseDay(SET.planStart || DEFAULT_START);
  const tw = SET.theoryWeeks || 12;                       // η θεωρία κλείνει tw εβδομάδες πριν την εξέταση
  const theoryEnd = addDays(exam, -7 * tw);
  const mockStart = addDays(exam, -7 * 6), finalStart = addDays(exam, -7);
  const order = chapterOrder();
  const total = order.reduce((a, id) => a + chapterUnits(id), 0);
  const done = order.reduce((a, id) => a + chapterUnitsDone(id), 0);
  const theoryDays = Math.max(7, (theoryEnd - start) / DAYMS);
  const elapsed = Math.max(0, Math.min(theoryDays, (today - start) / DAYMS + 1));
  const expected = total * elapsed / theoryDays;
  const perDay = total / theoryDays;                        // αναμενόμενος ρυθμός (μονάδες/μέρα)
  const deltaDays = Math.round((done - expected) / perDay);  // + μπροστά, − πίσω
  const theoryDone = done >= total;
  let status = theoryDone ? 'done' : deltaDays >= 4 ? 'ahead' : deltaDays <= -4 ? 'behind' : 'ontrack';
  if (today < start) status = 'notstarted';
  // Πρόβλεψη τέλους θεωρίας με τον πραγματικό ρυθμό (μετά από τουλάχιστον 10 μέρες)
  const daysIn = (today - start) / DAYMS + 1; let projected = null;
  if (!theoryDone && daysIn >= 10 && done > 0) projected = addDays(today, Math.ceil((total - done) / (done / daysIn)));
  let phase;
  if (today >= finalStart) phase = 4; else if (today >= mockStart) phase = 3; else if (theoryDone || today >= theoryEnd) phase = 2; else phase = 1;
  // Χρονοδιάγραμμα κεφαλαίων: τα τελειωμένα με την ημερομηνία τους, τα υπόλοιπα με τον ρυθμό που χρειάζεται για να τελειώσουν στην ώρα τους
  const left = Math.max(1, (theoryEnd - today) / DAYMS); const need = (total - done) / left;
  let cursor = 0; const sched = order.map(id => {
    const u = chapterUnits(id) - chapterUnitsDone(id);
    const s = { id, state: chapterState(id) };
    if (u > 0) { cursor += u; s.eta = addDays(today, Math.ceil(cursor / Math.max(need, perDay))); }
    return s;
  });
  return { today, exam, start, theoryEnd, mockStart, finalStart, order, total, done, expected, deltaDays, status, projected, phase, sched, need, perDay };
}
const STATUS_TXT = {
  ahead: ['🚀', 'Μπροστά από το πρόγραμμα', 'var(--ok)'], ontrack: ['✅', 'Στον στόχο', 'var(--ok)'],
  behind: ['⚠️', 'Πίσω από το πρόγραμμα', 'var(--bad)'], done: ['🏁', 'Η θεωρία ολοκληρώθηκε', 'var(--ok)'], notstarted: ['⏳', 'Δεν ξεκίνησε ακόμα', 'var(--mute)']
};
function statusLine(P) {
  const [ic, t] = STATUS_TXT[P.status];
  const d = Math.abs(P.deltaDays);
  return `${ic} ${t}${P.status === 'ahead' || P.status === 'behind' ? ` κατά ~${d} ${d === 1 ? 'μέρα' : 'μέρες'}` : ''}`;
}
const PHASES = { 1: { n: 'Θεωρία & κεφάλαια', c: '#2f5bd3', d: 'Ένα κεφάλαιο τη φορά: μαθήματα θεωρίας, ερωτήσεις ελέγχου, τεστ κεφαλαίου. Μόλις κλείσει ένα, ανοίγει το επόμενο.' }, 2: { n: 'Εξάσκηση', c: '#7a3fd1', d: 'Επίσημα θέματα ανά ενότητα, κείμενα, έμφαση στις αδύναμες ενότητες, μισό διαγώνισμα κάθε 2 εβδομάδες.' }, 3: { n: 'Διαγωνίσματα', c: '#0b8a6b', d: 'Πλήρες διαγώνισμα με φύλλο απαντήσεων κάθε Σάββατο 10:00 και διόρθωση την Κυριακή.' }, 4: { n: 'Τελική ευθεία', c: '#d1493f', d: 'Ελαφριά επανάληψη, ξεκούραση, ύπνος.' } };
function currentChapter() {
  if (SET.currentChapter && THBY[SET.currentChapter] && !chapterDone(SET.currentChapter)) return SET.currentChapter;
  const o = chapterOrder();
  // Ένα κεφάλαιο που έχει ξεκινήσει ολοκληρώνεται πρώτα, ακόμα κι αν αλλάξει η σειρά.
  return o.find(id => chapterState(id) === 'started') || o.find(id => !chapterDone(id)) || o[o.length - 1];
}
// Εργασίες της ημέρας: βγαίνουν από την κατάσταση (τι έχει τελειώσει), όχι από σταθερό ημερολόγιο.
function todayTasks(date) {
  date = date || parseDay(todayStr()); const P = planInfo(); const dow = date.getDay(); const T = [];
  const anyDone = P.order.some(chapterDone);
  if (P.phase === 1 || (P.phase === 2 && P.status !== 'done' && P.done < P.total)) {
    const ch = currentChapter(); const st = chapterNextStep(ch);
    if (dow === 0) T.push(['🎮', 'Ελαφριά μέρα: παιχνίδια + «Τα λάθη μου»', 'mistakes']);
    else if (dow === 3 && anyDone) { T.push([st.icon, st.text, st.action]); T.push(['🧠', 'Επανάληψη παλιών κεφαλαίων (10 ερωτήσεις)', 'smart']); }
    else T.push([st.icon, st.text, st.action]);
    if (P.phase === 2) T.push(['🧠', 'Έξυπνη εξάσκηση', 'smart']);
  } else if (P.phase === 2) {
    const wk = Math.floor((date - P.theoryEnd) / (7 * DAYMS));
    if (dow === 6 && wk % 2 === 0) T.push(['⏱️', 'Μισό διαγώνισμα (75′)', 'mock']);
    else if (dow === 6 || dow === 3) T.push(['📖', 'Ένα κείμενο Γλώσσας', 'reading']);
    else if (dow === 0) T.push(['🔁', 'Τα λάθη μου + παιχνίδια', 'mistakes']);
    else T.push(['🧠', 'Έξυπνη εξάσκηση (αδύναμες ενότητες)', 'smart']);
  } else if (P.phase === 3) {
    if (dow === 6) T.push(['⏱️', 'Πλήρες διαγώνισμα με φύλλο απαντήσεων (150′, 10:00)', 'mock']);
    else if (dow === 0) T.push(['🔁', 'Διόρθωση & λάθη του διαγωνίσματος', 'mistakes']);
    else if (dow === 2 || dow === 4) T.push(['📖', 'Ένα κείμενο', 'reading']);
    else T.push(['🧠', 'Έξυπνη εξάσκηση', 'smart']);
  } else {
    if (dow === 5 || dow === 6) T.push(['😴', 'Ξεκούραση, νωρίς ύπνος, έτοιμα τα πράγματα', null]);
    else T.push(['🔁', 'Λίγη επανάληψη λαθών (15′)', 'mistakes']);
  }
  return T;
}
function doAction(a, taskId) {
  CUR_TASK = taskId || null;
  if (!a) return;
  if (a === 'mistakes') startMistakes(); else if (a === 'reading') go('reading'); else if (a === 'mock') go('mock'); else if (a === 'smart') startSmart(); else if (a === 'games') go('games');
  else if (a.startsWith('topic:')) startTopic(a.slice(6));
  else if (a.startsWith('test:')) startChapterTest(a.slice(5));
  else if (a.startsWith('chapter:')) openChapter(a.slice(8), true);
  else if (a.startsWith('lesson:')) openLesson(a.slice(7));
  else if (a.startsWith('passage:')) startPassage(a.slice(8));
  else if (a.startsWith('exam:')) startMock(a.slice(5));
  else if (a.startsWith('qids:')) { const t = TASKS.find(x => x.id === taskId); startQuiz((t.qids || []).map(id => QBY[id]).filter(Boolean), t.title); }
}
let CUR_TASK = null;
function completeTask(result) {
  if (!CUR_TASK || !isStudent()) return;
  updDoc('tasks', CUR_TASK, { status: 'done', doneTs: Date.now(), result: result || '' }); CUR_TASK = null;
}

/* ---------- Δρομολόγηση ---------- */
const VIEWS = {}; let CUR = 'home', PARAM = null, LEAVE_GUARD = null;
const QUIET_VIEWS = new Set(['home', 'plan', 'chapters', 'practice', 'mock', 'games', 'notes', 'p-home', 'p-chapters', 'p-tasks', 'p-history', 'account', 'reading', 'library']);
function go(v, param) {
  if (LEAVE_GUARD && !LEAVE_GUARD(v)) return; LEAVE_GUARD = null; PARAM = param ?? null;
  if (location.hash === '#' + v) route(); else location.hash = v;
}
window.addEventListener('hashchange', () => {
  if (LEAVE_GUARD) { const v = location.hash.slice(1) || 'home'; if (!LEAVE_GUARD(v)) { history.replaceState(null, '', '#' + CUR); return; } LEAVE_GUARD = null; }
  route();
});
let TIMERS = [];
function stopTimers() { TIMERS.forEach(t => clearInterval(t)); TIMERS = []; }
function route(soft) {
  if (!USER) return;
  if (!soft) stopTimers();
  let v = location.hash.slice(1) || 'home';
  if (isParent() && !STUDENT_PREVIEW && VIEWS['p-' + v]) v = 'p-' + v;
  if (!VIEWS[v]) v = isParent() && !STUDENT_PREVIEW ? 'p-home' : 'home';
  if (soft && v !== CUR) return;
  CUR = v; updateTabs();
  const y = window.scrollY; VIEWS[v](PARAM);
  if (soft) window.scrollTo(0, y); else window.scrollTo(0, 0);
}
let STUDENT_PREVIEW = false;
function togglePreview() { STUDENT_PREVIEW = !STUDENT_PREVIEW; if (!STUDENT_PREVIEW && PROG_SERVER) PROG = JSON.parse(JSON.stringify(PROG_SERVER)); go('home'); }
function updateTabs() {
  const studentTabs = [['home', '🏠', 'Αρχική'], ['chapters', '📘', 'Κεφάλαια'], ['practice', '✏️', 'Εξάσκηση'], ['mock', '⏱️', 'Διαγώνισμα'], ['games', '🎮', 'Παιχνίδια']];
  const parentTabs = [['home', '📊', 'Επισκόπηση'], ['chapters', '📘', 'Κεφάλαια'], ['tasks', '📌', 'Αναθέσεις'], ['history', '🗂️', 'Ιστορικό'], ['settings', '⚙️', 'Ρυθμίσεις']];
  const tabs = isParent() && !STUDENT_PREVIEW ? parentTabs : studentTabs;
  const base = CUR.replace(/^p-/, '');
  const unreadNotes = isStudent() ? NOTES.filter(n => !n.seen).length : 0;
  const openTasks = isStudent() ? TASKS.filter(t => t.status !== 'done').length : 0;
  $('#tabsIn').innerHTML = tabs.map(([k, i, l]) => `<button class="${base === k || (k === 'practice' && base === 'reading') ? 'on' : ''}" onclick="go('${k}')"><span class="i">${i}</span>${l}${k === 'home' && (unreadNotes || openTasks) ? '<span class="dot"></span>' : ''}</button>`).join('');
  $('#tabs').classList.toggle('hide', !USER || ['quiz', 'exam', 'game', 'login', 'lesson', 'setup'].includes(CUR));
  const wb = $('#whoBtn');
  if (USER) { wb.classList.remove('hide'); wb.innerHTML = (isParent() ? (STUDENT_PREVIEW ? '👀 προβολή μαθητή · ' : '👤 ') : '🦉 ') + esc(USER.name); } else wb.classList.add('hide');
}

/* ---------- Παράθυρα ---------- */
function modal(html) { $('#modalRoot').innerHTML = `<div class="modal" onclick="if(event.target===this)closeModal()"><div class="card">${html}</div></div>`; }
function closeModal() { $('#modalRoot').innerHTML = ''; }
function confirmBox(msg, yes, onYes, danger) {
  modal(`<p style="margin-top:0;font-size:17px">${msg}</p><div class="row" style="justify-content:flex-end"><button class="btn ghost" onclick="closeModal()">Άκυρο</button><button class="btn ${danger ? 'danger' : ''}" id="cfYes">${yes}</button></div>`);
  $('#cfYes').onclick = () => { closeModal(); onYes(); };
}

/* ---------- Σύνδεση ---------- */
VIEWS.login = function () {
  render(`<div style="max-width:420px;margin:40px auto">
    <div class="center"><div class="logo" style="width:64px;height:64px;border-radius:18px;background:var(--acc);color:#fff;display:grid;place-items:center;font-size:32px;font-weight:800;margin:0 auto">Π</div>
    <h1 class="mt">Πρότυπα · Προετοιμασία</h1><p class="sub">Σύνδεση με τον λογαριασμό σου</p></div>
    <div class="card"><form id="lf">
      <div class="field"><label>Email</label><input id="le" type="email" autocomplete="username" required></div>
      <div class="field"><label>Κωδικός</label><input id="lp" type="password" autocomplete="current-password" required></div>
      <button class="btn block" id="lb">Σύνδεση</button>
      <p class="small mute center" id="lerr" style="min-height:20px"></p>
      <p class="small center" style="margin:0"><a href="#" id="lforgot">Ξέχασα τον κωδικό</a></p>
    </form></div></div>`);
  $('#lf').onsubmit = async e => {
    e.preventDefault(); $('#lb').disabled = true; $('#lerr').textContent = 'Σύνδεση…';
    try { await FB.signInWithEmailAndPassword(auth, $('#le').value.trim(), $('#lp').value); }
    catch (er) { $('#lb').disabled = false; $('#lerr').textContent = /network/.test(er.code) ? 'Χρειάζεται σύνδεση στο internet για την πρώτη είσοδο.' : 'Λάθος email ή κωδικός.'; }
  };
  $('#lforgot').onclick = async e => { e.preventDefault(); const em = $('#le').value.trim(); if (!em) { $('#lerr').textContent = 'Γράψε πρώτα το email σου.'; return; } try { await FB.sendPasswordResetEmail(auth, em); $('#lerr').textContent = 'Στάλθηκε email αλλαγής κωδικού.'; } catch (er) { $('#lerr').textContent = 'Δεν στάλθηκε: ' + er.code; } };
};
VIEWS.account = function () {
  render(`<h1>Λογαριασμός</h1><div class="card"><p style="margin-top:0"><b>${esc(USER.name)}</b><br><span class="mute small">${esc(USER.email)}</span></p>
    <p class="small mute">Περιεχόμενο: έκδοση ${C.version} · ${Q.length} ερωτήσεις · ${C.theory.length} κεφάλαια θεωρίας</p>
    <div class="row">${isParent() ? `<button class="btn soft" onclick="togglePreview()">${STUDENT_PREVIEW ? '↩︎ Πίσω στην οθόνη γονέα' : '👀 Δες την εφαρμογή όπως ' + sn('nom')}</button>` : ''}
    <button class="btn ghost" onclick="checkRemoteContent().then(()=>toast('Έλεγχος για νέο περιεχόμενο: έγινε'))">⟳ Έλεγχος για νέο περιεχόμενο</button>
    <button class="btn ghost" onclick="go('info')">ℹ️ Για την εξέταση</button>
    <button class="btn danger" onclick="logout()">Αποσύνδεση</button></div></div>
    ${isParent() && STUDENT_PREVIEW ? `<p class="small mute">Στην προβολή μαθητή ό,τι απαντήσεις ΔΕΝ μετράει στην πρόοδο ${sn('gen')}.</p>` : ''}`);
};

/* ---------- Εκκίνηση ---------- */
function setNet() { $('#netState').textContent = navigator.onLine ? '' : '⚠ εκτός σύνδεσης'; }
window.addEventListener('online', () => { setNet(); checkRemoteContent(); }); window.addEventListener('offline', setNet);
async function boot() {
  setNet();
  try { await loadContent(); } catch (e) { render(`<div class="card mt2">Δεν φορτώθηκε το περιεχόμενο. Έλεγξε τη σύνδεση και άνοιξε ξανά την εφαρμογή.</div>`); return; }
  fbInit();
  FB.onAuthStateChanged(auth, async u => {
    if (!u) { USER = null; PROG = null; MEMBERS = {}; CUR = 'login'; updateTabs(); VIEWS.login(); return; }
    const email = (u.email || '').toLowerCase();
    render('<div class="center mt2 mute">Φόρτωση…</div>');
    let m = null;
    try { const d = await FB.getDoc(R.member(email)); if (d.exists()) m = d.data(); } catch (e) { console.warn(e); }
    if (!m) {
      let hasOwner = true;
      try { hasOwner = (await FB.getDoc(R.owner())).exists(); } catch (e) { console.warn(e); }
      if (!hasOwner) { USER = { email, uid: u.uid, role: 'setup', name: '' }; CUR = 'setup'; updateTabs(); VIEWS.setup(); return; }
      render(`<div class="card mt2"><h3>Ο λογαριασμός ${esc(email)} δεν είναι μέλος της οικογένειας.</h3><p class="small">Ένας γονιός μπορεί να τον προσθέσει από τις Ρυθμίσεις → «Μέλη οικογένειας».</p><button class="btn" onclick="logout()">Αποσύνδεση</button></div>`); return;
    }
    USER = Object.assign({ email, uid: u.uid }, m);
    PROG = emptyProg();
    startListeners();
    migrateProgress();
    history.replaceState(null, '', '#home'); CUR = 'home'; route();
  });
}
// Μία φορά: η πρόοδος μεταφέρεται από την παλιά θέση (progress/nikolas) στη νέα (progress/main)
async function migrateProgress() {
  try {
    const n = await FB.getDoc(R.prog()); if (n.exists()) return;
    const o = await FB.getDoc(R.progOld()); if (o.exists()) { await FB.setDoc(R.prog(), o.data()); console.log('progress migrated'); }
  } catch (e) { console.warn(e); }
}
/* ---------- Πρώτη ρύθμιση οικογένειας ---------- */
VIEWS.setup = function () {
  const row = (k, title, role, extra) => `<div class="card mt"><h3 style="margin-top:0">${title}</h3>
    ${k !== 'me' ? `<div class="field"><label>Email (όπως είναι στο Firebase → Authentication)</label><input type="email" id="${k}E" autocomplete="off"></div>` : `<div class="small mute" style="margin-bottom:8px">${esc(USER.email)}</div>`}
    <div class="field"><label>${role === 'student' ? 'Όνομα (ονομαστική), π.χ. Νικόλας' : 'Πώς θα εμφανίζεται, π.χ. Μπαμπάς'}</label><input type="text" id="${k}N" ${role === 'student' ? `oninput="setupForms('${k}')"` : ''}></div>${extra || ''}</div>`;
  const focus = k => `<div class="field"><label>Εστίαση στην Επισκόπηση</label><select id="${k}F"><option value="math">Μαθηματικά</option><option value="lang">Γλώσσα</option></select></div>`;
  const student = `<div class="field"><label>Φύλο (για τα άρθρα: ο/η, του/της)</label><select id="stG" onchange="setupForms('st')"><option value="m">Αγόρι</option><option value="f">Κορίτσι</option></select></div>
    <div class="row"><div class="field grow"><label>Γενική (του …)</label><input type="text" id="stGen"></div><div class="field grow"><label>Αιτιατική (τον …)</label><input type="text" id="stAcc"></div><div class="field grow"><label>Κλητική (Γεια σου, …)</label><input type="text" id="stVoc"></div></div>`;
  render(`<h1>Ρύθμιση οικογένειας</h1><p class="sub">Πρώτη σύνδεση: ορίστε ποιοι χρησιμοποιούν την εφαρμογή. Τα στοιχεία αποθηκεύονται μόνο στη δική σας βάση (Firebase), όχι στον κώδικα. Μπορείτε να τα αλλάξετε αργότερα από τις Ρυθμίσεις.</p>
    ${row('me', 'Εσείς (γονιός)', 'parent', focus('me'))}
    ${row('st', 'Ο μαθητής / η μαθήτρια', 'student', student)}
    ${row('p2', 'Δεύτερος γονιός (προαιρετικό)', 'parent', focus('p2'))}
    <p class="small mute">Κάθε email πρέπει να υπάρχει ως χρήστης στο Firebase → Authentication → Users.</p>
    <div class="row mt"><button class="btn" id="stSave" onclick="saveSetup()">Αποθήκευση</button><button class="btn ghost" onclick="logout()">Αποσύνδεση</button></div>`);
};
function setupForms(k) { const n = $('#' + k + 'N').value; const f = nameForms(n, $('#stG').value); $('#stGen').value = f.gen; $('#stAcc').value = f.acc; $('#stVoc').value = f.vocative; }
async function saveSetup() {
  const v = id => ($('#' + id) ? $('#' + id).value.trim() : '');
  const me = { role: 'parent', name: v('meN') || 'Γονιός', focus: v('meF') || 'math' };
  const stE = v('stE').toLowerCase(), p2E = v('p2E').toLowerCase();
  if (!stE || !v('stN')) { toast('Συμπληρώστε email και όνομα του μαθητή'); return; }
  const st = { role: 'student', name: v('stN'), gender: v('stG') || 'm', gen: v('stGen') || v('stN'), acc: v('stAcc') || v('stN'), vocative: v('stVoc') || v('stN') };
  $('#stSave').disabled = true;
  try {
    const b = FB.writeBatch(db);
    b.set(R.owner(), { email: USER.email, ts: Date.now() });
    b.set(R.member(USER.email), me);
    b.set(R.member(stE), st);
    if (p2E) b.set(R.member(p2E), { role: 'parent', name: v('p2N') || 'Γονιός', focus: v('p2F') || 'lang' });
    await b.commit();
    toast('Έτοιμο!'); location.reload();
  } catch (e) { $('#stSave').disabled = false; toast('Δεν αποθηκεύτηκε: ' + e.message, 6000); }
}
document.addEventListener('DOMContentLoaded', boot);
