import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

export const config = {
  apiBaseUrl: extra.apiBaseUrl || '',
  realtimeUrl: extra.realtimeUrl || '',
  companionBaseUrl: extra.companionBaseUrl || 'https://storyloom.app',
};

/** True when no cloud is configured: the app runs a local demo engine. */
export const isOfflineDemo = !config.apiBaseUrl;
