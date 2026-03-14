import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getPatientHistory, PatientHistoryItem } from '../db/db';

export default function PatientHistory() {
  const { username, name } = useLocalSearchParams();
  const router = useRouter();
  const [history, setHistory] = useState<PatientHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const storedHistory = await getPatientHistory(username as string);
        if (storedHistory.length > 0) {
          setHistory(storedHistory);
        } else {
          // Mock history for the last 3 years
          const mockHistory: PatientHistoryItem[] = [
            { id: 1, patientUsername: username as string, date: '2023-11-15', event: 'Annual Physical', details: 'Patient is in good health. BP: 120/80.' },
            { id: 2, patientUsername: username as string, date: '2023-05-10', event: 'Flu Vaccination', details: 'Standard seasonal flu shot administered.' },
            { id: 3, patientUsername: username as string, date: '2022-12-05', event: 'Blood Work', details: 'Cholesterol levels slightly elevated. Advised diet changes.' },
            { id: 4, patientUsername: username as string, date: '2022-06-20', event: 'Follow-up Visit', details: 'Condition stable. Medication continued.' },
            { id: 5, patientUsername: username as string, date: '2021-10-12', event: 'Initial Consultation', details: 'Diagnosed with mild hypertension. Started 5mg Amlodipine.' },
          ];
          setHistory(mockHistory);
        }
      } catch (e) {
        console.error('Failed to fetch patient history', e);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [username]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Medical History</Text>
          <Text style={styles.headerSubtitle}>{name}</Text>
        </View>
        <View style={{ width: 40 }} /> {/* Spacer */}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Last 3 Years</Text>
        
        {loading ? (
          <Text style={styles.loadingText}>Loading history...</Text>
        ) : history.length === 0 ? (
          <Text style={styles.emptyText}>No history records found.</Text>
        ) : (
          <View style={styles.timeline}>
            {history.map((item, index) => (
              <View key={item.id || index} style={styles.timelineItem}>
                <View style={styles.timelineDotContainer}>
                  <View style={styles.timelineDot} />
                  {index !== history.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.eventDate}>{item.date}</Text>
                  <Text style={styles.eventTitle}>{item.event}</Text>
                  {item.details && <Text style={styles.eventDetails}>{item.details}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
    paddingBottom: 16,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    paddingVertical: 8,
    width: 60,
  },
  backText: {
    fontSize: 16,
    color: '#3182CE',
    fontWeight: '600',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A365D',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3748',
    marginBottom: 24,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#718096',
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#718096',
    fontSize: 16,
    fontStyle: 'italic',
  },
  timeline: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineDotContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3182CE',
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eventDate: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 8,
  },
  eventDetails: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
});
