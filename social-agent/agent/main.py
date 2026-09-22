"""
OddFeed Social Agent — entry point

Uso:
    python -m agent.main --slot morning   # storie_assurde
    python -m agent.main --slot lunch     # coincidenze
    python -m agent.main --slot evening   # sesso_relazioni
"""
import argparse
import sys

from .caption_generator import build_caption
from .image_composer import compose_image
from .logger import get_used_ids_today, load_history, log_entry, save_history
from .news_fetcher import fetch_news_for_slot
from .publisher import publish_to_facebook, publish_to_instagram

VALID_SLOTS = ('morning', 'lunch', 'evening')


def run(slot: str) -> None:
    if slot not in VALID_SLOTS:
        print(f'Slot non valido: {slot}. Usa: {", ".join(VALID_SLOTS)}')
        sys.exit(1)

    print(f'\n=== OddFeed Social Agent — slot: {slot} ===')

    # 1. Carica cronologia e trova articolo
    history  = load_history()
    used_ids = get_used_ids_today(history)
    print(f'   Articoli già usati oggi: {len(used_ids)}')

    article = fetch_news_for_slot(slot, used_ids)
    if not article:
        print('   Nessun articolo disponibile. Uscita.')
        sys.exit(0)

    # 2. Genera immagine
    print('   Composizione immagine...')
    image_path = compose_image(article)

    # 3. Caption
    fb_caption = build_caption(article, 'facebook')
    ig_caption = build_caption(article, 'instagram')

    # 4. Pubblica su Facebook
    print('   Pubblicazione Facebook...')
    try:
        fb_post_id, cdn_url = publish_to_facebook(image_path, fb_caption)
    except Exception as exc:
        print(f'❌ [facebook] ERRORE: {exc}')
        sys.exit(1)   # blocca tutto se FB fallisce

    # 5. Pubblica su Instagram
    print('   Pubblicazione Instagram...')
    ig_post_id = ''
    try:
        ig_post_id = publish_to_instagram(cdn_url, ig_caption)
    except Exception as exc:
        print(f'⚠️  [instagram] ERRORE (non bloccante): {exc}')
        # Instagram fallisce senza killare il job

    # 6. Salva in cronologia
    history = log_entry(
        history,
        slot=slot,
        article=article,
        fb_post_id=fb_post_id,
        ig_post_id=ig_post_id,
    )
    save_history(history)
    print('   Cronologia aggiornata.')
    print(f'=== Done ({slot}) ===\n')


def main() -> None:
    parser = argparse.ArgumentParser(description='OddFeed Social Agent')
    parser.add_argument('--slot', required=True, choices=VALID_SLOTS,
                        help='Fascia oraria: morning | lunch | evening')
    args = parser.parse_args()
    run(args.slot)


if __name__ == '__main__':
    main()
