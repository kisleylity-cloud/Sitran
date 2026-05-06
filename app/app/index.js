import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Badge, Card, colors, Muted, Screen, Title } from '../src/components/ui';
import { getDashboard } from '../src/services/api';

export default function Home() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState(null);
  const [apiOk, setApiOk] = useState(false);

  useEffect(() => {
    getDashboard()
      .then((data) => {
        setApiOk(true);
        setDashboard(data);
      })
      .catch(() => setApiOk(false));
  }, []);

  const summary = dashboard?.summary || {};
  const menu = [
    { label: 'Novo Checklist', desc: 'Registrar vistoria de saída ou retorno', path: '/checklist' },
    { label: 'Histórico', desc: 'Ver checklists já enviados ao painel', path: '/historico' },
    { label: 'Veículos e Condutores', desc: 'Base operacional sincronizada do painel', path: '/veiculos' },
    { label: 'Configuração', desc: 'Status da conexão do sistema', path: '/config' },
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.badge}>SITRAN CHECKLIST • ES</Text>
        <Title>Operação em campo</Title>
        <Muted style={{ marginTop: 8 }}>
          Faça checklists de campo com foto do funcionário, veículo e itens verificados.
        </Muted>

        <Card style={{ marginTop: 20 }}>
          <View style={styles.apiRow}>
            <Badge tone={apiOk ? 'success' : 'danger'}>{apiOk ? 'Painel conectado' : 'Painel offline'}</Badge>
            <Muted>{new Date().toLocaleDateString('pt-BR')}</Muted>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}><Text style={styles.statNum}>{summary.totalVehicles || 0}</Text><Muted>Veículos</Muted></View>
            <View style={styles.statBox}><Text style={styles.statNum}>{summary.totalDrivers || 0}</Text><Muted>Condutores</Muted></View>
            <View style={styles.statBox}><Text style={styles.statNum}>{summary.totalChecklists || 0}</Text><Muted>Checklists</Muted></View>
          </View>

          <View style={styles.highlightRow}>
            <View style={styles.highlight}><Text style={styles.highlightNum}>{summary.problemChecklists || 0}</Text><Text style={styles.highlightLabel}>Problemas</Text></View>
            <View style={styles.highlight}><Text style={styles.highlightNum}>{summary.pendingChecklists || 0}</Text><Text style={styles.highlightLabel}>Pendências</Text></View>
          </View>
        </Card>

        <View style={{ gap: 12, marginTop: 18 }}>
          {menu.map((item) => (
            <TouchableOpacity key={item.path} style={styles.menuBtn} onPress={() => router.push(item.path)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuBtnText}>{item.label}</Text>
                <Muted style={{ marginTop: 6 }}>{item.desc}</Muted>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 70, paddingBottom: 40 },
  badge: { color: colors.primary, fontWeight: '800', marginBottom: 8 },
  apiRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statBox: { flex: 1, backgroundColor: colors.cardSoft, borderRadius: 16, padding: 14 },
  statNum: { color: colors.text, fontSize: 28, fontWeight: '900', marginBottom: 4 },
  highlightRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  highlight: { flex: 1, borderRadius: 16, padding: 14, backgroundColor: colors.bgSoft, borderWidth: 1, borderColor: colors.border },
  highlightNum: { color: colors.text, fontSize: 24, fontWeight: '900', marginBottom: 4 },
  highlightLabel: { color: colors.muted, fontWeight: '700' },
  menuBtn: {
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  menuBtnText: { color: colors.text, fontSize: 17, fontWeight: '800' },
  arrow: { color: colors.primary, fontSize: 28, marginTop: -2 },
});
