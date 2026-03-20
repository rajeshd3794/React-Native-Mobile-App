import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_STEPS = 'activity_steps';
const STORAGE_CALORIES = 'activity_calories';
const STORAGE_DURATION = 'activity_duration';
const STORAGE_IS_TRACKING = 'activity_is_tracking';

export const useActivityTracker = () => {
  const [steps, setSteps] = useState(0);
  const [calories, setCalories] = useState(0);
  const [duration, setDuration] = useState(0); 
  const [isPedometerAvailable, setIsPedometerAvailable] = useState('checking');
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');
  const [isWalking, setIsWalking] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  
  // Track steps taken BEFORE the current start command
  const [baseSteps, setBaseSteps] = useState(0);

  // Load initial data
  useEffect(() => {
    const loadStats = async () => {
      try {
        const { granted, status } = await Pedometer.getPermissionsAsync();
        setPermissionStatus(status);

        const isAvailable = await Pedometer.isAvailableAsync();
        setIsPedometerAvailable(String(isAvailable));

        const savedSteps = await AsyncStorage.getItem(STORAGE_STEPS);
        const savedDuration = await AsyncStorage.getItem(STORAGE_DURATION);
        const savedTracking = await AsyncStorage.getItem(STORAGE_IS_TRACKING);
        
        if (savedSteps) {
          const s = parseInt(savedSteps, 10);
          setSteps(s);
          setBaseSteps(s);
          setCalories(Math.round(s * 0.04));
        }
        if (savedDuration) {
          setDuration(parseInt(savedDuration, 10));
        }
        if (savedTracking === 'true') {
          setIsTracking(true);
        }
      } catch (e) {
        console.error("Failed to load activity stats", e);
      }
    };
    loadStats();
  }, []);

  // Set up Pedometer
  useEffect(() => {
    let subscription: any;

    if (!isTracking) return;

    const subscribe = async () => {
      // Re-verify availability and check permission
      const isAvailable = await Pedometer.isAvailableAsync();
      if (!isAvailable) return;

      // watchStepCount returns steps SINCE the listener started
      subscription = Pedometer.watchStepCount(result => {
        // total = steps_before_start + steps_in_this_session
        const newTotalSteps = baseSteps + result.steps;
        const newCals = Math.round(newTotalSteps * 0.04);
        
        setSteps(newTotalSteps);
        setCalories(newCals);
        setIsWalking(true);
        
        // Persist
        AsyncStorage.setItem(STORAGE_STEPS, newTotalSteps.toString());
        AsyncStorage.setItem(STORAGE_CALORIES, newCals.toString());
      });
    };

    subscribe();
    return () => {
      if (subscription) subscription.remove();
    };
  }, [isTracking, baseSteps]);

  // Duration Timer logic (only if tracking)
  useEffect(() => {
    let interval: any;
    if (isTracking) {
      interval = setInterval(() => {
        setDuration(prev => {
          const next = prev + 1;
          AsyncStorage.setItem(STORAGE_DURATION, next.toString());
          return next;
        });
      }, 1000);

      const timeout = setTimeout(() => {
        setIsWalking(false);
      }, 3000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isTracking, isWalking]);

  const toggleTracking = useCallback(async () => {
    const nextState = !isTracking;
    
    if (nextState) {
      // Starting tracking: Ensure we have permissions
      const { granted, status } = await Pedometer.requestPermissionsAsync();
      setPermissionStatus(status);
      if (!granted) return;

      // Set baseSteps to current steps count so result.steps starts from here
      setBaseSteps(steps); 
    }

    setIsTracking(nextState);
    await AsyncStorage.setItem(STORAGE_IS_TRACKING, nextState.toString());
  }, [isTracking, steps]);

  const resetActivity = useCallback(async () => {
    setSteps(0);
    setBaseSteps(0);
    setCalories(0);
    setDuration(0);
    setIsWalking(false);
    setIsTracking(false);
    await AsyncStorage.multiRemove([STORAGE_STEPS, STORAGE_CALORIES, STORAGE_DURATION, STORAGE_IS_TRACKING]);
  }, []);

  return { 
    steps, 
    calories, 
    duration, 
    isWalking, 
    isTracking, 
    toggleTracking, 
    resetActivity, 
    isPedometerAvailable,
    permissionStatus
  };
};
