import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.giftfor.app',
  appName: 'Gift for',
  webDir: 'out',
  server: {
    url: 'https://giftfor.info',
    cleartext: false,
  },
  ios: {
    backgroundColor: '#ffffff',
  },
};

export default config;
