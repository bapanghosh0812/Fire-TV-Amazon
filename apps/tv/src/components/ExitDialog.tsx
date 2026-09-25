import React from 'react';
import { BackHandler, Platform } from 'react-native';
import { create } from 'zustand';
import { Dialog } from './Dialog';
import { useT } from '../i18n';

export const useExit = create<{ open: boolean; set: (open: boolean) => void }>((set) => ({ open: false, set: (open) => set({ open }) }));

/** "Leave Storyloom?" — shown when Back is pressed on the home screen, like the big TV apps. */
export function ExitDialog() {
  const t = useT();
  const open = useExit((s) => s.open);
  if (!open) return null;
  return (
    <Dialog
      icon="logout"
      title={t('exit.title')}
      body={t('exit.body')}
      confirmLabel={t('exit.confirm')}
      safeDefault
      onClose={() => useExit.getState().set(false)}
      onConfirm={() => {
        useExit.getState().set(false);
        if (Platform.OS === 'android') BackHandler.exitApp();
      }}
    />
  );
}
