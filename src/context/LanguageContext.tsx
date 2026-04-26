import React, { createContext, useContext, useState } from 'react';

export type Lang = 'ms' | 'en';

// ─── All translatable Malay strings ──────────────────────────────────────────

export const T = {
  // Login page — hero
  programTitle:    { ms: 'PROGRAM PENYELIDIKAN TRANSLASIONAL', en: 'TRANSLATIONAL RESEARCH PROGRAMME' },
  piResearcher:    { ms: 'Ketua Penyelidik (IPT): Dr. Lee It Ee', en: 'Principal Researcher (HEI): Dr. Lee It Ee' },
  beeSpeech:       { ms: 'Selamat datang,\npetani pintar! 🌾',   en: 'Welcome,\nsmart farmer! 🌾' },

  // Login page — card
  cardTitle:       { ms: 'Log Masuk',                              en: 'Sign In' },
  cardSub:         { ms: 'Akses selamat ke papan pemuka ladang',   en: 'Secure access to the farm dashboard' },
  emailLabel:      { ms: 'Emel',                                   en: 'Email' },
  passwordLabel:   { ms: 'Kata Laluan',                            en: 'Password' },
  verifying:       { ms: 'Mengesahkan...',                         en: 'Verifying...' },
  loginBtn:        { ms: 'Masuk ke Sistem 🌱',                     en: 'Enter System 🌱' },

  // Shared footer
  withCollab:      { ms: 'Dengan kolaborasi:',                     en: 'In collaboration with:' },

  // Dashboard — welcome strip
  welcomeTitle:    { ms: 'Selamat Datang',                         en: 'Welcome' },
  activeFarms:     { ms: '🌿 3 Ladang Aktif',                      en: '🌿 3 Active Farms' },

  // Dashboard — controls
  selectFarm:      { ms: '🗺️ Pilih Ladang',                        en: '🗺️ Select Farm' },

  // Dashboard — no access
  noAccessTitle:   { ms: 'Tiada Akses Ladang',                     en: 'No Farm Access' },
  noAccessDesc:    { ms: 'Akaun anda belum diberikan akses ke mana-mana ladang. Sila hubungi admin.', en: 'Your account has not been granted access to any farm. Please contact admin.' },

  // Dashboard — loading & logout
  loadingDashboard: { ms: 'Memuatkan papan pemuka...',             en: 'Loading dashboard...' },
  logoutBtn:        { ms: '🚪 Log Keluar',                         en: '🚪 Sign Out' },
} as const;

export type TKey = keyof typeof T;

// ─── Context ─────────────────────────────────────────────────────────────────

interface LanguageContextValue {
  lang: Lang;
  toggleLang: () => void;
  t: (key: TKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>('ms');

  const toggleLang = () => setLang(l => (l === 'ms' ? 'en' : 'ms'));

  const t = (key: TKey): string => T[key][lang];

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
};
