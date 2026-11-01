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
import json, glob, os, sys, shutil, hashlib, datetime

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

    exam = json.load(open(os.path.join(SRC, 'exam.json'), encoding='utf-8'))
    vocab = json.load(open(os.path.join(SRC, 'vocab.json'), encoding='utf-8'))

    body = {
        'topics': [{'id': a, 'name': b, 'subject': c} for a, b, c in TOPICS],
        'exam': exam, 'theory': theory, 'passages': ps, 'questions': out, 'vocab': vocab,
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
