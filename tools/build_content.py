#!/usr/bin/env python3
"""Χτίζει το app/content/ από τα αρχεία του source/.

- Ενώνει ερωτήσεις, κείμενα, θεωρία, λεξιλόγιο, ρυθμίσεις εξέτασης.
- Εφαρμόζει διορθώσεις (source/fixes-*.json).
- Ελέγχει: μοναδικά ids, έγκυρες απαντήσεις, σχήματα, και ότι ΚΑΝΕΝΑ id
  που υπήρξε ποτέ δεν χάνεται (tools/id-registry.json, μόνο προσθήκες).
  Για να βγει μια ερώτηση από τη χρήση: "retired": true στην πηγή.
- Αυξάνει την έκδοση περιεχομένου μόνο όταν αλλάξει κάτι.

Χρήση:  python3 tools/build_content.py "Σύντομη περιγραφή αλλαγών"
"""
import re, json, glob, os, sys, shutil, hashlib, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'source')
OUT = os.path.join(ROOT, 'app', 'content')
REG = os.path.join(ROOT, 'tools', 'id-registry.json')

TOPICS = [
  # id, όνομα, μάθημα
  ('γλ-κατανόηση', 'Κατανόηση κειμένου', 'lang'),
  ('γλ-λεξιλόγιο', 'Λεξιλόγιο', 'lang'),
  ('γλ-γραμματική', 'Γραμματική', 'lang'),
  ('γλ-σύνταξη', 'Σύνταξη', 'lang'),
  ('γλ-νόημα', 'Νόημα & ύφος', 'lang'),
  ('γλ-ορθογραφία', 'Ορθογραφία', 'lang'),
  ('μθ-αριθμοί', 'Αριθμοί & πράξεις', 'math'),
  ('μθ-κλάσματα', 'Κλάσματα & δεκαδικοί', 'math'),
  ('μθ-ποσοστά', 'Ποσοστά & αναλογίες', 'math'),
  ('μθ-μετρήσεις', 'Μετρήσεις & χρόνος', 'math'),
  ('μθ-εξισώσεις', 'Εξισώσεις & άγνωστος', 'math'),
  ('μθ-γεωμετρία', 'Γεωμετρία', 'math'),
  ('μθ-στατιστική', 'Πίνακες, διαγράμματα, πιθανότητες', 'math'),
  ('μθ-λογική', 'Λογική & γρίφοι', 'math'),
]

BOOK_FILES = {
    'Γλώσσα Στ΄ Δημοτικού – Βιβλίο δασκάλου': 'bk-glossa-st-d',
    'Γραμματική Ε΄ & Στ΄ Δημοτικού': 'bk-grammatiki-ed',
    'Γραμματική Νέας Ελληνικής Γλώσσας Α΄–Γ΄ Γυμνασίου': 'bk-grammatiki-gym',
    'Μαθηματικά Ε΄ – Βιβλίο μαθητή, τεύχος Α': 'bk-math-e-a',
    'Μαθηματικά Ε΄ – Βιβλίο μαθητή, τεύχος Β': 'bk-math-e-b',
    'Μαθηματικά Στ΄ – Βιβλίο μαθητή': 'bk-math-st',
}
IND_PREFIX = [  # πρόθεμα id ερώτησης → (αρχείο θεμάτων, αρχείο απαντήσεων)
    ('end2026-lang', 'ind-2026-lang', None), ('end2026-math', 'ind-2026-math', None),
    ('end2025-lang', 'ind-2025-lang', None), ('end2025-math', 'ind-2025-math', None),
    ('end2023-math', 'ind-2023-math', None), ('end2022-math', 'ind-2022-math', None), ('end2022-lang', 'ind-2022-lang', None),
    ('end2021-math', 'ind-2021-math', None), ('end2020-math', 'ind-2020-math', None),
    ('end2018a-math', 'ind-2018-math-1', 'ind-2018-math-1a'), ('end2018b-math', 'ind-2018-math-2', 'ind-2018-math-2a'),
    ('end2018-lang-a', 'ind-2018-lang-1', None), ('end2018-lang-b', 'ind-2018-lang-2', None),
    ('end2017-lang-a', 'ind-2017-lang-a', None), ('end2017-lang-b', 'ind-2017-lang-b', None), ('end2017-math', 'ind-2017-math', 'ind-2017-math-a'),
    ('end-xenopoulos', 'ind-xenopoulos', None), ('end-dynatos', 'ind-dynatos', None), ('end-paichnidia', 'ind-paichnidia', None),
    ('end-stoicheio', 'ind-stoicheio', None), ('end-erevna', 'ind-erevna', None), ('end-arion', 'ind-arion', None),
    ('end-paidia', 'ind-paidia', None), ('end-mcq', 'ind-mcq', None), ('end-thalassa', 'ind-thalassa', None),
    ('end-ichor', 'ind-ichor', None), ('end-flyaros', 'ind-flyaros', None), ('end-hobbit', 'ind-hobbit', None),
    ('end-stefanidi', 'ind-stefanidi', None), ('end-themata2', 'col-25themata', None),
]
def file_for(qid, q):
    m = re.match(r'^(202[1-6])-\d+$', qid)
    if m: return ('exam-' + m.group(1), 'ans-' + m.group(1))
    m = re.match(r'^2020-(\d+)$', qid)
    if m: s = 'glossa' if int(m.group(1)) <= 25 else 'math'; return (f'exam-2020-{s}', f'ans-2020-{s}')
    m = re.match(r'^(201[4-9])-([gm])', qid)
    if m: s = 'glossa' if m.group(2) == 'g' else 'math'; return (f'exam-{m.group(1)}-{s}', f'ans-{m.group(1)}-{s}')
    for p, a, b in IND_PREFIX:
        if qid.startswith(p): return (a, b)
    return None

