/**
 * Featureflow React Native SDK - Expo Example
 *
 * This example demonstrates all the key features of the SDK:
 * - FeatureflowProvider for initialization
 * - useBooleanFlag for on/off flags
 * - useStringFlag for multi-variant flags
 * - useFeatures for all features
 * - useFeatureflowStatus for loading states
 * - goal() for A/B testing
 * - updateUser() for changing context
 */

import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Import from the SDK
import {
  FeatureflowProvider,
  useFeatureflow,
  useFeatures,
  useBooleanFlag,
  useStringFlag,
  useFeatureflowStatus,
} from '@featureflow/react-native-sdk';
import type { FeatureflowUser } from '@featureflow/react-native-sdk';

// ============================================
// CONFIGURATION
// ============================================

const FEATUREFLOW_API_KEY = 'js-env-demo';
const INITIAL_USER: FeatureflowUser = {
  id: 'demo-user-123',
  attributes: { tier: 'gold', country: 'australia' },
};

// ============================================
// DEMO COMPONENTS
// ============================================

function StatusBanner() {
  const { isLoading, isReady, error } = useFeatureflowStatus();

  if (isLoading) {
    return (
      <View style={[styles.banner, styles.bannerLoading]}>
        <ActivityIndicator color="#fff" size="small" />
        <Text style={styles.bannerText}>Loading features...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.banner, styles.bannerError]}>
        <Text style={styles.bannerText}>⚠️ Error: {error.message}</Text>
      </View>
    );
  }

  if (isReady) {
    return (
      <View style={[styles.banner, styles.bannerSuccess]}>
        <Text style={styles.bannerText}>✓ Features loaded</Text>
      </View>
    );
  }

  return null;
}

function BooleanFlagDemo() {
  const { isOn, isLoading } = useBooleanFlag('hello-world');

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Boolean Flag Demo</Text>
      <Text style={styles.cardSubtitle}>useBooleanFlag('hello-world')</Text>
      <View style={styles.flagResult}>
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <>
            <View
              style={[
                styles.indicator,
                isOn ? styles.indicatorOn : styles.indicatorOff,
              ]}
            />
            <Text style={styles.flagValue}>{isOn ? 'ON' : 'OFF'}</Text>
          </>
        )}
      </View>
      {isOn ? (
        <View style={styles.featureBox}>
          <Text style={styles.featureText}>🎉 Hello World Feature is ON!</Text>
        </View>
      ) : (
        <View style={[styles.featureBox, styles.featureBoxOff]}>
          <Text style={styles.featureText}>Feature is currently OFF</Text>
        </View>
      )}
    </View>
  );
}

function StringFlagDemo() {
  const { value, isLoading } = useStringFlag('color-theme', 'blue');

  const getThemeColor = useCallback(() => {
    switch (value) {
      case 'red': return '#E53935';
      case 'green': return '#43A047';
      case 'purple': return '#8E24AA';
      case 'orange': return '#FB8C00';
      default: return '#1E88E5';
    }
  }, [value]);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>String Flag Demo</Text>
      <Text style={styles.cardSubtitle}>useStringFlag('color-theme')</Text>
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <>
          <Text style={styles.flagValue}>Value: "{value}"</Text>
          <View style={[styles.colorBox, { backgroundColor: getThemeColor() }]}>
            <Text style={styles.colorBoxText}>{value.toUpperCase()}</Text>
          </View>
        </>
      )}
    </View>
  );
}

