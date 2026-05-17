import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { authAPI, API_URL, setToken } from '../services/api';

type Props = NativeStackScreenProps<any, 'Login'>;

const PIN_LENGTH = 6;

export default function LoginScreen({ navigation }: Props) {
  const [pin, setPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const digits = useMemo(() => {
    const values = pin.split('');
    while (values.length < PIN_LENGTH) values.push('');
    return values;
  }, [pin]);

  const handleNumericInput = (value: string, setter: (v: string) => void) => {
    const numeric = value.replace(/[^0-9]/g, '').slice(0, PIN_LENGTH);
    setter(numeric);
    if (error) setError('');
  };

  const validatePin = (pinToCheck: string) => {
    if (pinToCheck.length !== PIN_LENGTH) {
     setError(`PIN must be exactly ${PIN_LENGTH} digits.`);
      return false;
    }
    return true;
  };

  const handleContinue = async () => {
    if (!validatePin(pin)) return;

    setError('');
    setLoading(true);

    try {
      const response = await authAPI.verifyPin(pin);
      await setToken(response.token);
      navigation.navigate('VaultGrid');
    } catch (error: any) {
      if (error.message === 'PIN not configured' || error.message === 'PIN already configured') {
        try {
          const response = await authAPI.setupPin(pin);
          await setToken(response.token);
          Alert.alert('Welcome', 'PIN configured successfully. Use this PIN to unlock the app next time.');
          navigation.navigate('VaultGrid');
        } catch (setupError: any) {
          setError(setupError.message || 'Unable to configure PIN.');
        }
      } else if (error.message === 'Network request failed') {
        setError(`Network error: unable to reach backend at ${API_URL}. Make sure the server is running and the device can access it.`);
      } else {
        setError(error.message || 'Unable to verify PIN.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async () => {
    if (!validatePin(currentPin) || !validatePin(newPin)) {
      setError('Both current and new PIN must be exactly 6 digits.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await authAPI.resetPin(currentPin, newPin);
      Alert.alert('Success', 'Your PIN has been reset. Please sign in with your new PIN.');
      setResetMode(false);
      setCurrentPin('');
      setNewPin('');
      setPin('');
    } catch (error: any) {
      setError(error.message || 'Unable to reset PIN.');
    } finally {
      setLoading(false);
    }
  };

  const toggleResetMode = () => {
    setResetMode(!resetMode);
    setError('');
    setPin('');
    setCurrentPin('');
    setNewPin('');
  };

  const isContinueDisabled = loading || (resetMode ? currentPin.length !== PIN_LENGTH || newPin.length !== PIN_LENGTH : pin.length !== PIN_LENGTH);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.brand}>PrivacyHider</Text>
        <Text style={styles.subtitle}>
          {resetMode
            ? 'Enter your current PIN and a new 6-digit PIN.'
            : 'Enter your 6-digit security PIN to continue.'}
        </Text>

        {resetMode ? (
          <>
            <TextInput
              value={currentPin}
              onChangeText={(value) => handleNumericInput(value, setCurrentPin)}
              keyboardType="number-pad"
              maxLength={PIN_LENGTH}
              style={styles.textInput}
              placeholder="Current PIN"
              placeholderTextColor="#64748b"
            />
            <TextInput
              value={newPin}
              onChangeText={(value) => handleNumericInput(value, setNewPin)}
              keyboardType="number-pad"
              maxLength={PIN_LENGTH}
              style={styles.textInput}
              placeholder="New PIN"
              placeholderTextColor="#64748b"
            />
          </>
        ) : (
          <>
            <View style={styles.pinRow}>
              {digits.map((digit, index) => (
                <View key={index} style={styles.pinCell}>
                  <Text style={styles.pinCellText}>{digit ? '•' : ''}</Text>
                </View>
              ))}
            </View>

            <TextInput
              value={pin}
              onChangeText={(value) => handleNumericInput(value, setPin)}
              keyboardType="number-pad"
              maxLength={PIN_LENGTH}
              style={styles.hiddenInput}
              autoFocus
              textContentType="oneTimeCode"
            />
          </>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.buttonWrapper}>
          <Button
            title={loading ? (resetMode ? 'Resetting...' : 'Verifying...') : resetMode ? 'Reset PIN' : 'Continue'}
            onPress={resetMode ? handleResetPin : handleContinue}
            disabled={isContinueDisabled}
          />
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={toggleResetMode}>
          <Text style={styles.resetButtonText}>{resetMode ? 'Back to login' : 'Reset PIN'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.adminButton} onPress={() => navigation.navigate('AdminLogin')}>
          <Text style={styles.adminButtonText}>Admin Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  pinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pinCell: {
    width: 44,
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinCellText: {
    fontSize: 28,
    color: '#f8fafc',
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
  },
  textInput: {
    width: '100%',
    height: 54,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  buttonWrapper: {
    marginTop: 18,
  },
  resetButton: {
    marginTop: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#93c5fd',
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#f87171',
    textAlign: 'center',
    marginTop: 6,
  },
  adminButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  adminButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
});