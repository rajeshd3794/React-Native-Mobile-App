import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { initDatabase } from '../db/db';

export default function RootLayout() {
  useEffect(() => {
    initDatabase().catch((err: unknown) => console.error('Failed to initialize database:', err));
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Welcome' }} />
      <Stack.Screen name="doctor-login" options={{ title: 'Doctor Login' }} />
      <Stack.Screen name="doctor-signup" options={{ title: 'Doctor Sign Up' }} />
      <Stack.Screen name="patient-auth" options={{ title: 'Patient Portal' }} />
      <Stack.Screen name="Sign-up" options={{ title: 'Patient Sign Up' }} />
      <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Account Recovery' }} />
      <Stack.Screen name="fetch-username" options={{ title: 'Fetch Username' }} />
      <Stack.Screen name="fetch-password" options={{ title: 'Fetch Password' }} />
      <Stack.Screen name="admin-login" options={{ title: 'Admin Login' }} />
      <Stack.Screen name="admin" options={{ title: 'Admin Panel' }} />
      <Stack.Screen name="Doctors-list" options={{ title: 'Doctors List' }} />
    </Stack>
  );
}
