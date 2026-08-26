import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, Platform, KeyboardAvoidingView, SafeAreaView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useVoiceCommand } from '../context/VoiceCommandContext';

const getDynamicSystemPrompt = (currentPath: string, username: string | null) => {
  return `You are the official Meditrack AI Assistant. Provide 100% accurate guidance for the Meditrack portal.

CURRENT CONTEXT:
- Current Page: ${currentPath}
- Logged-in User: ${username || 'Guest (Not Logged In)'}
- System Time: ${new Date().toLocaleString()}

STRICT NAVIGATION MAPPINGS:
- Patient Dashboard: [[NAVIGATE: /patient-records/patient-info]]
- Registration Section: [[NAVIGATE: /Sign-up]]
- Patient Authentication: [[NAVIGATE: /patient-auth]]
- Doctor Login: [[NAVIGATE: /doctor-login]]
- Doctor Registration: [[NAVIGATE: /doctor-signup]]
- Admin Access: [[NAVIGATE: /admin-login]]
- Fitness Tracking: [[NAVIGATE: /patient/hub/fitnesstrack]]
- Wellness/Nutrition Plans: [[NAVIGATE: /patient/hub/pchs]]
- Main Landing Page: [[NAVIGATE: /]]
- Close/Go Back: [[CLOSE]]

GUIDELINES:
- Be concise. Identify that you know they are on ${currentPath}.`;
};

const HF_API_URL = "https://router.huggingface.co/hf-inference/models/google/gemma-2-9b-it/v1/chat/completions";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

type Message = { id: string; text: string; isUser: boolean; role: 'user' | 'assistant' };

