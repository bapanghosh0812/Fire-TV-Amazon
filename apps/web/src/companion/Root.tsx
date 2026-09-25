'use client';

import { useEffect } from 'react';
import './index.css';
import App from './App';
import { isRtl, uiLang } from './i18n';

export default function CompanionRoot() {
  useEffect(() => {
    document.documentElement.lang = uiLang;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  }, []);
  return (
    <div id="root">
      <App />
    </div>
  );
}
