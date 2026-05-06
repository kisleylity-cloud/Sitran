import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Badge, Button, Card, colors, Input, Label, Muted, Screen, Title } from '../src/components/ui';
import { createChecklist, getDrivers, getVehicles, pickImage } from '../src/services/api';

const defaultItems = ['Pneus', 'Freios', 'Faróis', 'Setas', 'Buzina', 'Extintor', 'Lataria', 'Documentação'];
const statusOptions = ['OK', 'PENDENTE', 'PROBLEMA'];

function getTone(status) {
  if (status === 'OK') return 'success';
  if (status === 'PENDENTE') return 'warning';
  return 'danger';
}

export default function ChecklistScreen() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ vehicleId: '', driverId: '', type: 'SAIDA', odometer: '', location: '', notes: '', driverPhoto: '' });
  const [items, setItems] = useState(defaultItems.map((label) => ({ label, status: 'OK', notes: '', photoUrl: '' })));

  useEffect(() => {
    Promise.all([getVehicles(), getDrivers()])
      .then(([v, d]) => {
        const vehiclesData = Array.isArray(v) ? v : v.data || [];
        const driversData = Array.isArray(d) ? d : d.data || [];
        setVehicles(vehiclesData);
        setDrivers(driversData);
        setForm((prev) => ({
          ...prev,
          vehicleId: prev.vehicleId || vehiclesData[0]?.id || '',
          driverId: prev.driverId || driversData[0]?.id || '',
        }));
      })
      .catch(() => Alert.alert('API', 'Não foi possível carregar veículos e condutores. Confira a URL da API.'));
  }, []);

  const summary = useMemo(() => ({
    total: items.length,
    ok: items.filter((item) => item.status === 'OK').length,
    pending: items.filter((item) => item.status === 'PENDENTE').length,
    problem: items.filter((item) => item.status === 'PROBLEMA').length,
    photos: items.filter((item) => !!item.photoUrl).length + (form.driverPhoto ? 1 : 0),
  }), [items, form.driverPhoto]);

  function updateItem(index, patch) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function handleDriverPhoto() {
    try {
      const uri = await pickImage();
      if (uri) setForm((prev) => ({ ...prev, driverPhoto: uri }));
    } catch (error) {
      Alert.alert('Foto do funcionário', error.message);
    }
  }

  function selectDriver(driverId) {
    setForm((prev) => ({ ...prev, driverId, driverPhoto: prev.driverId === driverId ? prev.driverPhoto : '' }));
    setTimeout(() => {
      Alert.alert('Confirmação do funcionário', 'Agora tire uma foto do funcionário para validar quem realizou o checklist.', [
        { text: 'Depois', style: 'cancel' },
        { text: 'Tirar foto', onPress: handleDriverPhoto },
      ]);
    }, 150);
  }

  async function handlePhoto(index) {
    try {
      const uri = await pickImage();
      if (uri) updateItem(index, { photoUrl: uri });
    } catch (error) {
      Alert.alert('Foto', error.message);
    }
  }

  async function submit() {
    if (!form.vehicleId || !form.driverId) {
      Alert.alert('Validação', 'Selecione veículo e condutor.');
      return;
    }

    if (!form.driverPhoto) {
      Alert.alert('Validação', 'Tire a foto do funcionário antes de enviar o checklist.');
      return;
    }

    setLoading(true);
    try {
      await createChecklist({
        ...form,
        createdAt: new Date().toISOString(),
        odometer: Number(form.odometer || 0),
        status: items.some((item) => item.status === 'PROBLEMA') ? 'PROBLEMA' : items.some((item) => item.status === 'PENDENTE') ? 'PENDENTE' : 'OK',
        items,
      });
      Alert.alert('Sucesso', 'Checklist enviado para o painel SITRAN.');
      setForm({ vehicleId: vehicles[0]?.id || '', driverId: drivers[0]?.id || '', type: 'SAIDA', odometer: '', location: '', notes: '', driverPhoto: '' });
      setItems(defaultItems.map((label) => ({ label, status: 'OK', notes: '', photoUrl: '' })));
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.kicker}>SITRAN Checklist</Text>
        <Title>Novo checklist</Title>
        <Muted style={{ marginTop: 8 }}>
          Selecione o funcionário, tire a foto e preencha os itens do veículo.
        </Muted>

        <Card style={{ marginTop: 18 }}>
          <View style={styles.heroTop}>
            <Badge tone={summary.problem ? 'danger' : summary.pending ? 'warning' : 'success'}>
              {summary.problem ? 'Com problema' : summary.pending ? 'Com pendência' : 'Tudo OK'}
            </Badge>
            <Muted>{new Date().toLocaleString('pt-BR')}</Muted>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}><Text style={styles.statNum}>{summary.ok}</Text><Muted>OK</Muted></View>
            <View style={styles.statBox}><Text style={styles.statNum}>{summary.pending}</Text><Muted>Pendentes</Muted></View>
            <View style={styles.statBox}><Text style={styles.statNum}>{summary.problem}</Text><Muted>Problemas</Muted></View>
            <View style={styles.statBox}><Text style={styles.statNum}>{summary.photos}</Text><Muted>Fotos</Muted></View>
          </View>
        </Card>

        <Card style={{ marginTop: 14 }}>
          <Label>Condutor</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
            {drivers.map((driver) => (
              <TouchableOpacity
                key={driver.id}
                style={[styles.pill, form.driverId === driver.id && styles.pillActive]}
                onPress={() => selectDriver(driver.id)}
              >
                <Text style={styles.pillTitle}>{driver.name}</Text>
                <Text style={styles.pillSub}>CNH {driver.category}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.driverPhotoBox}>
            <View style={{ flex: 1 }}>
              <Label>Foto do funcionário</Label>
              <Muted>Obrigatória para confirmar quem realizou o checklist.</Muted>
            </View>
            <Button title={form.driverPhoto ? 'Trocar foto ✓' : 'Tirar foto'} onPress={handleDriverPhoto} variant="ghost" style={{ minWidth: 132 }} />
          </View>
          {!!form.driverPhoto && <Image source={{ uri: form.driverPhoto }} style={styles.driverPhotoPreview} />}

          <Label style={{ marginTop: 14 }}>Veículo</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
            {vehicles.map((vehicle) => (
              <TouchableOpacity
                key={vehicle.id}
                style={[styles.pill, form.vehicleId === vehicle.id && styles.pillActive]}
                onPress={() => setForm((prev) => ({ ...prev, vehicleId: vehicle.id }))}
              >
                <Text style={styles.pillTitle}>{vehicle.prefix || vehicle.plate}</Text>
                <Text style={styles.pillSub}>{vehicle.model}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Label>Tipo</Label>
              <Input value={form.type} onChangeText={(v) => setForm((p) => ({ ...p, type: v }))} />
            </View>
            <View style={{ flex: 1 }}>
              <Label>Odômetro</Label>
              <Input keyboardType="numeric" value={form.odometer} onChangeText={(v) => setForm((p) => ({ ...p, odometer: v }))} />
            </View>
          </View>

          <Label style={{ marginTop: 14 }}>Local</Label>
          <Input value={form.location} onChangeText={(v) => setForm((p) => ({ ...p, location: v }))} placeholder="Ex: Serra - ES" />

          <Label style={{ marginTop: 14 }}>Observações gerais</Label>
          <Input multiline value={form.notes} onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))} placeholder="Registre condições gerais do veículo e da operação." />
        </Card>

        <Muted style={{ marginTop: 20, marginBottom: 8 }}>Itens do checklist</Muted>
        {items.map((item, index) => (
          <Card key={item.label} style={[styles.itemCard, item.status === 'PROBLEMA' && styles.problemCard, item.status === 'PENDENTE' && styles.pendingCard]}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>{item.label}</Text>
              <Badge tone={getTone(item.status)}>{item.status}</Badge>
            </View>

            <View style={styles.statusRow}>
              {statusOptions.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.statusBtn, item.status === status && styles.statusBtnActive]}
                  onPress={() => updateItem(index, { status })}
                >
                  <Text style={styles.statusText}>{status}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input placeholder="Observações do item" value={item.notes} onChangeText={(v) => updateItem(index, { notes: v })} />

            <View style={{ marginTop: 12, gap: 10 }}>
              <Button title={item.photoUrl ? 'Foto capturada ✓' : 'Capturar foto'} onPress={() => handlePhoto(index)} variant="ghost" />
              {!!item.photoUrl && <Image source={{ uri: item.photoUrl }} style={styles.photoPreview} />}
            </View>
          </Card>
        ))}

        <Button title={loading ? 'Enviando...' : 'Enviar checklist'} onPress={submit} disabled={loading} style={{ marginBottom: 30, marginTop: 8 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 30 },
  kicker: { color: colors.primary, fontWeight: '800', marginBottom: 8, letterSpacing: 0.4 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap' },
  statBox: { flexGrow: 1, minWidth: '22%', backgroundColor: colors.cardSoft, borderRadius: 16, padding: 14 },
  statNum: { color: colors.text, fontSize: 26, fontWeight: '900', marginBottom: 4 },
  pills: { gap: 10, paddingRight: 8 },
  pill: {
    backgroundColor: colors.cardSoft,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 160,
  },
  pillActive: { backgroundColor: colors.primaryDeep, borderColor: colors.primary },
  pillTitle: { color: colors.text, fontWeight: '800', marginBottom: 4 },
  pillSub: { color: colors.muted, fontSize: 12 },
  driverPhotoBox: { marginTop: 14, backgroundColor: colors.cardSoft, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverPhotoPreview: { width: '100%', height: 220, borderRadius: 18, borderWidth: 1, borderColor: colors.border, marginTop: 12 },
  row2: { flexDirection: 'row', gap: 10, marginTop: 12 },
  itemCard: { marginBottom: 12 },
  problemCard: { borderColor: 'rgba(255,107,107,0.45)' },
  pendingCard: { borderColor: 'rgba(255,181,70,0.45)' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 },
  itemTitle: { color: colors.text, fontSize: 16, fontWeight: '800', flex: 1 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  statusBtn: { flex: 1, backgroundColor: colors.cardSoft, borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  statusBtnActive: { borderColor: colors.primary },
  statusText: { color: colors.text, fontWeight: '700' },
  photoPreview: { width: '100%', height: 180, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
});
