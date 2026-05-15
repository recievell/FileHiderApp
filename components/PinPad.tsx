import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface PinPadProps {
  onPinComplete: (pin: string) => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}

export default function PinPad({ onPinComplete, onCancel, title = "Enter PIN", subtitle = "Enter your 4-digit PIN" }: PinPadProps) {
  const [pin, setPin] = useState('');

  const handleNumber = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);

      if (newPin.length === 4) {
        setTimeout(() => onPinComplete(newPin), 300);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const renderPinDots = () => {
    return (
      <View style={styles.pinDisplay}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.pinDot, pin.length > i && styles.pinDotFilled]} />
        ))}
      </View>
    );
  };

  const pinPadNumbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', ''],
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {renderPinDots()}

      <View style={styles.keypad}>
        {pinPadNumbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((num, colIndex) => (
              <TouchableOpacity
                key={colIndex}
                style={styles.button}
                onPress={() => num && handleNumber(num)}
                disabled={!num}
              >
                <Text style={styles.buttonText}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionButton, styles.backspaceButton]} onPress={handleBackspace}>
          <MaterialCommunityIcons name="backspace" size={24} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={onCancel}>
          <Text style={styles.actionButtonText}>Cancel</Text>
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
    paddingHorizontal: 20,
    backgroundColor: '#0f1419',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 32,
    textAlign: 'center',
  },
  pinDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 48,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4a5568',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#4f97f7',
    borderColor: '#4f97f7',
  },
  keypad: {
    width: '100%',
    marginBottom: 32,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  button: {
    width: '28%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#1a202c',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d3748',
  },
  buttonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backspaceButton: {
    backgroundColor: '#2d3748',
  },
  cancelButton: {
    backgroundColor: '#e53e3e',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