export const AIAssistantChat = ({ onClose }: { onClose?: () => void }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'initial', text: 'Hi there! I am your Meditrack AI Assistant. You can speak voice commands or ask me anything!', isUser: false, role: 'assistant' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showNewOptions, setShowNewOptions] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { executeCommand, isListening, toggleListening, speak } = useVoiceCommand();

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        alert('Microphone permission is required.');
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
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    try {
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) return;
      setIsTranscribing(true);
      await transcribeAudio(uri);
    } catch (err) {
      console.error('Failed to stop recording', err);
      setIsTranscribing(false);
    }
  };

  const transcribeAudio = async (uri: string) => {
    try {
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
          handleSend(data.text);
          return;
        }
      }
      // If no groq key, process speech
      handleSend("Voice command captured");
    } catch (e) {
      console.error("Transcription error", e);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSend = async (textOverride?: string) => {
    const messageText = textOverride || input;
    if (!messageText.trim()) return;

    const userMsgText = messageText.trim();
    const newUserMessage: Message = { id: Date.now().toString(), text: userMsgText, isUser: true, role: 'user' };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    if (!textOverride) setInput('');
    setIsTyping(true);

    try {
      // 1. Try running as a Voice Command Action FIRST
      const executed = await executeCommand(userMsgText);
      if (executed) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            text: `✅ Executed voice command: "${userMsgText}"`,
            isUser: false,
            role: 'assistant'
          }
        ]);
        setIsTyping(false);
        return;
      }

      // 2. Query Central Assistant Engine
      const currentPath = pathname;
      const loggedInUser = await AsyncStorage.getItem('logged_in_patient');
      const dynamicPrompt = getDynamicSystemPrompt(currentPath, loggedInUser);
      const apiKey = process.env.EXPO_PUBLIC_LLM_API_KEY || "";
      const isGroq = apiKey.startsWith('gsk_');
      const isHF = apiKey.startsWith('hf_');

      let aiAnswer = '';

      if (apiKey && (isGroq || isHF)) {
        const targetUrl = isGroq ? GROQ_API_URL : HF_API_URL;
        const targetModel = isGroq ? 'llama-3.1-8b-instant' : 'google/gemma-2-9b-it';
        const apiMessages = [
          { role: 'system', content: dynamicPrompt },
          ...updatedMessages.filter(m => m.id !== 'initial').map(m => ({ role: m.role, content: m.text }))
        ];

        try {
          const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: targetModel,
              messages: apiMessages,
              temperature: 0.3,
              max_tokens: 500
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.choices && data.choices.length > 0) {
              aiAnswer = data.choices[0].message.content;
            }
          }
        } catch (apiErr) {
          console.warn('External LLM API fetch error, falling back to local engine:', apiErr);
        }
      }

      // Fallback Healthcare & Navigation Assistant
      if (!aiAnswer) {
        const query = userMsgText.toLowerCase();
        if (query.includes('appointment') || query.includes('book') || query.includes('doctor')) {
          aiAnswer = "You can manage and view appointments in Appointments [[NAVIGATE: /appointments]] or explore our specialist directory in Doctors List [[NAVIGATE: /Doctors-list]].";
        } else if (query.includes('heart rate') || query.includes('pulse') || query.includes('bpm') || query.includes('measure')) {
          aiAnswer = "You can measure and track your live heart rate using the instant optical PPG scanner in Patient Hub [[NAVIGATE: /patient/hub]].";
        } else if (query.includes('step') || query.includes('fitness') || query.includes('walk') || query.includes('calorie')) {
          aiAnswer = "You can monitor your live step counts and daily burned calories in Fitness Track [[NAVIGATE: /patient/hub/fitnesstrack]].";
        } else if (query.includes('diet') || query.includes('nutrition') || query.includes('plan') || query.includes('wellness')) {
          aiAnswer = "Your personalized diet charts and wellness guidance are available in Patient Health Status [[NAVIGATE: /patient/hub/pchs]] and Fitness Plan [[NAVIGATE: /patient/hub/fitnessplan]].";
        } else if (query.includes('register') || query.includes('sign up') || query.includes('new account')) {
          aiAnswer = "New patients can register an account in Patient Sign Up [[NAVIGATE: /Sign-up]], and doctors can register in Doctor Sign Up [[NAVIGATE: /doctor-signup]].";
        } else if (query.includes('doctor login') || query.includes('physician')) {
          aiAnswer = "Doctors can securely log in to manage clinical workflows here: [[NAVIGATE: /doctor-login]].";
        } else if (query.includes('admin') || query.includes('administrator')) {
          aiAnswer = "Authorized administrators can access the portal control center here: [[NAVIGATE: /admin-login]].";
        } else if (query.includes('patient login') || query.includes('login') || query.includes('sign in')) {
          aiAnswer = "Patients can sign in to view their medical records and health history here: [[NAVIGATE: /patient-auth]].";
        } else if (query.includes('hi') || query.includes('hello') || query.includes('hey') || query.includes('help')) {
          aiAnswer = `Hello! I am your Meditrack Assistant. You are currently on ${currentPath}. You can say "Open Patient Hub", "Go to Appointments", "Enter username [x]", or ask me health questions.`;
        } else {
          aiAnswer = `You can ask me to open your Patient Hub, book appointments, track fitness, measure heart rate, or sign in to your account.`;
        }
      }

      // Process navigation markers in answer
      const navMatch = aiAnswer.match(/\[\[NAVIGATE:\s*([^\]]+)\]\]/);
      if (navMatch) {
        const targetPath = navMatch[1].trim();
        aiAnswer = aiAnswer.replace(/\[\[NAVIGATE:\s*[^\]]+\]\]/g, '').trim();
        setTimeout(() => {
          router.push(targetPath as any);
        }, 1200);
      }

      if (aiAnswer.includes('[[CLOSE]]')) {
        aiAnswer = aiAnswer.replace('[[CLOSE]]', '').trim();
        setTimeout(() => {
          onClose?.();
          router.back();
        }, 1000);
      }

      speak(aiAnswer);
      setMessages(prev => [...prev, { id: Date.now().toString(), text: aiAnswer, isUser: false, role: 'assistant' }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: Date.now().toString(), text: "I am ready to help. You can speak commands like 'Open Patient Hub' or 'Go to Appointments'.", isUser: false, role: 'assistant' }]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isTyping]);

  return (
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.chatHeader}>
        <View style={styles.headerInfo}>
          <View>
            <Text style={styles.headerTitle}>Meditrack AI Assistant</Text>
            <Text style={styles.headerStatus}>{isTyping ? 'Thinking...' : isTranscribing ? 'Transcribing Audio...' : isListening ? '🎙️ Listening to Voice Command...' : 'Online'}</Text>
          </View>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesArea}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {messages.map(msg => (
          <View key={msg.id} style={[styles.messageBubble, msg.isUser ? styles.userBubble : styles.aiBubble]}>
            <Text style={[styles.messageText, msg.isUser ? styles.userText : styles.aiText]}>{msg.text}</Text>
          </View>
        ))}
        {isTyping && (
          <View style={[styles.messageBubble, styles.aiBubble, { width: 60, paddingVertical: 12 }]}>
            <Text style={styles.aiText}>...</Text>
          </View>
        )}
      </ScrollView>

      {messages.length <= 2 && (
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={styles.quickActionBtn} onPress={() => setShowNewOptions(!showNewOptions)} activeOpacity={0.7}>
            <Text style={styles.quickActionBtnText}>Quick Navigation Commands</Text>
            <Text style={styles.quickActionArrow}>{showNewOptions ? '↑' : '↓'}</Text>
          </TouchableOpacity>
          
          {showNewOptions && (
            <View style={styles.quickActionsDropdown}>
              <Text style={styles.qaTitle}>Try speaking or tapping these:</Text>
              
              <TouchableOpacity style={styles.qaLinkRow} onPress={() => { handleSend("open patient hub"); }}>
                <Text style={styles.qaLinkText}>🏥 Open Patient Hub</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.qaLinkRow} onPress={() => { handleSend("open appointments"); }}>
                <Text style={styles.qaLinkText}>📅 Book Appointment</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.qaLinkRow} onPress={() => { handleSend("open doctors list"); }}>
                <Text style={styles.qaLinkText}>👨‍⚕️ View Doctors List</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity 
          style={[styles.micBtnWrapper, (isRecording || isListening) && { borderColor: '#E53E3E' }]} 
          onPress={Platform.OS === 'web' ? toggleListening : (isRecording ? stopRecording : startRecording)}
          activeOpacity={0.7}
        >
          <BlurView 
            intensity={Platform.OS === 'android' ? 100 : 80} 
            tint={isRecording || isListening ? "dark" : "light"} 
            style={[styles.micBtnGlass, (isRecording || isListening) && { backgroundColor: 'rgba(229, 62, 62, 0.3)' }]}
          >
            {isTranscribing ? (
               <MaterialIcons name="hourglass-empty" size={28} color="#FFF" />
            ) : (isRecording || isListening) ? (
               <MaterialIcons name="mic" size={28} color="#FC8181" />
            ) : (
               <MaterialIcons name="mic-none" size={28} color="#3182CE" />
            )}
          </BlurView>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Type or speak a command..."
          placeholderTextColor="#A0AEC0"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => handleSend()}
        />
        <TouchableOpacity style={[styles.sendBtn, input.trim() ? styles.sendBtnActive : {}]} onPress={() => handleSend()}>
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export const MobileAIAssistantModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <AIAssistantChat onClose={onClose} />
      </SafeAreaView>
    </Modal>
  );
};

