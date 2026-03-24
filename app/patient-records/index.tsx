import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Platform, Modal, Pressable, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getPatientByUsername, updatePatientAppointment, getAllPatients, Patient, updatePatient } from '../../db/db';

export default function PatientRecordsIndex() {
  const router = useRouter();
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialSync, setInitialSync] = useState(true);
  const [editingRowId, setEditingRowId] = useState<string | number | null>(null);
  const [rowForm, setRowForm] = useState<Partial<Patient>>({});

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // 1. Try Cache
      const cached = await AsyncStorage.getItem('patients_list_cache');
      if (cached) {
        setAllPatients(JSON.parse(cached));
        setInitialSync(false);
      }

      const all = await getAllPatients();
      all.sort((a, b) => (a.id || 0) - (b.id || 0));
      setAllPatients(all);
      
      // 2. Save to Cache
      await AsyncStorage.setItem('patients_list_cache', JSON.stringify(all));
    } catch (e) {
      console.error('Failed to fetch data', e);
    } finally {
      setLoading(false);
      setInitialSync(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData(allPatients.length > 0);
    }, [fetchData])
  );

  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 30000); // 30s background sync
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleStartEdit = (p: Patient) => {
    setEditingRowId(p.username);
    setRowForm({ ...p });
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setRowForm({});
  };

  const handleSaveRow = async () => {
    if (!rowForm.username) return;
    try {
      setLoading(true);
      // Optimistic Update
      const updatedList = allPatients.map(p => p.username === rowForm.username ? { ...p, ...rowForm } : p);
      setAllPatients(updatedList);
      await AsyncStorage.setItem('patients_list_cache', JSON.stringify(updatedList));

      await updatePatient(rowForm as Patient);
      setEditingRowId(null);
      
      // Background re-fetch to ensure sync
      fetchData(true);
      Alert.alert("Success", "Patient record updated successfully.");
    } catch (e) {
      console.error("Failed to update patient", e);
      Alert.alert("Error", "Failed to update record. Please check your connection.");
      // Revert on error
      fetchData();
    } finally {
      setLoading(false);
    }
  };

  if (initialSync && allPatients.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 16, color: '#4A5568', fontWeight: '600' }}>Synchronizing Cloud Records...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.welcomeText}>System Records</Text>
          <Text style={styles.patientName}>Patient Database</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={() => fetchData()}
            activeOpacity={0.7}
          >
            <Text style={styles.refreshText}>{loading ? '...' : '🔄 Refresh'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={() => router.replace('/admin')}
          >
            <Text style={styles.logoutText}>Exit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.bannerCard}>
          <Text style={styles.bannerTitle}>Clinical Database Sync</Text>
          <Text style={styles.bannerSubtitle}>Viewing {allPatients.length} live patient records from Cloud.</Text>
        </View>

        <Text style={styles.sectionTitle}>Detailed Records Table</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={styles.tableContainer}>
            {/* Header */}
            <View style={styles.tableRowHeader}>
              <Text style={[styles.col, styles.colId, { color: '#FFFFFF' }]}>ID</Text>
              <Text style={[styles.col, styles.colName, { color: '#FFFFFF' }]}>Name</Text>
              <Text style={[styles.col, styles.colUser, { color: '#FFFFFF' }]}>Username</Text>
              <Text style={[styles.col, styles.colEmail, { color: '#FFFFFF' }]}>Email</Text>
              <Text style={[styles.col, styles.colDob, { color: '#FFFFFF' }]}>DOB</Text>
              <Text style={[styles.col, styles.colPass, { color: '#FFFFFF' }]}>Password</Text>
              <Text style={[styles.col, styles.colAppt, { color: '#FFFFFF' }]}>Next Appt</Text>
              <Text style={[styles.col, styles.colAge, { color: '#FFFFFF' }]}>Age</Text>
              <Text style={[styles.col, styles.colCond, { color: '#FFFFFF' }]}>Condition</Text>
               <Text style={[styles.col, styles.colStat, { color: '#FFFFFF' }]}>Status</Text>
               <Text style={[styles.col, styles.colNotes, { color: '#FFFFFF' }]}>Notes</Text>
               <Text style={[styles.col, styles.colActionHeader, { color: '#FFFFFF' }]}>Actions</Text>
            </View>

            {/* Body */}
            {allPatients.map((p: Patient, idx: number) => {
              const isEditing = editingRowId === p.username;
              return (
                <View key={p.id || p.username || idx} style={styles.tableRow}>
                  <Text style={[styles.col, styles.colId]}>{p.id || '-'}</Text>
                  
                  <View style={styles.colName}>
                    {isEditing ? (
                      <TextInput 
                        style={styles.inlineInput} 
                        value={rowForm.name} 
                        onChangeText={(t) => setRowForm({...rowForm, name: t})} 
                      />
                    ) : (
                      <TouchableOpacity onPress={async () => {
                        await AsyncStorage.setItem('viewing_patient_username', p.username);
                        router.push('/patient-records/patient-info');
                      }}>
                        <Text style={{ fontWeight: '700', color: '#2D3748' }}>{p.name}</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.colUser}>
                    <Text style={{ fontSize: 13 }}>{p.username}</Text>
                  </View>

                  <View style={styles.colEmail}>
                    {isEditing ? (
                      <TextInput 
                        style={styles.inlineInput} 
                        value={rowForm.email} 
                        onChangeText={(t) => setRowForm({...rowForm, email: t})} 
                      />
                    ) : (
                      <Text style={{ fontSize: 13 }}>{p.email}</Text>
                    )}
                  </View>

                  <View style={styles.colDob}>
                    {isEditing ? (
                      <TextInput 
                        style={styles.inlineInput} 
                        value={rowForm.dob} 
                        onChangeText={(t) => setRowForm({...rowForm, dob: t})} 
                      />
                    ) : (
                      <Text style={{ fontSize: 13 }}>{p.dob}</Text>
                    )}
                  </View>

                  <View style={styles.colPass}>
                    {isEditing ? (
                      <TextInput 
                        style={styles.inlineInput} 
                        value={rowForm.password} 
                        onChangeText={(t) => setRowForm({...rowForm, password: t})} 
                      />
                    ) : (
                      <Text style={{ color: '#CBD5E0' }}>••••••</Text>
                    )}
                  </View>

                  <View style={styles.colAppt}>
                    {isEditing ? (
                      <TextInput 
                        style={styles.inlineInput} 
                        value={rowForm.nextAppointment} 
                        onChangeText={(t) => setRowForm({...rowForm, nextAppointment: t})} 
                      />
                    ) : (
                      <Text style={{ fontSize: 13 }}>{p.nextAppointment || 'None'}</Text>
                    )}
                  </View>

                  <View style={styles.colAge}>
                    {isEditing ? (
                      <TextInput 
                        style={styles.inlineInput} 
                        value={String(rowForm.age || '')} 
                        keyboardType="numeric"
                        onChangeText={(t) => setRowForm({...rowForm, age: parseInt(t) || 0})} 
                      />
                    ) : (
                      <Text style={{ fontSize: 13 }}>{p.age || '-'}</Text>
                    )}
                  </View>

                  <View style={styles.colCond}>
                    {isEditing ? (
                      <TextInput 
                        style={styles.inlineInput} 
                        value={rowForm.condition} 
                        onChangeText={(t) => setRowForm({...rowForm, condition: t})} 
                      />
                    ) : (
                      <Text style={{ fontSize: 13 }}>{p.condition || '-'}</Text>
                    )}
                  </View>

                  <View style={styles.colStat}>
                    {isEditing ? (
                      <TextInput 
                        style={styles.inlineInput} 
                        value={rowForm.status} 
                        onChangeText={(t) => setRowForm({...rowForm, status: t})} 
                      />
                    ) : (
                      <Text style={{ fontWeight: '800', fontSize: 13, color: p.status === 'Critical' ? '#E53E3E' : p.status === 'Review' ? '#D69E2E' : '#38A169' }}>
                        {p.status || 'Stable'}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.colNotes}>
                    {isEditing ? (
                      <TextInput 
                        style={styles.inlineInput} 
                        value={rowForm.notes || ''} 
                        onChangeText={(t) => setRowForm({...rowForm, notes: t})} 
                        maxLength={1000}
                        placeholder="N/A"
                      />
                    ) : (
                      <Text style={{ fontSize: 13 }} numberOfLines={1}>{p.notes || '-'}</Text>
                    )}
                  </View>

                  <View style={[styles.col, styles.colActionCell]}>
                    {isEditing ? (
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity onPress={handleSaveRow} style={styles.saveBtn}>
                          <Text style={styles.saveBtnText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelBtn}>
                          <Text style={styles.cancelBtnText}>Esc</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => handleStartEdit(p)} style={styles.editBtn}>
                        <Text style={styles.editBtnText}>Edit</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
        <View style={{height: 40}} />
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
    fontSize: 24,
    fontWeight: '800',
    color: '#1A365D',
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#EDF2F7',
    borderRadius: 8,
  },
  logoutText: {
    color: '#E53E3E',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  bannerCard: {
    backgroundColor: '#3182CE',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#3182CE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#EBF8FF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EBF8FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BEE3F8',
  },
  refreshText: {
    color: '#3182CE',
    fontSize: 13,
    fontWeight: '700',
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: '#3182CE',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 12,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
    paddingVertical: 12,
  },
  col: {
    fontSize: 13,
    color: '#4A5568',
    paddingHorizontal: 12,
  },
  colId: { width: 40 },
  colName: { width: 140, fontWeight: '700', color: '#2D3748' },
  colUser: { width: 100 },
  colEmail: { width: 180 },
  colDob: { width: 100 },
  colPass: { width: 100 },
  colAppt: { width: 140 },
  colAge: { width: 60 },
  colCond: { width: 140 },
  colStat: { width: 90 },
  colNotes: { width: 180 },
  colActionHeader: { width: 120, textAlign: 'center' },
  colActionCell: { width: 120, justifyContent: 'center', alignItems: 'center' },
  inlineInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#3182CE',
    fontSize: 12,
    color: '#2D3748',
    padding: 2,
    width: '90%',
  },
  editBtn: {
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BEE3F8',
  },
  editBtnText: {
    color: '#3182CE',
    fontWeight: '700',
    fontSize: 12,
  },
  saveBtn: {
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },
  saveBtnText: {
    color: '#38A169',
    fontWeight: '800',
    fontSize: 11,
  },
  cancelBtn: {
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  cancelBtnText: {
    color: '#E53E3E',
    fontWeight: '700',
    fontSize: 11,
  },
});
