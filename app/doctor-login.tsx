import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getDoctorByUsername, Doctor } from '../db/db';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DoctorLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const checkSession = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('logged_in_doctor');
        if (storedUser) {
          const doctor = await getDoctorByUsername(storedUser);
          if (doctor) {
            router.replace({
              pathname: '/dashboard',
              params: { doctorName: `Dr. ${doctor.firstName} ${doctor.lastName}` }
            });
            return;
          }
        }
      } catch (e) {
        console.error("Session check failed", e);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    try {
      const doctorByUsername = await getDoctorByUsername(username) as Doctor | null;
      
      if (doctorByUsername) {
        // Username found, check password
        if (doctorByUsername.password === password) {
          setError('');
          // Save session
          await AsyncStorage.setItem('logged_in_doctor', username);
          
          router.replace({
            pathname: '/dashboard',
            params: { doctorName: `Dr. ${doctorByUsername.firstName} ${doctorByUsername.lastName}` }
          });
          return;
        } else {
          setError('Incorrect password.');
          return;
        }
      } else {
        setError('Username not found. Please Sign Up.');
        return;
      }
    } catch (error) {
      console.error('Failed to access database', error);
      setError('Database error. Please try again.');
      return;
    }
  };

  if (loading) return null; // Or a splash screen

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back, Doctor</Text>
          <Text style={styles.subtitle}>Sign in to access patient records</Text>
        </View>

        <View style={styles.form}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholderTextColor="#A0AEC0"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholderTextColor="#A0AEC0"
            />
          </View>

          <View style={styles.forgotLinks}>
            <TouchableOpacity onPress={() => router.push('/fetch-username')}>
              <Text style={styles.linkText}>Forgot Username?</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/fetch-password')}>
              <Text style={styles.linkText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/doctor-signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    padding: 24,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
  },
  backText: {
    fontSize: 16,
    color: '#3182CE',
    fontWeight: '600',
  },
  header: {
    marginBottom: 40,
    marginTop: 40,
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
  forgotLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  linkText: {
    color: '#3182CE',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#3182CE',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#3182CE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signupText: {
    color: '#718096',
    fontSize: 14,
  },
  signupLink: {
    color: '#3182CE',
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    color: '#E53E3E',
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 8,
    overflow: 'hidden',
  }
});
