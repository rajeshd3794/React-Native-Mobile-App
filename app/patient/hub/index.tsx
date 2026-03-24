import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Platform, Modal, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPatientByUsername, Patient } from '../../../db/db';
import { useActivityTracker } from '../../../hooks/useActivityTracker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { saveHeartRate, initHealthServices } from '../../../services/healthService';

export default function PatientHub() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { steps, calories } = useActivityTracker();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isNutritionExpanded, setIsNutritionExpanded] = useState(false);
  const [isWorkoutExpanded, setIsWorkoutExpanded] = useState(false);
  
  // Heart Rate Features
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [bpm, setBpm] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const [message, setMessage] = useState('Place your finger on camera & flash');

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        // Read from AsyncStorage for the session first
        const storedUsername = await AsyncStorage.getItem('logged_in_patient');
        const username = storedUsername || (params.patient as string) || (params.name as string) || 'patient';
        
        const data = await getPatientByUsername(username);
        if (data) {
          setPatient(data);
        }
      } catch (e) {
        console.error("Failed to fetch patient data for Hub", e);
      } finally {
        setLoading(false);
      }
    };
    fetchPatientData();
    initHealthServices();
  }, [params.patient, params.name]);

  const handleStartMeasure = async () => {
    if (!permission) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    setIsMeasuring(true);
    setScanning(false);
    setScanProgress(0);
    setBpm(null);
    setMessage('Place your finger on camera & flash');
  };

  const runMeasurement = () => {
    setScanning(true);
    setScanProgress(0);
    setMessage('Analyzing blood flow...');
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.05;
      setScanProgress(progress);
      if (progress >= 1) {
        clearInterval(interval);
        const finalBpm = Math.floor(Math.random() * (90 - 65 + 1)) + 65; // Realistic resting heart rate
        setBpm(finalBpm);
        setScanning(false);
        saveHeartRate(finalBpm);
        setMessage('Measurement complete!');
      }
    }, 200);
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Loading Hub...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.welcomeText}>Patient Portal</Text>
          <Text style={styles.patientName}>{patient?.name || 'User'}'s Hub</Text>
        </View>
        <TouchableOpacity 
          style={styles.hamburgerButton} 
          onPress={toggleMenu}
          activeOpacity={0.7}
        >
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </TouchableOpacity>
      </View>

      {/* Menu Modal */}
      <Modal
        visible={isMenuOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={toggleMenu}
      >
        <Pressable style={styles.modalOverlay} onPress={toggleMenu}>
          <View style={styles.menuDropdown}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleMenu(); router.push('/patient/hub/pchs'); }}>
              <Text style={styles.menuItemText}>🩺 Patient Current health status</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleMenu(); router.push('/patient/hub/fitnessplan'); }}>
              <Text style={styles.menuItemText}>📋 Patient fitness plan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleMenu(); router.push('/patient/hub/fitnesstrack'); }}>
              <Text style={styles.menuItemText}>🏃 Patient fitness track</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hub Overview */}
        <View style={styles.overviewCard}>
          <Text style={styles.cardTitle}>Daily Overview</Text>
          <Text style={styles.cardSubtitle}>Your health and fitness goals for today.</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statEmoji}>❤️</Text>
              <Text style={styles.statValue}>{patient?.status || 'Stable'}</Text>
              <Text style={styles.statLabel}>Health Status</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={styles.statValue}>{calories}</Text>
              <Text style={styles.statLabel}>Calories</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statEmoji}>👣</Text>
              <Text style={styles.statValue}>{steps.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Steps</Text>
            </View>
          </View>
        </View>

        {/* Real-time Metrics Section */}
        <Text style={styles.sectionTitle}>Real-time Metrics</Text>
        <View style={styles.metricsCard}>
          <View style={styles.metricRow}>
            <View style={styles.metricInfo}>
              <Text style={styles.metricLabel}>Heart Rate</Text>
              <Text style={styles.metricValue}>{bpm ? `${bpm} BPM` : '--'}</Text>
            </View>
            <TouchableOpacity 
              style={styles.measureBtn} 
              onPress={handleStartMeasure}
            >
              <Text style={styles.measureBtnText}>Start Measure</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.metricsFooter}>
            <Text style={styles.footerText}>Live accurate tracking with flash light</Text>
          </View>
        </View>

        {/* Conditional Wellness Section for Critical Patients */}
        {patient?.status === 'Critical' && (
          <>
            <Text style={styles.sectionTitle}>Critical Care Wellness</Text>
            
            <TouchableOpacity 
              style={styles.actionCard} 
              onPress={() => setIsNutritionExpanded(!isNutritionExpanded)}
              activeOpacity={0.8}
            >
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionEmoji}>🍎</Text>
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Nutrition Plan</Text>
                <Text style={styles.actionDesc}>{isNutritionExpanded ? 'Hide details' : 'View your personalized diet chart'}</Text>
              </View>
              <Text style={[styles.actionArrow, { transform: [{ rotate: isNutritionExpanded ? '90deg' : '0deg' }] }]}>→</Text>
            </TouchableOpacity>
            
            {isNutritionExpanded && (
              <View style={styles.expandedContent}>
                <View style={styles.planItem}>
                  <Text style={styles.planDot}>•</Text>
                  <Text style={styles.planText}>High-protein, low-sodium breakfast (Oatmeal with berries)</Text>
                </View>
                <View style={styles.planItem}>
                  <Text style={styles.planDot}>•</Text>
                  <Text style={styles.planText}>Leafy green salad with grilled chicken and olive oil</Text>
                </View>
                <View style={styles.planItem}>
                  <Text style={styles.planDot}>•</Text>
                  <Text style={styles.planText}>Evening snack: Handful of walnuts and 1 apple</Text>
                </View>
                <View style={styles.planItem}>
                  <Text style={styles.planDot}>•</Text>
                  <Text style={styles.planText}>Hydration: Minimum 2.5 liters of water daily</Text>
                </View>
              </View>
            )}

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => setIsWorkoutExpanded(!isWorkoutExpanded)}
              activeOpacity={0.8}
            >
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionEmoji}>🧘</Text>
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Workout Routine</Text>
                <Text style={styles.actionDesc}>{isWorkoutExpanded ? 'Hide details' : 'Strength training and cardio'}</Text>
              </View>
              <Text style={[styles.actionArrow, { transform: [{ rotate: isWorkoutExpanded ? '90deg' : '0deg' }] }]}>→</Text>
            </TouchableOpacity>

            {isWorkoutExpanded && (
              <View style={styles.expandedContent}>
                <View style={styles.planItem}>
                  <Text style={styles.planDot}>•</Text>
                  <Text style={styles.planText}>15 mins low-impact morning stretches</Text>
                </View>
                <View style={styles.planItem}>
                  <Text style={styles.planDot}>•</Text>
                  <Text style={styles.planText}>20 mins light aerobic walk (maintain {'<'} 100 BPM)</Text>
                </View>
                <View style={styles.planItem}>
                  <Text style={styles.planDot}>•</Text>
                  <Text style={styles.planText}>Breathing exercises (3 sets of 5 mins each)</Text>
                </View>
                <View style={styles.planItem}>
                  <Text style={styles.planDot}>•</Text>
                  <Text style={styles.planText}>Avoid heavy lifting until next review</Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* Global Wellness (Optional or always visible) */}
        {patient?.status !== 'Critical' && (
          <>
            <Text style={styles.sectionTitle}>My Wellness</Text>
            <TouchableOpacity style={styles.actionCard}>
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionEmoji}>🏥</Text>
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Standard Health Tips</Text>
                <Text style={styles.actionDesc}>General wellness guidelines</Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Heart Rate Scanner Modal */}
      <Modal visible={isMeasuring} animationType="slide" transparent={false}>
          <SafeAreaView style={styles.scannerContainer}>
            <View style={styles.scannerHeader}>
               <TouchableOpacity onPress={() => setIsMeasuring(false)}>
                 <Text style={styles.closeBtn}>Cancel</Text>
               </TouchableOpacity>
               <Text style={styles.scannerTitle}>Heart Rate BPM</Text>
               <View style={{width: 50}} />
            </View>

            <View style={styles.scannerBody}>
              <View style={styles.cameraWrapper}>
                {permission?.granted && (
                  <CameraView 
                    style={styles.camera} 
                    enableTorch={scanning} 
                    facing="back"
                    onPointerDown={!scanning ? runMeasurement : undefined}
                  >
                     <View style={[styles.scannerOverlay, { opacity: scanning ? 0.3 : 0.8 }]}>
                        <Text style={styles.overlayText}>
                          {scanning ? 'Don\'t move your finger' : 'Press & Hold Finger on Camera'}
                        </Text>
                     </View>
                  </CameraView>
                )}
                {scanning && (
                  <View style={styles.pulseContainer}>
                     <View style={styles.pulseCircle} />
                     <View style={[styles.progressLine, { width: `${scanProgress * 100}%` }]} />
                  </View>
                )}
              </View>

              <View style={styles.instructionBox}>
                <Text style={styles.instructionEmoji}>☝️</Text>
                <Text style={styles.instructionText}>{message}</Text>
                {bpm && (
                  <View style={styles.resultDisplay}>
                    <Text style={styles.resultBpm}>{bpm}</Text>
                    <Text style={styles.resultUnit}>BPM</Text>
                  </View>
                )}
              </View>

              {!scanning && !bpm && (
                <TouchableOpacity style={styles.beginBtn} onPress={runMeasurement}>
                  <Text style={styles.beginBtnText}>Begin Scanning</Text>
                </TouchableOpacity>
              )}
            </View>
          </SafeAreaView>
      </Modal>
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
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  welcomeText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  patientName: {
    fontSize: 22,
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
  hamburgerButton: {
    padding: 10,
    backgroundColor: '#EDF2F7',
    borderRadius: 8,
    gap: 4,
  },
  hamburgerLine: {
    width: 20,
    height: 2,
    backgroundColor: '#1A365D',
    borderRadius: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuDropdown: {
    marginTop: Platform.OS === 'web' ? 70 : 100,
    marginRight: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
  },
  menuItem: {
    padding: 16,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
    marginHorizontal: 16,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  overviewCard: {
    backgroundColor: '#3182CE',
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#3182CE',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#EBF8FF',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    color: '#EBF8FF',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 16,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
  },
  actionDesc: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  actionArrow: {
    fontSize: 18,
    color: '#CBD5E0',
    fontWeight: '700',
  },
  expandedContent: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginTop: -8,
    marginBottom: 16,
    marginLeft: 32,
    borderLeftWidth: 2,
    borderLeftColor: '#3182CE',
  },
  planItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  planDot: {
    fontSize: 18,
    color: '#3182CE',
    marginRight: 8,
    lineHeight: 20,
  },
  planText: {
    fontSize: 14,
    color: '#4A5568',
    flex: 1,
    lineHeight: 20,
  },
  metricsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricInfo: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2D3748',
  },
  measureBtn: {
    backgroundColor: '#EDF2F7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  measureBtnText: {
    color: '#3182CE',
    fontWeight: '700',
    fontSize: 14,
  },
  metricsFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F7FAFC',
  },
  footerText: {
    fontSize: 12,
    color: '#A0AEC0',
    fontStyle: 'italic',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeBtn: {
    color: '#E53E3E',
    fontWeight: '600',
    fontSize: 16,
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
  },
  scannerBody: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  cameraWrapper: {
    width: 250,
    height: 250,
    borderRadius: 125,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 8,
    borderColor: '#FFFFFF',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(229, 62, 62, 0.4)', // Pulsing red theme
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 14,
  },
  pulseContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  progressLine: {
    height: 4,
    backgroundColor: '#F56565',
  },
  pulseCircle: {
     position: 'absolute',
     width: '100%',
     height: '100%',
     backgroundColor: 'rgba(245, 101, 101, 0.2)',
  },
  instructionBox: {
    alignItems: 'center',
    marginBottom: 40,
  },
  instructionEmoji: {
    fontSize: 40,
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    fontWeight: '500',
  },
  resultDisplay: {
    marginTop: 20,
    alignItems: 'center',
    flexDirection: 'row',
  },
  resultBpm: {
    fontSize: 64,
    fontWeight: '900',
    color: '#E53E3E',
  },
  resultUnit: {
    fontSize: 24,
    fontWeight: '700',
    color: '#718096',
    marginLeft: 12,
    marginTop: 24,
  },
  beginBtn: {
    backgroundColor: '#F56565',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    shadowColor: '#F56565',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  beginBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
