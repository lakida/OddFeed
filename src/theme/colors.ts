// OddFeed — Design System
// Stile ChatGPT: minimal, editoriale, pulito

export const Colors = {
  // Sfondi
  bg: '#FFFFFF',
  bg2: '#F7F7F8',
  bgDark: '#1C1C1E',
  bg2Dark: '#2C2C2E',

  // Testi
  text: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textDark: '#F5F5F7',
  textSecondaryDark: '#8E8E93',

  // Bordi
  border: '#E5E5E5',
  borderDark: '#3A3A3C',

  // Accenti
  green: '#2D9E5F',
  greenBg: '#F0FAF4',
  greenBorder: '#B7E4C7',
  gold: '#C9A227',
  red: '#E63946',
  violet: '#6366F1',
  violetDark: '#4F52D3',
  violetBg: '#EEF2FF',

  // Tag colori
  tagAnimal: '#1a472a',
  tagTech: '#1a1a2e',
  tagRecord: '#7f1d1d',
  tagLaw: '#1e3a5f',
  tagScience: '#2c1654',
  tagFood: '#7c2d12',
  tagCulture: '#1e3a5f',
};

// Palette dinamica in base alla modalità scura/chiara
export function getColors(isDark: boolean) {
  return {
    bg:             isDark ? '#1C1C1E' : '#FFFFFF',
    bg2:            isDark ? '#2C2C2E' : '#F7F7F8',
    bg3:            isDark ? '#3A3A3C' : '#EFEFEF',
    text:           isDark ? '#F5F5F7' : '#1A1A1A',
    textSecondary:  isDark ? '#8E8E93' : '#666666',
    textTertiary:   isDark ? '#636366' : '#999999',
    border:         isDark ? '#3A3A3C' : '#E5E5E5',
    hero:           isDark ? '#2D2A6E' : '#4F46E5',
    heroText:       '#FFFFFF',
    heroSubtext:    'rgba(255,255,255,0.65)',
    heroCircle1:    'transparent',
    heroCircle2:    'transparent',
    logoMain:       '#FFFFFF',
    logoLight:      'rgba(255,255,255,0.85)',
    // Accenti invarianti
    green:          '#2D9E5F',
    greenBg:        isDark ? '#0D2E1C' : '#F0FAF4',
    greenBorder:    isDark ? '#1D5C38' : '#B7E4C7',
    gold:           '#C9A227',
    red:            '#E63946',
    violet:         '#6366F1',
    violetBg:       isDark ? '#1E1B4B' : '#EEF2FF',
    // Banner premium
    premiumBannerBg:     isDark ? '#2C2510' : '#FFFCF0',
    premiumBannerBorder: isDark ? '#6B5A10' : '#F0D98A',
    premiumBannerText:   isDark ? '#D4A820' : '#7A6010',
    // Card bianca editoriale (Attualità)
    cardWhite:      isDark ? '#2C2C2E' : '#FFFFFF',
    // Tag (per ArticleScreen)
    tagAnimal:  '#1a472a',
    tagTech:    '#1a1a2e',
    tagRecord:  '#7f1d1d',
    tagLaw:     '#1e3a5f',
    tagScience: '#2c1654',
    tagFood:    '#7c2d12',
    tagCulture: '#1e3a5f',
  };
}

export type AppColors = ReturnType<typeof getColors>;

export const FontSize = {
  xs: 11,
  sm: 12,
  md: 13,
  base: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 28,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 20,
  full: 999,
};
