import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

export interface FormFieldsHandler {
  setField?: (field: string, value: string) => void;
  submit?: () => void;
  triggerAction?: (actionName: string, payload?: any) => void;
  getAvailableFields?: () => string[];
}

interface VoiceCommandContextType {
  isListening: boolean;
  transcript: string;
  feedbackMessage: string;
  isSpeaking: boolean;
  voiceActive: boolean;
  ttsEnabled: boolean;
  setTtsEnabled: (enabled: boolean) => void;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  toggleListening: () => Promise<void>;
  speak: (text: string) => void;
  executeCommand: (speechText: string) => Promise<boolean>;
  registerFormHandler: (pageKey: string, handler: FormFieldsHandler) => void;
  unregisterFormHandler: (pageKey: string) => void;
}

const VoiceCommandContext = createContext<VoiceCommandContextType | null>(null);

export const VoiceCommandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const recognitionRef = useRef<any>(null);
  const shouldKeepListeningRef = useRef<boolean>(false);
  const handlersRef = useRef<Map<string, FormFieldsHandler>>(new Map());
  const feedbackTimeoutRef = useRef<any>(null);
  const debounceTimerRef = useRef<any>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedbackMessage('');
    }, 4500);
  };

  const speak = (text: string) => {
    if (!ttsEnabled) return;
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('TTS error:', e);
      setIsSpeaking(false);
    }
  };

  const registerFormHandler = (pageKey: string, handler: FormFieldsHandler) => {
    handlersRef.current.set(pageKey, handler);
  };

  const unregisterFormHandler = (pageKey: string) => {
    handlersRef.current.delete(pageKey);
  };

  // Route & URL Navigation Mappings
  const routeMappings: { [key: string]: string[] } = {
    '/': ['home', 'landing', 'main page', 'start', 'index', 'welcome', 'go home', 'open home'],
    '/patient-auth': ['patient login', 'login patient', 'patient sign in', 'patient auth', 'patient portal login', 'patient portal', 'sign in as patient'],
    '/Sign-up': ['patient sign up', 'patient signup', 'patient register', 'patient registration', 'register patient', 'sign up patient', 'sign up', 'signup', 'register', 'registration'],
    '/doctor-login': ['doctor login', 'doctor sign in', 'doctor auth', 'login as doctor', 'login doctor', 'doctors login'],
    '/doctor-signup': ['doctor sign up', 'doctor signup', 'doctor register', 'doctor registration', 'register doctor'],
    '/admin-login': ['admin login', 'administrator login', 'admin sign in', 'login as admin', 'admin auth'],
    '/admin': ['admin panel', 'admin dashboard', 'administration', 'admin console', 'open admin'],
    '/patient/hub': ['patient hub', 'hub', 'my hub', 'patient dashboard', 'wellness hub', 'open hub', 'go to hub', 'open patient hub'],
    '/patient/hub/pchs': ['health status', 'patient health status', 'current health status', 'pchs', 'health metrics', 'my health status'],
    '/patient/hub/fitnessplan': ['fitness plan', 'patient fitness plan', 'workout plan', 'diet plan', 'nutrition plan', 'my diet', 'workout routine'],
    '/patient/hub/fitnesstrack': ['fitness track', 'patient fitness track', 'step tracker', 'step tracking', 'pedometer', 'fitness tracker', 'track steps', 'my steps'],
    '/appointments': ['appointments', 'book appointment', 'schedule appointment', 'appointment calendar', 'book doctor', 'make appointment'],
    '/appointments-list': ['appointments list', 'view appointments', 'my appointments', 'all appointments', 'appointment records', 'list appointments'],
    '/Doctors-list': ['doctors list', 'doctor list', 'find doctor', 'view doctors', 'available doctors', 'doctors', 'specialists'],
    '/patient-history': ['patient history', 'medical history', 'health records', 'history'],
    '/patient-records/patient-info': ['patient info', 'patient records', 'patient profile'],
    '/fetch-username': ['forgot username', 'fetch username', 'recover username', 'find username'],
    '/fetch-password': ['forgot password', 'fetch password', 'recover password', 'reset password'],
  };

  const normalizeText = (text: string) => {
    return text.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const executeCommand = async (rawSpeech: string): Promise<boolean> => {
    if (!rawSpeech || !rawSpeech.trim()) return false;
    const clean = normalizeText(rawSpeech);
    setTranscript(rawSpeech);

    // 1. Check for Go Back / Return
    if (clean === 'go back' || clean === 'back' || clean === 'return' || clean === 'previous page' || clean.includes('go back') || clean.includes('previous screen')) {
      showFeedback('Going back...');
      speak('Going back');
      router.back();
      return true;
    }

    // 2. Check for Logout / Sign Out
    if (clean.includes('log out') || clean.includes('logout') || clean.includes('sign out')) {
      await AsyncStorage.removeItem('logged_in_patient');
      await AsyncStorage.removeItem('logged_in_doctor');
      await AsyncStorage.removeItem('logged_in_admin');
      showFeedback('Logged out successfully');
      speak('Logged out successfully. Returning to home.');
      router.replace('/');
      return true;
    }

    // 3. Check for Direct URL or Route Open Commands
    const urlMatch = rawSpeech.match(/(?:open\s+(?:url|route|page)?|go\s+to\s+(?:url|route|page)?|navigate\s+to\s+(?:url|route|page)?)\s+([/\w-]+)/i);
    if (urlMatch && urlMatch[1]) {
      let target = urlMatch[1].trim();
      if (!target.startsWith('/')) target = '/' + target;
      const knownRoutes = Object.keys(routeMappings);
      const matched = knownRoutes.find(r => r.toLowerCase() === target.toLowerCase());
      if (matched) {
        showFeedback(`Navigating to ${matched}...`);
        speak(`Navigating to ${matched}`);
        router.push(matched as any);
        return true;
      }
    }

    // 4. Check Active Form Actions & Field Filling FIRST (if user is on form)
    const activeHandler = Array.from(handlersRef.current.values()).pop();

    // 4a. Submit / Login / Sign Up button triggers
    if (
      clean === 'login' || clean === 'sign in' || clean === 'submit' || clean === 'submit form' ||
      clean === 'click login' || clean === 'click submit' || clean === 'click sign up' ||
      clean === 'register' || clean === 'save' || clean === 'confirm' || clean.includes('click login') || clean.includes('press login')
    ) {
      if (activeHandler && activeHandler.submit) {
        showFeedback('Submitting form...');
        speak('Submitting form');
        activeHandler.submit();
        return true;
      }
    }

    // 4b. Start Heart Rate / Measure Action
    if (clean.includes('start measure') || clean.includes('measure heart rate') || clean.includes('heart rate measure') || clean.includes('start measuring') || clean.includes('measure pulse') || clean.includes('heart rate scan')) {
      if (activeHandler && activeHandler.triggerAction) {
        showFeedback('Starting heart rate measurement...');
        speak('Starting heart rate measurement');
        activeHandler.triggerAction('START_MEASURE');
        return true;
      } else {
        router.push('/patient/hub');
        showFeedback('Opening Patient Hub for measurement...');
        speak('Opening Patient Hub for heart rate measurement');
        return true;
      }
    }

    // 4c. Form Field Input Commands
    const fieldPatterns = [
      /(?:enter|set|fill|type|input|write|my)?\s*(username|user name|user)\s*(?:is|as|to|with|=|:)?\s+([a-zA-Z0-9_.-]+)/i,
      /(?:enter|set|fill|type|input|write|my)?\s*(password|pass code|pass)\s*(?:is|as|to|with|=|:)?\s+([^\s]+)/i,
      /(?:enter|set|fill|type|input|write|my)?\s*(email|email address)\s*(?:is|as|to|with|=|:)?\s+(.+)/i,
      /(?:enter|set|fill|type|input|write|my)?\s*(full name|first name|name)\s*(?:is|as|to|with|=|:)?\s+(.+)/i,
      /(?:enter|set|fill|type|input|write|my)?\s*(age)\s*(?:is|as|to|with|=|:)?\s+(\d+)/i,
      /(?:enter|set|fill|type|input|write|my)?\s*(gender)\s*(?:is|as|to|with|=|:)?\s+(male|female|other)/i,
      /(?:enter|set|fill|type|input|write|my)?\s*(phone|phone number|mobile)\s*(?:is|as|to|with|=|:)?\s+([0-9\s-]+)/i,
      /(?:enter|set|fill|type|input|write|my)?\s*(specialization|specialty|designation)\s*(?:is|as|to|with|=|:)?\s+(.+)/i,
      /(?:enter|set|fill|type|input|write|my)?\s*(blood group|blood type)\s*(?:is|as|to|with|=|:)?\s+([a-zA-Z+-]+)/i,
      /(?:enter|set|fill|type|input|write|my)?\s*(date|appointment date|day)\s*(?:is|as|to|with|=|:)?\s+(\d+)/i,
    ];

    for (const pattern of fieldPatterns) {
      const match = rawSpeech.match(pattern);
      if (match) {
        let fieldName = match[1].toLowerCase().replace(/\s+/g, '');
        if (fieldName === 'user' || fieldName === 'username') fieldName = 'username';
        if (fieldName === 'pass' || fieldName === 'password' || fieldName === 'passcode') fieldName = 'password';
        if (fieldName === 'emailaddress') fieldName = 'email';
        if (fieldName === 'fullname' || fieldName === 'firstname') fieldName = 'name';
        if (fieldName === 'phonenumber' || fieldName === 'mobile') fieldName = 'phone';
        if (fieldName === 'bloodtype') fieldName = 'bloodGroup';
        if (fieldName === 'appointmentdate' || fieldName === 'day') fieldName = 'date';

        let fieldValue = match[2].trim();
        if (fieldName === 'email') fieldValue = fieldValue.replace(/\s+at\s+/g, '@').replace(/\s+dot\s+/g, '.').replace(/\s+/g, '');
        if (fieldName === 'username') fieldValue = fieldValue.replace(/\s+/g, '').toLowerCase();

        if (activeHandler && activeHandler.setField) {
          activeHandler.setField(fieldName, fieldValue);
          showFeedback(`Entered ${fieldName}: "${fieldValue}"`);
          speak(`Entered ${fieldName}`);
          return true;
        } else {
          showFeedback(`Field "${fieldName}" updated with "${fieldValue}"`);
          return true;
        }
      }
    }

    // 5. Check Route Mappings by Keyword / Phrases
    for (const [route, aliases] of Object.entries(routeMappings)) {
      for (const alias of aliases) {
        if (
          clean === alias ||
          clean.includes(`open ${alias}`) ||
          clean.includes(`go to ${alias}`) ||
          clean.includes(`navigate to ${alias}`) ||
          clean.includes(`show ${alias}`) ||
          clean.includes(`take me to ${alias}`) ||
          clean.includes(alias)
        ) {
          showFeedback(`Opening ${alias}...`);
          speak(`Opening ${alias}`);
          router.push(route as any);
          return true;
        }
      }
    }

    // 6. Help Command
    if (clean === 'help' || clean.includes('what can i say') || clean.includes('voice help')) {
      const helpMsg = 'You can say "Open Patient Hub", "Go to Appointments", "Enter username [name]", "Enter password [pass]", "Submit", or "Start measure".';
      showFeedback(helpMsg);
      speak(helpMsg);
      return true;
    }

    showFeedback(`Heard: "${rawSpeech}"`);
    return false;
  };

  const startListening = async () => {
    shouldKeepListeningRef.current = true;
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) {}
          }
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onstart = () => {
            setIsListening(true);
            showFeedback('🎤 Listening... (Speak any command)');
          };

          recognition.onresult = (event: any) => {
            let latestText = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const res = event.results[i];
              if (res && res[0]) {
                latestText = res[0].transcript;
                if (res.isFinal) {
                  const cmd = latestText.trim();
                  if (cmd) executeCommand(cmd);
                } else {
                  setTranscript(latestText);
                  if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                  debounceTimerRef.current = setTimeout(() => {
                    if (latestText.trim()) executeCommand(latestText.trim());
                  }, 900);
                }
              }
            }
          };

          recognition.onerror = (event: any) => {
            console.warn('Speech recognition event error:', event.error);
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
              shouldKeepListeningRef.current = false;
              setIsListening(false);
              showFeedback('Microphone access not allowed. Please grant permission.');
            }
          };

          recognition.onend = () => {
            if (shouldKeepListeningRef.current) {
              try { recognition.start(); } catch (e) { setIsListening(false); }
            } else {
              setIsListening(false);
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
          setIsListening(true);
          return;
        }
      }

      // Mobile Audio Recording Fallback
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        showFeedback('Microphone permission required.');
        speak('Microphone permission is required for voice commands.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsListening(true);
      showFeedback('🎤 Listening on mobile...');
    } catch (e) {
      console.error('Failed to start voice listener:', e);
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    shouldKeepListeningRef.current = false;
    try {
      setIsListening(false);
      if (Platform.OS === 'web' && recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (recording) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(null);
        if (uri) {
          transcribeAndExecuteMobile(uri);
        }
      }
    } catch (e) {
      console.error('Failed to stop listening:', e);
    }
  };

  const transcribeAndExecuteMobile = async (uri: string) => {
    try {
      showFeedback('Processing voice command...');
      const apiKey = process.env.EXPO_PUBLIC_LLM_API_KEY || "";
      if (apiKey && apiKey.startsWith('gsk_')) {
        const formData = new FormData();
        formData.append('file', {
          uri,
          type: 'audio/m4a',
          name: 'audio.m4a',
        } as any);
        formData.append('model', 'whisper-large-v3-turbo');
        formData.append('language', 'en');

        const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}` },
          body: formData,
        });
        const data = await response.json();
        if (data && data.text) {
          executeCommand(data.text);
          return;
        }
      }
      showFeedback('Voice command captured.');
    } catch (e) {
      console.error('Mobile transcription error:', e);
    }
  };

  const toggleListening = async () => {
    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  };

  return (
    <VoiceCommandContext.Provider
      value={{
        isListening,
        transcript,
        feedbackMessage,
        isSpeaking,
        voiceActive: isListening || isSpeaking,
        ttsEnabled,
        setTtsEnabled,
        startListening,
        stopListening,
        toggleListening,
        speak,
        executeCommand,
        registerFormHandler,
        unregisterFormHandler,
      }}
    >
      {children}
    </VoiceCommandContext.Provider>
  );
};

export const useVoiceCommand = () => {
  const context = useContext(VoiceCommandContext);
  if (!context) {
    throw new Error('useVoiceCommand must be used within a VoiceCommandProvider');
  }
  return context;
};