export const GlobalFloatingAI = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isListening, feedbackMessage, transcript, toggleListening, isSpeaking } = useVoiceCommand();

  const renderFloatingControls = () => (
    <View style={styles.floatingControlsRow}>
      {/* Voice Command Button */}
      <TouchableOpacity
        style={[styles.voiceFabWrapper, isListening && styles.voiceFabActive]}
        activeOpacity={0.8}
        onPress={toggleListening}
      >
        <BlurView
          intensity={Platform.OS === 'android' ? 100 : 80}
          tint={isListening ? 'dark' : 'light'}
          style={[styles.voiceFabGlass, isListening && styles.voiceFabGlassActive]}
        >
          <MaterialIcons
            name={isListening ? 'mic' : 'mic-none'}
            size={22}
            color={isListening ? '#FFFFFF' : '#3182CE'}
          />
          <Text style={[styles.voiceFabLabel, isListening && styles.voiceFabLabelActive]}>
            {isListening ? 'Listening...' : 'Voice AI'}
          </Text>
        </BlurView>
      </TouchableOpacity>

      {/* Ask AI Chat Button */}
      <TouchableOpacity
        style={styles.fabWrapper}
        activeOpacity={0.8}
        onPress={() => setIsOpen(true)}
      >
        <BlurView
          intensity={Platform.OS === 'android' ? 100 : 80}
          tint="light"
          style={styles.fabGlass}
        >
          <Text style={styles.fabLabel}>Ask Me</Text>
        </BlurView>
      </TouchableOpacity>
    </View>
  );

  const renderVoiceHUD = () => {
    if (!isListening && !feedbackMessage && !transcript) return null;
    return (
      <View style={styles.voiceHudContainer}>
        <View style={[styles.voiceHudCard, isListening && styles.voiceHudListening]}>
          <View style={styles.voiceHudHeader}>
            <View style={[styles.voiceStatusDot, isListening && styles.voiceStatusDotActive]} />
            <Text style={styles.voiceHudTitle}>
              {isListening ? '🎙️ Voice Command Listening...' : isSpeaking ? '🔊 Speaking...' : '⚡ Voice Assistant'}
            </Text>
          </View>
          {transcript ? (
            <Text style={styles.voiceHudTranscript} numberOfLines={2}>
              "{transcript}"
            </Text>
          ) : null}
          {feedbackMessage ? (
            <Text style={styles.voiceHudFeedback} numberOfLines={2}>
              {feedbackMessage}
            </Text>
          ) : isListening ? (
            <Text style={styles.voiceHudHelp}>
              Say "Open Patient Hub", "Enter username [name]", "Submit", or "Start measure"...
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  if (Platform.OS === 'web') {
    return (
      <>
        {renderVoiceHUD()}
        <View style={styles.webFloatingContainer}>
          {isOpen ? (
            <View style={styles.webChatWindow}>
              <AIAssistantChat onClose={() => setIsOpen(false)} />
            </View>
          ) : (
            renderFloatingControls()
          )}
        </View>
      </>
    );
  }

  // Mobile App Global Floating Button with Full-Screen Modal
  return (
    <>
      {renderVoiceHUD()}
      <View style={styles.mobileFloatingContainer}>
        {renderFloatingControls()}
      </View>
      <MobileAIAssistantModal visible={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  chatContainer: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A365D',
  },
  headerStatus: {
    fontSize: 12,
    color: '#48BB78',
    fontWeight: '600',
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#EDF2F7',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4A5568',
    lineHeight: 22,
  },
  messagesArea: {
    flex: 1,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
  },
  userBubble: {
    backgroundColor: '#3182CE',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#EBF8FF',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#BEE3F8',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#2D3748',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2D3748',
    marginRight: 10,
  },
  micBtnWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  micBtnGlass: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(237, 242, 247, 0.4)',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnActive: {
    backgroundColor: '#3182CE',
  },
  sendBtnText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  webFloatingContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 9999,
  },
  mobileFloatingContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 9999,
  },
  floatingControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voiceFabWrapper: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#3182CE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(49, 130, 206, 0.4)',
  },
  voiceFabActive: {
    borderColor: '#E53E3E',
    shadowColor: '#E53E3E',
    shadowOpacity: 0.4,
  },
  voiceFabGlass: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(235, 248, 255, 0.9)',
    gap: 6,
  },
  voiceFabGlassActive: {
    backgroundColor: '#E53E3E',
  },
  voiceFabLabel: {
    color: '#2B6CB0',
    fontWeight: '700',
    fontSize: 14,
  },
  voiceFabLabelActive: {
    color: '#FFFFFF',
  },
  fabWrapper: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  fabGlass: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  fabLabel: {
    color: '#1A365D',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  voiceHudContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 10000,
    pointerEvents: 'none',
  },
  voiceHudCard: {
    backgroundColor: 'rgba(26, 54, 93, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    maxWidth: 500,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  voiceHudListening: {
    borderColor: '#63B3ED',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
  },
  voiceHudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  voiceStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A0AEC0',
    marginRight: 8,
  },
  voiceStatusDotActive: {
    backgroundColor: '#48BB78',
  },
  voiceHudTitle: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 13,
  },
  voiceHudTranscript: {
    color: '#90CDF4',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  voiceHudFeedback: {
    color: '#68D391',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  voiceHudHelp: {
    color: '#CBD5E0',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  webChatWindow: {
    width: 350,
    height: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#F7F9FC',
    alignItems: 'center',
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF2F7',
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickActionBtnText: {
    fontSize: 14,
    color: '#2D3748',
    fontWeight: '600',
    marginRight: 6,
  },
  quickActionArrow: {
    fontSize: 12,
    color: '#4A5568',
    fontWeight: '800',
  },
  quickActionsDropdown: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  qaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A365D',
    marginBottom: 10,
  },
  qaLinkRow: {
    paddingVertical: 6,
  },
  qaLinkText: {
    fontSize: 14,
    color: '#4A5568',
  },
});
