import os
import time

import requests

GRAPH_FB = 'https://graph.facebook.com/v21.0'
GRAPH_IG = 'https://graph.instagram.com/v21.0'

FB_PAGE_ID = os.environ.get('FB_PAGE_ID', '')
FB_TOKEN   = os.environ.get('FB_PAGE_ACCESS_TOKEN', '')
IG_USER_ID = os.environ.get('IG_USER_ID', '')
IG_TOKEN   = os.environ.get('IG_ACCESS_TOKEN', '')


def publish_to_facebook(image_path: str, caption: str) -> tuple[str, str]:
    """Carica foto + caption su Facebook. Ritorna (post_id, cdn_url)."""
    with open(image_path, 'rb') as f:
        resp = requests.post(
            f'{GRAPH_FB}/{FB_PAGE_ID}/photos',
            data={'caption': caption, 'access_token': FB_TOKEN},
            files={'source': ('post.jpg', f, 'image/jpeg')},
            timeout=60,
        )

    if not resp.ok or 'error' in resp.json():
        raise RuntimeError(f'Facebook API error {resp.status_code}: {resp.text}')

    data     = resp.json()
    post_id  = data.get('post_id') or data.get('id', '')
    photo_id = data.get('id', '')

    # Recupera CDN URL (fbcdn.net) per Instagram
    cdn_resp = requests.get(
        f'{GRAPH_FB}/{photo_id}',
        params={'fields': 'images', 'access_token': FB_TOKEN},
        timeout=30,
    )
    images  = cdn_resp.json().get('images', [])
    cdn_url = images[0]['source'] if images else None

    print(f'   ✅ [facebook] post_id={post_id}')
    return post_id, cdn_url


def publish_to_instagram(cdn_url: str, caption: str) -> str:
    """Crea container IG, fa polling su FINISHED, pubblica. Ritorna ig_post_id."""
    if not cdn_url:
        raise RuntimeError('CDN URL Facebook non disponibile')

    # 1. Crea container media
    resp = requests.post(
        f'{GRAPH_IG}/{IG_USER_ID}/media',
        data={
            'image_url': cdn_url,
            'caption': caption,
            'access_token': IG_TOKEN,
        },
        timeout=30,
    )
    data = resp.json()
    if not resp.ok or 'error' in data:
        raise RuntimeError(f'Instagram container error {resp.status_code}: {resp.text}')

    container_id = data['id']
    print(f'   Container IG creato: {container_id}')

    # 2. Polling su status_code == FINISHED
    for attempt in range(20):
        time.sleep(5)
        st = requests.get(
            f'{GRAPH_IG}/{container_id}',
            params={'fields': 'status_code', 'access_token': IG_TOKEN},
            timeout=15,
        ).json()
        status = st.get('status_code', '')
        print(f'   Polling IG ({attempt + 1}/20): {status}')
        if status == 'FINISHED':
            break
        if status == 'ERROR':
            raise RuntimeError('Instagram media processing error')
    else:
        raise RuntimeError('Instagram timeout: media non pronto dopo 100s')

    # 3. Pubblica
    pub = requests.post(
        f'{GRAPH_IG}/{IG_USER_ID}/media_publish',
        data={'creation_id': container_id, 'access_token': IG_TOKEN},
        timeout=30,
    )
    pub_data = pub.json()
    if not pub.ok or 'error' in pub_data:
        raise RuntimeError(f'Instagram publish error {pub.status_code}: {pub.text}')

    ig_post_id = pub_data['id']
    print(f'   ✅ [instagram] post_id={ig_post_id}')
    return ig_post_id
