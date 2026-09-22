import json
import os
from datetime import datetime, timezone

HISTORY_FILE = 'data/history.json'


def load_history() -> list[dict]:
    os.makedirs('data', exist_ok=True)
    if not os.path.exists(HISTORY_FILE):
        return []
    with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_history(history: list[dict]) -> None:
    os.makedirs('data', exist_ok=True)
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


def get_used_ids_today(history: list[dict]) -> set:
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    return {e['article_id'] for e in history if e.get('date') == today}


def log_entry(
    history: list[dict],
    *,
    slot: str,
    article: dict,
    fb_post_id: str,
    ig_post_id: str,
) -> list[dict]:
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    entry = {
        'date':        today,
        'slot':        slot,
        'article_id':  article.get('id', ''),
        'category':    article.get('category', ''),
        'title':       (article.get('titleIt') or article.get('title', ''))[:80],
        'fb_post_id':  fb_post_id,
        'ig_post_id':  ig_post_id,
        'published_at': datetime.now(timezone.utc).isoformat(),
    }
    history.append(entry)
    return history
