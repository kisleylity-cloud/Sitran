import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#08192d' },
          headerTintColor: '#fff',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#061527' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="checklist" options={{ title: 'Novo Checklist' }} />
        <Stack.Screen name="historico" options={{ title: 'Histórico' }} />
        <Stack.Screen name="veiculos" options={{ title: 'Veículos e Condutores' }} />
        <Stack.Screen name="config" options={{ title: 'Configuração' }} />
      </Stack>
    </>
  );
}
