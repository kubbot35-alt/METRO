import { createContext, useContext, type ReactNode } from 'react';
import type { LanguageId } from '../domain/types';

export interface ILanguageContextValue {
  readonly lang: LanguageId;
  readonly isEn: boolean;
  readonly setLanguage: (lang: LanguageId) => void;
  readonly tr: (pl: string, en: string) => string;
}

const LanguageContext = createContext<ILanguageContextValue>({
  lang: 'pl',
  isEn: false,
  setLanguage: () => {},
  tr: (pl) => pl,
});

export function LanguageProvider({
  language,
  onSetLanguage,
  children,
}: {
  readonly language: LanguageId;
  readonly onSetLanguage: (lang: LanguageId) => void;
  readonly children: ReactNode;
}) {
  const isEn = language === 'en';
  const value: ILanguageContextValue = {
    lang: language,
    isEn,
    setLanguage: onSetLanguage,
    tr: (pl: string, en: string) => (isEn ? en : pl),
  };
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): ILanguageContextValue {
  return useContext(LanguageContext);
}
