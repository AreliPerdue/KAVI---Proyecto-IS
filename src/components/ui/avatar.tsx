import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Profile } from '@/types/domain';

/** Avatar con iniciales (sin imágenes en V1). */
export function Avatar({ profile, size = 40 }: { profile: Pick<Profile, 'username' | 'display_name'>; size?: number }) {
  const theme = useTheme();
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
  circle: { borderRadius: Radius.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
