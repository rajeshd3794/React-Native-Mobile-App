import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Platform, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useActivity } from '../../../context/ActivityContext';
import HeartRateMonitor from '../../../components/HeartRateMonitor';

const { width } = Dimensions.get('window');

export default function PatientFitnessTrack() {
  const router = useRouter();
  const { steps, calories, duration, isWalking, isTracking, isPocketed, toggleTracking, resetActivity, permissionStatus, locationPermission, isPedometerAvailable } = useActivity();
  
  // Real-time Heart Rate State
  const [showMonitor, setShowMonitor] = useState(false);

  const maxHR = 120;

  const [stepPulse, setStepPulse] = useState(false);

  // Sync refs with state
  const [heart_bpm, setHeartBpm] = useState(75);
  const [heartRateHistory, setHeartRateHistory] = useState([65, 72, 68, 85, 92, 78, 70, 68, 75, 82]);

  // Pulse effect when steps increase
  useEffect(() => {
    if (steps > 0) {
      setStepPulse(true);
      const timer = setTimeout(() => setStepPulse(false), 200);
      return () => clearTimeout(timer);
    }
  }, [steps]);

  // Session Cleanup: None (New requirement: Persist on Stop, only reset on Reset button)
  // Removed automatic resetActivity call on unmount to enable session recovery.

  // Handle permission denials
  useEffect(() => {
    if (isTracking && permissionStatus === 'denied') {
      Alert.alert(
        "Permission Required",
        "Motion & Fitness permission is required for accurate step tracking. Please enable it in your device settings.",
        [{ text: "OK" }]
      );
    }
  }, [isTracking, permissionStatus]);

  // Logic removed: Delegated to HeartRateMonitor component

  // Logic removed: Delegated to HeartRateMonitor component

  const toggleMeasurement = () => {
    setShowMonitor(true);
  };

  const [bpmPulse, setBpmPulse] = useState(false);

  const handleMeasurementResult = (finalBpm: number) => {
    setHeartBpm(finalBpm);
    setHeartRateHistory(prev => [...prev.slice(1), finalBpm]);
    setBpmPulse(true);
    setTimeout(() => {
      setBpmPulse(false);
    }, 3000); // Pulse effect duration
  };

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fitness Track</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {!isTracking ? (
            <TouchableOpacity 
              style={styles.startHeaderButton} 
              onPress={toggleTracking}
            >
              <Text style={styles.startHeaderText}>Start</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.startHeaderButton, styles.stopHeaderButton]} 
              onPress={toggleTracking}
            >
              <Text style={styles.startHeaderText}>Stop</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={resetActivity} style={{ marginLeft: 4 }}>
            <Text style={{color: '#F56565', fontWeight: '700', fontSize: 13}}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Activity Summary */}
        <View style={styles.summaryCard}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
            <Text style={styles.cardTitle}>Activity Summary</Text>
            {isTracking ? (
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                <View style={styles.trackingActiveIndicator}>
                  <View style={[styles.activeDot, isWalking && { backgroundColor: '#48BB78', transform: [{ scale: stepPulse ? 1.5 : 1 }] }]} />
                  <Text style={styles.activeText}>{isWalking ? 'WALKING...' : 'ACTIVE'}</Text>
                </View>
              </View>
            ) : (
              <Text style={{fontSize: 12, color: '#A0AEC0', fontWeight: '700'}}>PAUSED</Text>
            )}
          </View>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, stepPulse && { color: '#48BB78', transform: [{ scale: 1.1 }] }]}>
                {steps.toLocaleString()}
              </Text>
              <Text style={styles.summaryLabel}>Steps</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{calories}</Text>
              <Text style={styles.summaryLabel}>Calories</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{formatDuration(duration || 0)}</Text>
              <Text style={styles.summaryLabel}>Duration</Text>
            </View>
          </View>


          {isTracking && !isPocketed && (
             <Text style={[styles.accuracyHint, { color: '#E53E3E' }]}>⚠️ Please place the phone in your pocket to accurately track steps.</Text>
          )}
          {isTracking && isPocketed && (
             <Text style={styles.accuracyHint}>Tip: Keep phone in pocket for best step accuracy</Text>
          )}
        </View>

        {/* Real-time Metrics (Graph) */}
        <Text style={styles.sectionTitle}>Real-time Metrics</Text>
        <View style={styles.graphCard}>
          <View style={styles.graphHeader}>
            <View>
              <Text style={styles.graphTitle}>Heart Rate BPM</Text>
            </View>

            <Text style={[styles.graphValue, bpmPulse && { color: '#FEB2B2', transform: [{ scale: 1.1 }] }]}>
              {heart_bpm > 0 ? heart_bpm : '--'} <Text style={styles.graphUnit}>BPM</Text>
            </Text>
          </View>
          
          <View style={styles.chartContainer}>
            {heartRateHistory.map((val, idx) => (
              <View key={idx} style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: (val / maxHR) * 100,
                      backgroundColor: val > 100 ? '#F56565' : '#4299E1',
                    }
                  ]} 
                />
              </View>
            ))}
          </View>

          <View style={styles.graphFooter}>
            <TouchableOpacity 
              style={styles.measureButton} 
              onPress={toggleMeasurement}
            >
              <Text style={styles.measureButtonText}>❤️ Start Measure</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* PPG Sensor Interface (Visible when measuring) */}
        {/* PPG Sensor Interface handled by HeartRateMonitor Modal */}

        {/* Goals Meter */}
        <Text style={styles.sectionTitle}>Goals Meter</Text>
        <View style={styles.goalsCard}>
          <View style={styles.goalItem}>
            <View style={styles.goalInfo}>
              <Text style={styles.goalName}>Daily Step Target (10,000)</Text>
              <Text style={styles.goalPercent}>{Math.min(Math.round((steps / 10000) * 100), 100)}%</Text>
            </View>
            <View style={styles.meterBase}>
              <View style={[styles.meterFill, { width: `${Math.min((steps / 10000) * 100, 100)}%`, backgroundColor: '#48BB78' }]} />
            </View>
          </View>
          <View style={[styles.goalItem, { marginTop: 16 }]}>
            <View style={styles.goalInfo}>
              <Text style={styles.goalName}>Weekly Workout Goal</Text>
              <Text style={styles.goalPercent}>66%</Text>
            </View>
            <View style={styles.meterBase}>
              <View style={[styles.meterFill, { width: '66%', backgroundColor: '#3182CE' }]} />
            </View>
          </View>
        </View>

        {/* Workout Log */}
        <Text style={styles.sectionTitle}>Workout Log</Text>
        <View style={styles.logCard}>
          <View style={styles.logItem}>
            <View style={styles.logIcon}>
              <Text style={{fontSize: 20}}>🏃</Text>
            </View>
            <View style={styles.logDetails}>
              <Text style={styles.logTitle}>Morning Jog</Text>
              <Text style={styles.logMeta}>Today, 08:30 AM • 30 mins</Text>
            </View>
            <View style={styles.intensityBadge}>
              <Text style={styles.intensityText}>High</Text>
            </View>
          </View>
          <View style={styles.logDivider} />
          <View style={styles.logItem}>
            <View style={styles.logIcon}>
              <Text style={{fontSize: 20}}>🧘</Text>
            </View>
            <View style={styles.logDetails}>
              <Text style={styles.logTitle}>Evening Yoga</Text>
              <Text style={styles.logMeta}>Yesterday, 06:15 PM • 45 mins</Text>
            </View>
            <View style={[styles.intensityBadge, { backgroundColor: '#C6F6D5' }]}>
              <Text style={[styles.intensityText, { color: '#22543D' }]}>Low</Text>
            </View>
          </View>
        </View>

        <View style={styles.navLinks}>
           <TouchableOpacity style={styles.navButton} onPress={() => router.push('/patient/hub/pchs')}>
             <Text style={styles.navButtonText}>Health Status</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.navButton} onPress={() => router.push('/patient/hub/fitnessplan')}>
             <Text style={styles.navButtonText}>Fitness Plan</Text>
           </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <HeartRateMonitor 
        visible={showMonitor}
        onClose={() => setShowMonitor(false)}
        onResult={handleMeasurementResult}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A365D',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#1A365D',
    fontWeight: '700',
  },
  startHeaderButton: {
    backgroundColor: '#48BB78',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stopHeaderButton: {
    backgroundColor: '#F6E05E',
  },
  startHeaderText: {
    color: '#1A365D',
    fontSize: 14,
    fontWeight: '800',
  },
  trackingActiveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#48BB78',
  },
  activeText: {
    fontSize: 12,
    color: '#48BB78',
    fontWeight: '800',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D3748',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#3182CE',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
  },
  accuracyHint: {
    fontSize: 10,
    color: '#718096',
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A365D',
    marginBottom: 16,
  },
  graphCard: {
    backgroundColor: '#1A365D',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
  },
  graphHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  graphTitle: {
    fontSize: 14,
    color: '#EBF8FF',
    fontWeight: '600',
  },
  graphValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  graphUnit: {
    fontSize: 14,
    color: '#48BB78',
  },
  chartContainer: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  barContainer: {
    width: (width - 120) / 10,
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    borderRadius: 4,
    width: '100%',
  },
  graphFooter: {
    alignItems: 'center',
  },
  measureButton: {
    backgroundColor: '#48BB78',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#F56565',
  },
  measureButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  goalsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  goalItem: {
    width: '100%',
  },
  goalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  goalName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A5568',
  },
  goalPercent: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D3748',
  },
  meterBase: {
    height: 10,
    backgroundColor: '#EDF2F7',
    borderRadius: 5,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 5,
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 8,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  logIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logDetails: {
    flex: 1,
  },
  logTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D3748',
  },
  logMeta: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  intensityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FED7D7',
  },
  intensityText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#822727',
    textTransform: 'uppercase',
  },
  logDivider: {
    height: 1,
    backgroundColor: '#F7FAFC',
    marginHorizontal: 12,
  },
  navLinks: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  navButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3182CE',
  },
  navButtonText: {
    color: '#3182CE',
    fontSize: 14,
    fontWeight: '700',
  },
});
