import os
import json
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, firestore

# Categoria principale e fallback per ogni slot
SLOT_CATEGORIES = {
    'morning': {
        'primary': 'storie_assurde',
        'fallback': ['crimini_strani', 'attualita', 'coincidenze'],
    },
    'lunch': {
        'primary': 'coincidenze',
        'fallback': ['storie_assurde', 'crimini_strani', 'sesso_relazioni', 'attualita'],
    },
    'evening': {
        'primary': 'sesso_relazioni',
        'fallback': ['crimini_strani', 'storie_assurde', 'coincidenze'],
    },
}


def init_firebase():
    if not firebase_admin._apps:
        sa_json = os.environ['FIREBASE_SERVICE_ACCOUNT_JSON']
        cred = credentials.Certificate(json.loads(sa_json))
        firebase_admin.initialize_app(cred)
    return firestore.client()


def fetch_news_for_slot(slot: str, used_ids: set) -> dict | None:
    db = init_firebase()
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    config = SLOT_CATEGORIES[slot]
    primary = config['primary']
    fallback = [c for c in config['fallback'] if c != primary]
    categories_to_try = [primary] + fallback

    # Carica tutti gli articoli di oggi in una sola query
    docs = db.collection('articles').where('date', '==', today).stream()
    articles = [{'id': d.id, **d.to_dict()} for d in docs]

    if not articles:
        print(f'   Nessun articolo per oggi ({today})')
        return None

    # Escludi articoli già postati oggi
    available = [a for a in articles if a['id'] not in used_ids]
    if not available:
        print('   Tutti gli articoli già usati oggi, riuso dal totale')
        available = articles

    # Prova le categorie in ordine di priorità
    for cat in categories_to_try:
        candidates = [a for a in available if a.get('category') == cat]
        if candidates:
            article = candidates[0]
            print(f'   Trovato [{article.get("category")}]: {article.get("titleIt", "")[:60]}')
            return article

    # Ultimo fallback: primo articolo disponibile qualsiasi
    print('   Nessuna categoria corrispondente, uso primo disponibile')
    return available[0]
