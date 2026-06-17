import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bountyhunter.app',
  appName: 'Bounty Hunter',
  webDir: 'dist',
  plugins: {
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#090A0F',
      overlaysWebView: false,
    },
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#090A0F',
      showSpinner: false,
    },
  },
};

export default config;
