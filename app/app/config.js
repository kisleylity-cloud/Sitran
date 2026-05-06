import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Card, colors, Muted, Screen, Title } from '../src/components/ui';

export default function ConfigScreen() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Title>Configuração</Title>
        <Muted style={{ marginTop: 6, marginBottom: 16 }}>
          Área simples para conferir se o aplicativo está pronto para uso em campo.
        </Muted>

        <Card>
          <Text style={styles.label}>Conexão do sistema</Text>
          <Text style={styles.value}>Aplicativo configurado para enviar dados ao painel SITRAN.</Text>
          <Muted style={{ marginTop: 12 }}>
            Caso o envio falhe, confira a internet do aparelho e tente novamente.
          </Muted>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 20 },
  label: { color: colors.primary, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  value: { color: colors.text, fontSize: 15, fontWeight: '700' },
});
