import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Card, colors, Muted, Screen, Title } from '../src/components/ui';
import { buildAssetUrl, getChecklists } from '../src/services/api';

function getTone(status) {
  if (status === 'OK') return 'success';
  if (status === 'PENDENTE') return 'warning';
  return 'danger';
}

export default function HistoricoScreen() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    getChecklists()
      .then((data) => setItems(Array.isArray(data) ? data : data.data || []))
      .catch(() => Alert.alert('Histórico', 'Não foi possível carregar os checklists.'));
  }, []);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Title>Histórico enviado</Title>
        <Muted style={{ marginTop: 6, marginBottom: 16 }}>Tudo que já chegou ao painel aparece aqui, inclusive fotos por item.</Muted>

        {items.map((item) => {
          const photos = (item.items || []).filter((sub) => !!sub.photoUrl);
          return (
            <Card key={item.id} style={{ marginBottom: 12 }}>
              <View style={styles.topRow}>
                <Text style={styles.main}>{item.vehicle?.plate || 'Sem placa'} • {item.driver?.name || 'Sem condutor'}</Text>
                <Badge tone={getTone(item.status)}>{item.status}</Badge>
              </View>
              <Muted>{item.type} • {new Date(item.createdAt).toLocaleString('pt-BR')}</Muted>
              {!!item.location && <Muted style={{ marginTop: 6 }}>Local: {item.location}</Muted>}
              {!!item.notes && <Muted style={{ marginTop: 4 }}>Obs: {item.notes}</Muted>}
              <View style={styles.metaRow}>
                <Text style={styles.metaPill}>Itens {(item.items || []).length}</Text>
                <Text style={styles.metaPill}>Fotos {photos.length}</Text>
              </View>
              {!!photos[0] && <Image source={{ uri: buildAssetUrl(photos[0].photoUrl) }} style={styles.thumb} />}
            </Card>
          );
        })}

        {!items.length && <Muted>Nenhum checklist encontrado ainda.</Muted>}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 20, paddingBottom: 30 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  main: { color: colors.text, fontWeight: '800', fontSize: 16, marginBottom: 6, flex: 1 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  metaPill: { color: colors.text, backgroundColor: colors.cardSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontSize: 12, fontWeight: '700' },
  thumb: { width: '100%', height: 160, borderRadius: 16, marginTop: 12, borderWidth: 1, borderColor: colors.border },
});
