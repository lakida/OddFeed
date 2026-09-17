// Gradienti e icone per categoria — condivisi tra HomeScreen, ArchiveScreen, SavedScreen

export const CATEGORY_GRADIENTS: Record<string, readonly [string, string]> = {
  attualita:         ['#1E3A8A', '#3730A3'],
  gossip:            ['#9D174D', '#BE185D'],
  gossip_spettacolo: ['#6B21A8', '#9333EA'],
  crimini_strani:    ['#7F1D1D', '#B91C1C'],
  storie_assurde:    ['#4C1D95', '#7C3AED'],
  psicologia_strana: ['#134E4A', '#0F766E'],
  soldi_folli:       ['#713F12', '#CA8A04'],
  coincidenze:       ['#312E81', '#4F46E5'],
  tecnologia:        ['#0C4A6E', '#0284C7'],
  record:            ['#78350F', '#D97706'],
  animali:           ['#14532D', '#16A34A'],
  scienza:           ['#1E3A5F', '#2563EB'],
  leggi:             ['#1E293B', '#475569'],
  cultura:           ['#431407', '#C2410C'],
  gastronomia:       ['#7C2D12', '#EA580C'],
  luoghi:            ['#042F2E', '#0F766E'],
  sesso_relazioni:   ['#831843', '#DB2777'],
};

export function getCategoryGradient(category: string): readonly [string, string] {
  return CATEGORY_GRADIENTS[category] ?? ['#1E1B4B', '#4338CA'];
}

export const CATEGORY_ICONS: Record<string, string> = {
  attualita:         'newspaper-outline',
  gossip:            'star-outline',
  gossip_spettacolo: 'film-outline',
  crimini_strani:    'alert-circle-outline',
  storie_assurde:    'happy-outline',
  psicologia_strana: 'bulb-outline',
  soldi_folli:       'cash-outline',
  coincidenze:       'infinite-outline',
  tecnologia:        'laptop-outline',
  record:            'trophy-outline',
  animali:           'paw-outline',
  scienza:           'flask-outline',
  leggi:             'document-text-outline',
  cultura:           'globe-outline',
  gastronomia:       'restaurant-outline',
  luoghi:            'location-outline',
  sesso_relazioni:   'heart-outline',
};
