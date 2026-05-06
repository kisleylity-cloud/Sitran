import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';

export const colors = {
  bg: '#071423',
  bgSoft: '#0b1b31',
  card: '#0f233c',
  cardSoft: '#16304f',
  border: '#1d476f',
  primary: '#2eb5ff',
  primaryDeep: '#0d7ed0',
  text: '#f5f8fd',
  muted: '#9fb5cc',
  danger: '#ff6b6b',
  success: '#21d19f',
  warning: '#ffb546',
};

export function Screen({ children, style }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children, style }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Label({ children, style }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Muted({ children, style, ...props }) {
  return (
    <Text style={[styles.muted, style]} {...props}>
      {children}
    </Text>
  );
}

export function Input({
  style,
  multiline = false,
  placeholderTextColor = colors.muted,
  ...rest
}) {
  return (
    <TextInput
      {...rest}
      multiline={!!multiline}
      placeholderTextColor={placeholderTextColor}
      style={[styles.input, multiline && styles.inputMultiline, style]}
    />
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  style,
  textStyle,
  disabled = false,
}) {
  return (
    <TouchableOpacity
      disabled={!!disabled}
      onPress={onPress}
      style={[
        styles.button,
        variant === 'ghost' ? styles.ghost : styles.primary,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.buttonText, variant === 'ghost' && styles.ghostText, textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

export function Badge({ children, tone = 'default', style }) {
  const toneStyle =
    tone === 'success'
      ? styles.badgeSuccess
      : tone === 'danger'
      ? styles.badgeDanger
      : tone === 'warning'
      ? styles.badgeWarning
      : styles.badgeDefault;

  return (
    <View style={[styles.badge, toneStyle, style]}>
      <Text style={styles.badgeText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  label: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 6 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  input: {
    backgroundColor: colors.cardSoft,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top' },
  button: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.primary },
  ghost: { backgroundColor: colors.cardSoft, borderWidth: 1, borderColor: colors.border },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#04111f', fontWeight: '800', fontSize: 15 },
  ghostText: { color: colors.text },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  badgeDefault: { backgroundColor: colors.cardSoft },
  badgeSuccess: { backgroundColor: 'rgba(33, 209, 159, 0.18)' },
  badgeWarning: { backgroundColor: 'rgba(255, 181, 70, 0.18)' },
  badgeDanger: { backgroundColor: 'rgba(255, 107, 107, 0.18)' },
  badgeText: { color: colors.text, fontSize: 12, fontWeight: '800' },
});