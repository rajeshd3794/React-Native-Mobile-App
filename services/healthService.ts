import { Platform } from 'react-native';
// Note: These will only be linked in native builds, we use dynamic imports or checks to prevent crashes in Expo Go/Web
let AppleHealthKit: any = null;
let GoogleFit: any = null;

if (Platform.OS === 'ios') {
  try {
    AppleHealthKit = require('react-native-health').default;
  } catch (e) {
    console.warn('HealthKit not available in this environment');
  }
} else if (Platform.OS === 'android') {
  try {
    GoogleFit = require('react-native-google-fit').default;
  } catch (e) {
    console.warn('Google Fit not available in this environment');
  }
}

export const initHealthServices = async () => {
  if (Platform.OS === 'ios' && AppleHealthKit) {
    const permissions = {
      permissions: {
        read: [AppleHealthKit.Constants.Permissions.HeartRate],
        write: [AppleHealthKit.Constants.Permissions.HeartRate],
      },
    };
    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        if (error) {
          console.warn('[HealthKit] Initialization failed:', error);
          resolve(false);
        } else {
          console.log('[HealthKit] Initialized');
          resolve(true);
        }
      });
    });
  }

  if (Platform.OS === 'android' && GoogleFit) {
    try {
      const authResult = await GoogleFit.authorize({
        scopes: [
          'https://www.googleapis.com/auth/fitness.body.read',
          'https://www.googleapis.com/auth/fitness.body.write',
        ],
      });
      if (authResult.success) {
        console.log('[GoogleFit] Authorized');
        return true;
      }
    } catch (e) {
      console.warn('[GoogleFit] Authorization failed:', e);
    }
  }

  return false;
};

export const saveHeartRate = async (bpm: number) => {
  const timestamp = new Date().toISOString();

  // 1. Save to iOS HealthKit
  if (Platform.OS === 'ios' && AppleHealthKit) {
    const options = {
      value: bpm,
      unit: 'bpm',
      startDate: timestamp,
      endDate: timestamp,
    };
    AppleHealthKit.saveHeartRate(options, (error: string) => {
      if (error) console.error('[HealthKit] Save failed:', error);
    });
  }

  // 2. Save to Android Google Fit
  if (Platform.OS === 'android' && GoogleFit) {
    const options = {
        startDate: new Date().getTime(),
        endDate: new Date().getTime(),
        value: bpm,
    };
    GoogleFit.saveHeartRate(options)
      .then((res: any) => console.log('[GoogleFit] Saved:', res))
      .catch((err: any) => console.error('[GoogleFit] Save failed:', err));
  }

  console.log(`[HealthService] BPM ${bpm} localized for platform ${Platform.OS}`);
};
