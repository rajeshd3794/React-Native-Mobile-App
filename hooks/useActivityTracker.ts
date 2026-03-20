import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_STEPS = 'activity_steps';
const STORAGE_CALORIES = 'activity_calories';
const STORAGE_DURATION = 'activity_duration';

export const useActivityTracker = () => {
  const [steps, setSteps] = useState(0);
  const [calories, setCalories] = useState(0);
  const [duration, setDuration] = useState(0); // in seconds
  const [isPedometerAvailable, setIsPedometerAvailable] = useState('checking');
  const [isWalking, setIsWalking] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadStats = async () => {
      try {
        const savedSteps = await AsyncStorage.getItem(STORAGE_STEPS);
        const savedDuration = await AsyncStorage.getItem(STORAGE_DURATION);
        
        if (savedSteps) {
          const s = parseInt(savedSteps, 10);
          setSteps(s);
          setCalories(Math.round(s * 0.04));
        }
        if (savedDuration) {
          setDuration(parseInt(savedDuration, 10));
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

    const subscribe = async () => {
      const isAvailable = await Pedometer.isAvailableAsync();
      setIsPedometerAvailable(String(isAvailable));

      if (isAvailable) {
        subscription = Pedometer.watchStepCount(result => {
          setSteps(prevSteps => {
            const newSteps = prevSteps + result.steps;
            const newCals = Math.round(newSteps * 0.04);
            setCalories(newCals);
            setIsWalking(true);
            
            // Sync to storage
            AsyncStorage.setItem(STORAGE_STEPS, newSteps.toString());
            AsyncStorage.setItem(STORAGE_CALORIES, newCals.toString());
            
            return newSteps;
          });
        });
      }
    };

    subscribe();
    return () => subscription && subscription.remove();
  }, []);

  // Duration Timer logic (only if walking)
  useEffect(() => {
    let interval: any;
    if (isWalking) {
      interval = setInterval(() => {
        setDuration(prev => {
          const next = prev + 1;
          AsyncStorage.setItem(STORAGE_DURATION, next.toString());
          return next;
        });
      }, 1000);

      // Reset isWalking after 3 seconds of no step updates
      const timeout = setTimeout(() => {
        setIsWalking(false);
      }, 3000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isWalking]);

  const resetActivity = useCallback(async () => {
    setSteps(0);
    setCalories(0);
    setDuration(0);
    setIsWalking(false);
    await AsyncStorage.multiRemove([STORAGE_STEPS, STORAGE_CALORIES, STORAGE_DURATION]);
  }, []);

  // FOR WEB/SIMULATION: Manually trigger a "Walk" for testing
  const simulateWalk = useCallback((count = 10) => {
    setSteps(prev => {
      const next = prev + count;
      setCalories(Math.round(next * 0.04));
      setIsWalking(true);
      AsyncStorage.setItem(STORAGE_STEPS, next.toString());
      return next;
    });
  }, []);

  return { steps, calories, duration, isWalking, resetActivity, simulateWalk, isPedometerAvailable };
};
