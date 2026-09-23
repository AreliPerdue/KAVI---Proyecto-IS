import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';

import { nobiSource } from '@/constants/nobi';
import { Radius } from '@/constants/theme';
import { useResolvedScheme, useTheme } from '@/hooks/use-theme';
import type { Profile } from '@/types/domain';

type PerfilMinimo = Pick<Profile, 'username' | 'display_name'> & { avatar_url?: string | null };

/**
 * Avatar de una persona.
 *
 * Si tiene un Nobi elegido se muestra la mascota; si no, sus iniciales. Cuando no
 * hay nombre visible, el username sirve solo para sacar una inicial: nunca se
 * muestra como texto (RF-A9).
 */
export function Avatar({ profile, size = 40 }: { profile: PerfilMinimo; size?: number }) {
  const theme = useTheme();
  // El fondo va pintado en la imagen, así que la versión depende del esquema (NFR-18).
  const nobi = nobiSource(profile.avatar_url, useResolvedScheme());

  if (nobi) {
    return (
      <View
        accessible={false}
        style={[styles.circle, { width: size, height: size, backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
        <Image source={nobi} style={styles.imagen} contentFit="cover" />
      </View>
    );
  }

  const name = profile.display_name?.trim() || profile.username;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
  return (
    <View
      accessible={false}
      style={[styles.circle, { width: size, height: size, backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
      <AppText variant={size >= 40 ? 'label' : 'caption'} color="textSecondary">
        {initials}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderRadius: Radius.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imagen: { width: '100%', height: '100%' },
});
