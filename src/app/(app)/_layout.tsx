import { Stack } from 'expo-router';

/** Stack nativo del área autenticada: tabs + rutas modales futuras (actividad, entrenamiento). */
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
