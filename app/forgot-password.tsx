import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getDoctorByEmail, getPatientByEmail, updateDoctorPassword, updatePatientPassword } from '../db/db';

export default function ForgotPassword() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [userType, setUserType] = useState<'doctor' | 'patient'>((params.type as 'doctor' | 'patient') || 'doctor');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1); // 1: Email Input, 2: Reset Password
  const [foundUser, setFoundUser] = useState<any>(null);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRecover = async () => {
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    try {
      let user = null;
      if (userType === 'doctor') {
        user = await getDoctorByEmail(email);
      } else {
        user = await getPatientByEmail(email);
      }

      if (user) {
        setFoundUser(user);
        setStep(2);
        setError('');
      } else {
        setError('No account found with this email.');
      }
    } catch (e) {
      console.error('Recovery failed', e);
      setError('An error occurred. Please try again.');
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      if (userType === 'doctor') {
        await updateDoctorPassword(foundUser.username, newPassword);
      } else {
        await updatePatientPassword(foundUser.username, newPassword);
      }
      setSuccess(true);
      setError('');
    } catch (e) {
      console.error('Reset failed', e);
      setError('Failed to update password.');
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successTitle}>Password Reset Successful!</Text>
          <Text style={styles.successSubtitle}>Your password has been updated. You can now log in with your new credentials.</Text>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={() => router.replace(userType === 'doctor' ? '/doctor-login' : '/patient-auth')}
          >
            <Text style={styles.primaryButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Account Recovery</Text>
            <Text style={styles.subtitle}>
              {step === 1 ? 'Enter your registered email to find your account' : 'Retrieve your username or reset your password'}
            </Text>
          </View>

          {step === 1 ? (
            <View style={styles.form}>
              <View style={styles.toggleContainer}>
                <TouchableOpacity 
                  style={[styles.toggleBtn, userType === 'doctor' && styles.toggleBtnActiveDoctor]}
                  onPress={() => setUserType('doctor')}
                >
                  <Text style={[styles.toggleText, userType === 'doctor' && styles.toggleTextActive]}>Doctor</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleBtn, userType === 'patient' && styles.toggleBtnActivePatient]}
                  onPress={() => setUserType('patient')}
                >
                  <Text style={[styles.toggleText, userType === 'patient' && styles.toggleTextActive]}>Patient</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="email@example.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor="#A0AEC0"
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity style={[styles.primaryButton, userType === 'patient' && { backgroundColor: '#38A169' }]} onPress={handleRecover}>
                <Text style={styles.primaryButtonText}>Recover Account</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.usernamePanel}>
                <Text style={styles.infoLabel}>Found Username:</Text>
                <Text style={styles.foundUsername}>{foundUser.username}</Text>
                <Text style={styles.infoNote}>You can use this username to log in.</Text>
              </View>

              <View style={styles.divider} />
              
              <Text style={styles.sectionTitle}>Reset Password</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  placeholderTextColor="#A0AEC0"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  placeholderTextColor="#A0AEC0"
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity style={[styles.primaryButton, userType === 'patient' && { backgroundColor: '#38A169' }]} onPress={handleResetPassword}>
                <Text style={styles.primaryButtonText}>Update Password</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    color: '#3182CE',
    fontWeight: '600',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A365D',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleBtnActiveDoctor: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#3182CE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleBtnActivePatient: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#38A169',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  toggleTextActive: {
    color: '#2D3748',
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2D3748',
  },
  primaryButton: {
    backgroundColor: '#3182CE',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#E53E3E',
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 8,
  },
  usernamePanel: {
    backgroundColor: '#EBF8FF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BEE3F8',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#2A4365',
    marginBottom: 4,
  },
  foundUsername: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2B6CB0',
    marginBottom: 8,
  },
  infoNote: {
    fontSize: 12,
    color: '#4A5568',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F0FFF4',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#22543D',
    textAlign: 'center',
    marginBottom: 16,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#2F855A',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  }
});