function AllFeaturesDisplay() {
  const features = useFeatures();
  const entries = Object.entries(features);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>All Features</Text>
      <Text style={styles.cardSubtitle}>useFeatures()</Text>
      {entries.length === 0 ? (
        <Text style={styles.emptyText}>No features loaded</Text>
      ) : (
        <View style={styles.featuresTable}>
          {entries.map(([key, value]) => (
            <View key={key} style={styles.featureRow}>
              <Text style={styles.featureKey}>{key}</Text>
              <Text style={styles.featureValue}>{value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function GoalTrackingDemo() {
  const featureflow = useFeatureflow();
  const [goalsSent, setGoalsSent] = useState<string[]>([]);

  const trackGoal = useCallback((goalKey: string) => {
    featureflow.goal(goalKey);
    setGoalsSent((prev) => [
      ...prev,
      `${goalKey} @ ${new Date().toLocaleTimeString()}`,
    ]);
  }, [featureflow]);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Goal Tracking</Text>
      <Text style={styles.cardSubtitle}>featureflow.goal()</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.goalButton}
          onPress={() => trackGoal('button-clicked')}>
          <Text style={styles.goalButtonText}>Track Click</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.goalButton}
          onPress={() => trackGoal('purchase-completed')}>
          <Text style={styles.goalButtonText}>Track Purchase</Text>
        </TouchableOpacity>
      </View>
      {goalsSent.length > 0 && (
        <View style={styles.goalsList}>
          <Text style={styles.goalsTitle}>Tracked Goals:</Text>
          {goalsSent.slice(-5).map((goal, i) => (
            <Text key={i} style={styles.goalItem}>• {goal}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

function UserEditor() {
  const featureflow = useFeatureflow();
  const [userId, setUserId] = useState(INITIAL_USER.id);
  const [tier, setTier] = useState(INITIAL_USER.attributes?.tier as string);
  const [updating, setUpdating] = useState(false);

  const updateUser = useCallback(async () => {
    setUpdating(true);
    try {
      await featureflow.updateUser({
        id: userId,
        attributes: { tier, country: 'australia' },
      });
    } catch (err) {
      console.warn('Failed to update user:', err);
    }
    setUpdating(false);
  }, [featureflow, userId, tier]);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>User Context</Text>
      <Text style={styles.cardSubtitle}>featureflow.updateUser()</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>User ID:</Text>
        <TextInput
          style={styles.input}
          value={userId}
          onChangeText={setUserId}
          placeholder="Enter user ID"
          placeholderTextColor="#64748b"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Tier:</Text>
        <View style={styles.tierButtons}>
          {['free', 'silver', 'gold', 'platinum'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tierButton, tier === t && styles.tierButtonActive]}
              onPress={() => setTier(t)}>
              <Text
                style={[
                  styles.tierButtonText,
                  tier === t && styles.tierButtonTextActive,
                ]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.updateButton, updating && styles.updateButtonDisabled]}
        onPress={updateUser}
        disabled={updating}>
        {updating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.updateButtonText}>Update User</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function MainContent() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>🚀 Featureflow</Text>
          <Text style={styles.subtitle}>React Native SDK Demo</Text>
        </View>

        <StatusBanner />
        <BooleanFlagDemo />
        <StringFlagDemo />
        <GoalTrackingDemo />
        <AllFeaturesDisplay />
        <UserEditor />

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Edit features at app.featureflow.io
          </Text>
        </View>
      </ScrollView>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <FeatureflowProvider
      apiKey={FEATUREFLOW_API_KEY}
      user={INITIAL_USER}
      config={{
        offline: true,
        defaultFeatures: {
          'hello-world': 'on',
          'color-theme': 'blue',
          'beta-feature': 'off',
        },
      }}>
      <MainContent />
    </FeatureflowProvider>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 4,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  bannerLoading: {
    backgroundColor: '#1e40af',
  },
  bannerSuccess: {
    backgroundColor: '#166534',
  },
  bannerError: {
    backgroundColor: '#991b1b',
  },
  bannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  flagResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  indicatorOn: {
    backgroundColor: '#22c55e',
  },
  indicatorOff: {
    backgroundColor: '#ef4444',
  },
  flagValue: {
    fontSize: 16,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  featureBox: {
    backgroundColor: '#166534',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  featureBoxOff: {
    backgroundColor: '#374151',
  },
  featureText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  colorBox: {
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  colorBoxText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  featuresTable: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  featureKey: {
    color: '#94a3b8',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  featureValue: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  emptyText: {
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  goalButton: {
    flex: 1,
    backgroundColor: '#7c3aed',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  goalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  goalsList: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#0f172a',
    borderRadius: 8,
  },
  goalsTitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
  },
  goalItem: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    color: '#f8fafc',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tierButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  tierButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tierButtonActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  tierButtonText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  tierButtonTextActive: {
    color: '#fff',
  },
  updateButton: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#475569',
    fontSize: 12,
  },
});
