import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';

type Props = any;

export default function AdminLogin({ navigation }: Props) {
  const [pin, setPin] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PrivacyHider</Text>
      <TextInput
        placeholder="Enter PIN"
        value={pin}
        onChangeText={setPin}
        keyboardType="numeric"
        secureTextEntry
        style={styles.input}
      />
      <Button
        title="Continue"
        onPress={() => navigation.navigate('Home')}
        disabled={pin.trim().length === 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
});
