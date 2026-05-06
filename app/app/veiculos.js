import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { Badge, Card, colors, Muted, Screen, Title } from '../src/components/ui';
import { getDrivers, getVehicles } from '../src/services/api';

export default function VeiculosScreen() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    Promise.all([getVehicles(), getDrivers()])
      .then(([v, d]) => {
        setVehicles(Array.isArray(v) ? v : v.data || []);
        setDrivers(Array.isArray(d) ? d : d.data || []);
      })
      .catch(() => Alert.alert('Dados', 'Não foi possível carregar veículos e condutores.'));
  }, []);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Title>Base operacional</Title>
        <Muted style={{ marginTop: 6, marginBottom: 16 }}>Dados vindos do painel para seleção no checklist.</Muted>

        <Text style={styles.section}>Veículos</Text>
        {vehicles.map((vehicle) => (
          <Card key={vehicle.id} style={{ marginBottom: 10 }}>
            <Text style={styles.main}>{vehicle.prefix || vehicle.plate} • {vehicle.model}</Text>
            <Muted>{vehicle.brand} • {vehicle.year} • {vehicle.unit || 'Sem unidade'}</Muted>
            <Badge style={{ marginTop: 12 }} tone={vehicle.status === 'ATIVO' ? 'success' : vehicle.status === 'MANUTENCAO' ? 'danger' : 'warning'}>{vehicle.status}</Badge>
          </Card>
        ))}

        <Text style={styles.section}>Condutores</Text>
        {drivers.map((driver) => (
          <Card key={driver.id} style={{ marginBottom: 10 }}>
            <Text style={styles.main}>{driver.name}</Text>
            <Muted>CNH: {driver.cnh} • Categoria {driver.category}</Muted>
            <Badge style={{ marginTop: 12 }} tone={driver.status === 'ATIVO' ? 'success' : 'warning'}>{driver.status}</Badge>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 20, paddingBottom: 30 },
  section: { color: colors.primary, fontSize: 18, fontWeight: '900', marginBottom: 10, marginTop: 10 },
  main: { color: colors.text, fontWeight: '800', fontSize: 16, marginBottom: 6 },
});
