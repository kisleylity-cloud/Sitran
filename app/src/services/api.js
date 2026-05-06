import * as ImagePicker from 'expo-image-picker';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://beckend-production-89a0.up.railway.app/api'
).replace(/\/$/, '');

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

async function readJson(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.detail || data.message || `Erro em ${path}`);
  }

  return data;
}

export function buildAssetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('data:image')) return path;

  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getDashboard() {
  return request('/dashboard');
}

export function getVehicles() {
  return request('/vehicles');
}

export function getDrivers() {
  return request('/drivers');
}

export function getChecklists() {
  return request('/checklists');
}

export function createChecklist(payload) {
  const cleanPayload = {
    ...payload,
    odometer: Number(payload.odometer || 0),
    notes: payload.notes || null,
    location: payload.location || null,
    items: (payload.items || []).map((item) => ({
      label: item.label,
      status: item.status,
      notes: item.notes || null,
      photoUrl: item.photoUrl || null,
    })),
  };

  return request('/checklists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanPayload),
  });
}

export async function pickImage() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    throw new Error('Permissão de câmera negada.');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.35,
    allowsEditing: false,
    base64: true,
  });

  if (result.canceled) return null;

  const asset = result.assets?.[0];

  if (!asset?.base64) {
    throw new Error('Não foi possível processar a foto. Tente novamente.');
  }

  const mimeType = asset.type === 'image' ? 'image/jpeg' : 'image/jpeg';
  return `data:${mimeType};base64,${asset.base64}`;
}
