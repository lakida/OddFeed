CATEGORY_LABELS: dict[str, str] = {
    'storie_assurde':    'Storie Assurde',
    'crimini_strani':    'Crimini Strani',
    'coincidenze':       'Coincidenze',
    'sesso_relazioni':   'Sesso & Relazioni',
    'attualita':         'Attualità',
    'gossip':            'Gossip',
    'gossip_spettacolo': 'Gossip & Spettacolo',
    'psicologia_strana': 'Psicologia Strana',
    'soldi_folli':       'Soldi Folli',
    'tecnologia':        'Tecnologia',
    'record':            'Record',
    'animali':           'Animali',
    'scienza':           'Scienza',
    'leggi':             'Leggi Assurde',
    'cultura':           'Cultura',
    'gastronomia':       'Gastronomia',
    'luoghi':            'Luoghi',
}

HASHTAGS_FB = (
    '#OddFeed #NotizieAssurde #LoSapeviChe '
    '#Curiosità #StranezzeDelMondo'
)

HASHTAGS_IG = (
    '#OddFeed\n#NotizieAssurde\n#LoSapeviChe\n'
    '#Curiosità\n#StranezzeDelMondo'
)


def build_caption(article: dict, platform: str) -> str:
    cat       = article.get('category', '')
    cat_label = CATEGORY_LABELS.get(cat, cat.replace('_', ' ').title())
    title     = article.get('titleIt') or article.get('title', '')
    source    = article.get('source', '')
    art_id    = article.get('id', '')
    link      = f'https://oddfeed.app/articolo/{art_id}'

    if platform == 'facebook':
        return (
            f'[{cat_label.upper()}]\n'
            f'{title}\n\n'
            f'Fonte: {source}\n\n'
            f'\U0001f449 Leggi su OddFeed: {link}\n\n'
            f'{HASHTAGS_FB}'
        )

    # Instagram: tre punti separatori prima degli hashtag
    return (
        f'[{cat_label.upper()}]\n'
        f'{title}\n\n'
        f'Fonte: {source}\n\n'
        f'\U0001f449 Leggi su OddFeed: {link}\n\n'
        f'.\n.\n.\n'
        f'{HASHTAGS_IG}'
    )