def fail(msg):
    print('ΣΦΑΛΜΑ:', msg); sys.exit(1)

def main():
    note = sys.argv[1] if len(sys.argv) > 1 else ''
    qs, ps = [], []
    for f in sorted(glob.glob(os.path.join(SRC, 'questions', '*.json'))):
        d = json.load(open(f, encoding='utf-8'))
        for q in d['questions']:
            q['_file'] = os.path.basename(f)
        qs += d['questions']; ps += d.get('passages', [])

    # διορθώσεις
    byid = {q['id']: q for q in qs}
    for f in sorted(glob.glob(os.path.join(SRC, 'fixes-*.json'))):
        for fx in json.load(open(f, encoding='utf-8')):
            q = byid.get(fx['id'])
            if q and fx.get('fix'):
                q.update(fx['fix'])

    topic_ids = {t[0] for t in TOPICS}
    seen = set(); out = []
    for q in qs:
        if q['id'] in seen: fail('διπλό id ' + q['id'])
        seen.add(q['id'])
        kind = q.get('kind') or ('exam' if q.get('official') else 'new')
        if q['_file'].startswith('new-'): kind = 'new'
        q['kind'] = kind
        q['official'] = kind == 'exam'
        if kind == 'new':
            q['srcLabel'] = 'Νέα ερώτηση εξάσκησης'; q['answerSource'] = 'ours'
        if not q.get('srcLabel'):
            q['srcLabel'] = f"Εξετάσεις {q.get('year')} · ερ. {q.get('num')}"
        q.setdefault('answerSource', 'official')
        if q['topic'] not in topic_ids: fail(f"άγνωστη ενότητα {q['topic']} στο {q['id']}")
        keys = [o['k'] for o in q['options']]
        if q['answer'] not in keys: fail('απάντηση εκτός επιλογών ' + q['id'])
        if len(set(keys)) != len(keys): fail('διπλό γράμμα επιλογής ' + q['id'])
        if q.get('figure'):
            fn = os.path.basename(q['figure'])
            if not os.path.exists(os.path.join(SRC, 'figs', fn)): fail('λείπει σχήμα ' + fn)
            q['figure'] = 'content/figs/' + fn
        q.pop('_file', None)
        out.append(q)

    pids = set()
    for p in ps:
        if p['id'] in pids: fail('διπλό κείμενο ' + p['id'])
        pids.add(p['id'])
        if p.get('figure'): p['figure'] = 'content/figs/' + os.path.basename(p['figure'])
    for q in out:
        if q.get('passage') and q['passage'] not in pids: fail('άγνωστο κείμενο ' + q['passage'])

    # μητρώο ids: τίποτα δεν χάνεται
    reg = json.load(open(REG, encoding='utf-8')) if os.path.exists(REG) else []
    missing = [i for i in reg if i not in seen]
    if missing: fail('χάθηκαν ids (βάλε "retired": true αντί να τα σβήσεις): ' + ', '.join(missing[:20]))
    reg_new = reg + sorted(i for i in seen if i not in set(reg))

    theory = []
    for f in sorted(glob.glob(os.path.join(SRC, 'theory', '*.json'))):
        theory += json.load(open(f, encoding='utf-8'))
    theory.sort(key=lambda c: c.get('order', 99))
    for c in theory:
        if c['id'] not in topic_ids: fail('θεωρία για άγνωστη ενότητα ' + c['id'])
        for l in c['lessons']:
            for qid in l.get('check', []):
                if qid not in seen: fail(f'θεωρία {l["id"]}: άγνωστη ερώτηση {qid}')
        for e in c.get('examples', []):
            if e['qid'] not in seen: fail(f'θεωρία {c["id"]}: άγνωστο παράδειγμα {e["qid"]}')

    # Αρχεία (PDF θεμάτων & βιβλίων στο GitHub Pages): σύνδεση ερωτήσεων και παραπομπών βιβλίων με το αρχείο τους
    files = json.load(open(os.path.join(SRC, 'files.json'), encoding='utf-8'))
    fids = {f['id'] for f in files}
    for q in out:
        r = file_for(q['id'], q)
        if r:
            for k, v in zip(('file', 'ansFile'), r):
                if v:
                    if v not in fids: fail(f'{q["id"]}: άγνωστο αρχείο {v}')
                    q[k] = v
    for c in theory:
        for b in c.get('bookRefs', []):
            fid = BOOK_FILES.get(b['book'])
            if not fid: fail(f'θεωρία {c["id"]}: άγνωστο βιβλίο «{b["book"]}»')
            b['file'] = fid
            m = re.search(r'PDF (\d+)', b.get('pages', ''))
            if m: b['page'] = int(m.group(1))

    exam = json.load(open(os.path.join(SRC, 'exam.json'), encoding='utf-8'))
    vocab = json.load(open(os.path.join(SRC, 'vocab.json'), encoding='utf-8'))

    body = {
        'topics': [{'id': a, 'name': b, 'subject': c} for a, b, c in TOPICS],
        'exam': exam, 'theory': theory, 'passages': ps, 'questions': out, 'vocab': vocab, 'files': files,
    }
    blob = json.dumps(body, ensure_ascii=False, sort_keys=True).encode()
    h = hashlib.sha256(blob).hexdigest()[:16]

    os.makedirs(os.path.join(OUT, 'figs'), exist_ok=True)
    man_path = os.path.join(OUT, 'manifest.json')
    man = json.load(open(man_path, encoding='utf-8')) if os.path.exists(man_path) else {'version': 0, 'hash': '', 'history': []}
    if man.get('hash') != h:
        man['version'] += 1; man['hash'] = h
        man['date'] = datetime.date.today().isoformat()
        man['notes'] = note or 'Ενημέρωση περιεχομένου'
        man['history'] = ([{'version': man['version'], 'date': man['date'], 'notes': man['notes']}] + man.get('history', []))[:30]
        man['counts'] = {'questions': len(out), 'passages': len(ps), 'chapters': len(theory)}
        body['version'] = man['version']
        json.dump(body, open(os.path.join(OUT, 'content.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        json.dump(man, open(man_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        json.dump(reg_new, open(REG, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
        for fn in glob.glob(os.path.join(SRC, 'figs', '*.png')):
            shutil.copy(fn, os.path.join(OUT, 'figs'))
        print(f"Νέα έκδοση περιεχομένου {man['version']}: {len(out)} ερωτήσεις, {len(ps)} κείμενα, {len(theory)} κεφάλαια θεωρίας")
    else:
        print(f"Καμία αλλαγή (έκδοση {man['version']})")

if __name__ == '__main__':
    main()
