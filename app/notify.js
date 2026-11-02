"use strict";
/* ================= ΥΠΕΝΘΥΜΙΣΕΙΣ (μόνο στην εφαρμογή Android του μαθητή) =================
   Οι γονείς ορίζουν ώρα ανά ημέρα (SET.schedule: {0..6: 'ΩΩ:ΛΛ'}, 0 = Κυριακή) και προαιρετικά μια
   δεύτερη υπενθύμιση (SET.reminderLate) αν δεν έχει διαβάσει. Το κινητό προγραμματίζει τοπικά τις
   επόμενες 14 μέρες και τις ξαναϋπολογίζει κάθε φορά που αλλάζει κάτι ή ανοίγει η εφαρμογή. */
const DAY_NAMES = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
const IS_NATIVE = !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
const LN = IS_NATIVE && Capacitor.registerPlugin ? Capacitor.registerPlugin('LocalNotifications') : null;
function studyTime(d) { return ((SET.schedule || {})[(d || new Date()).getDay()]) || ''; }
function atTime(d, hhmm) { const [h, m] = hhmm.split(':').map(Number); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0); }
let notifTimer = null, notifSig = '', notifReady = false;
function scheduleNotifications() { if (!LN || !isStudent()) return; clearTimeout(notifTimer); notifTimer = setTimeout(doScheduleNotifications, 1500); }
async function setupNotifications() {
  if (notifReady) return true;
  let p = await LN.checkPermissions(); if (p.display !== 'granted') p = await LN.requestPermissions();
  if (p.display !== 'granted') return false;
  try { await LN.createChannel({ id: 'study', name: 'Διάβασμα', description: 'Υπενθυμίσεις για το διάβασμα', importance: 4, visibility: 1, vibration: true }); } catch (e) { }
  LN.addListener('localNotificationActionPerformed', ev => { const a = ev && ev.notification && ev.notification.extra && ev.notification.extra.action; if (a && USER) setTimeout(() => doAction(a), 600); });
  notifReady = true; return true;
}
async function doScheduleNotifications() {
  try {
    if (!(await setupNotifications())) return;
    const sch = SET.schedule || {}, late = SET.reminderLate || '', goal = SET.dailyMin || 25, now = Date.now();
    const today = parseDay(todayStr()); const mins = secondsOn(todayStr()) / 60;
    const t0 = todayTasks()[0]; const out = [];
    for (let i = 0; i < 14; i++) {
      const d = addDays(today, i); const t = sch[d.getDay()]; if (!t) continue;
      const base = (+todayStr(d).replace(/-/g, '') % 1000000) * 10;
      const at = atTime(d, t);
      if (at > now && !(i === 0 && mins >= goal * .8))
        out.push({ id: base + 1, title: '📘 Ώρα για διάβασμα!', body: i === 0 && t0 ? `Σήμερα: ${t0[1]} (${goal}′)` : `Συνεχίζεις με: ${TOP[currentChapter()].name} (${goal}′)`, schedule: { at, allowWhileIdle: true }, channelId: 'study', extra: { action: i === 0 && t0 ? t0[2] : 'chapter:' + currentChapter() } });
      if (late) { const at2 = atTime(d, late); if (at2 > now && at2 > at && !(i === 0 && mins > 0))
        out.push({ id: base + 2, title: '🔥 Μη χάσεις το σερί σου', body: 'Δεν έχεις διαβάσει ακόμα σήμερα. Λίγα λεπτά φτάνουν!', schedule: { at: at2, allowWhileIdle: true }, channelId: 'study', extra: { action: 'smart' } }); }
    }
    const sig = JSON.stringify(out.map(o => [o.id, +o.schedule.at, o.body])); if (sig === notifSig) return; notifSig = sig;
    const pend = await LN.getPending(); const old = (pend.notifications || []).filter(n => n.id < 100000000);
    if (old.length) await LN.cancel({ notifications: old.map(n => ({ id: n.id })) });
    if (out.length) await LN.schedule({ notifications: out });
  } catch (e) { console.warn('notifications', e); }
}
// Νέα ανάθεση από γονιό: ειδοποίηση αν η εφαρμογή τρέχει στο παρασκήνιο
let seenTasks = null;
async function notifyNewTasks() {
  if (!LN || !isStudent() || !notifReady) return;
  if (!seenTasks) { seenTasks = new Set((await IDB.get('seen-tasks')) || TASKS.map(t => t.id)); }
  const fresh = TASKS.filter(t => t.status !== 'done' && !seenTasks.has(t.id));
  if (!fresh.length) return; fresh.forEach(t => seenTasks.add(t.id)); IDB.put('seen-tasks', [...seenTasks]);
  if (document.visibilityState === 'visible') return;
  try { await LN.schedule({ notifications: fresh.slice(0, 3).map((t, i) => ({ id: 200000000 + (Date.now() / 1000 % 1e6 | 0) + i, title: `📌 ${t.byName}: νέα εργασία`, body: t.title, schedule: { at: new Date(Date.now() + 1500) }, channelId: 'study', extra: { action: t.action || null } })) }); } catch (e) { }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') scheduleNotifications(); });
