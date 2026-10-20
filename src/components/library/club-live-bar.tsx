import { LogOut, Radio, UserRoundCog } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActionRow, AppText, Button, IconButton, Sheet } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { luminance } from '@/lib/color';
import { enLaSesion } from '@/lib/library/club-live';
import type { Autor } from '@/lib/library/club-annotations';
import type { PresenteEnVivo } from '@/types/domain';

type Vivo = {
  presentes: readonly PresenteEnVivo[];
  hay: boolean;
  enSesion: boolean;
  siguiendo: boolean;
  lider: PresenteEnVivo | null;
  yoDirijo: boolean;
  unirme: () => void;
  salir: () => void;
  pasarMando: (para: string) => void;
  soltarme: () => void;
  seguir: () => void;
};

/**
 * La sesión en vivo del club, arriba del libro (spec 13f, RF-BC10 – RF-BC14; T309). Si alguien está leyendo en
 * vivo y yo no, invita a unirme. Dentro: quién está (sus iniciales en su color), quién dirige, seguir o leer por
 * mi cuenta, pasar el mando (si dirijo) y salir.
 */
export function ClubLiveBar({ vivo, autores, yo }: { vivo: Vivo; autores: ReadonlyMap<string, Autor>; yo: string | null }) {
  const theme = useTheme();
  const t = useT().library.clubs.live;
  const [pasando, setPasando] = useState(false);
  if (!vivo.hay) return null;
  const dentro = enLaSesion(vivo.presentes);
  const nombreDe = (p: PresenteEnVivo) => autores.get(p.id)?.nombre ?? p.nombre;
  const lider = vivo.lider;
  const caja = [styles.caja, { backgroundColor: theme.surface, borderColor: theme.border }];

  if (!vivo.enSesion) {
    return (
      <View style={caja} accessibilityRole="alert">
        <Radio size={IconSize.inline} strokeWidth={IconStroke} color={theme.today} />
        <AppText variant="label" style={styles.flex} numberOfLines={2}>
          {lider ? t.someoneLive(nombreDe(lider)) : t.inSession}
        </AppText>
        <Button title={t.join} onPress={vivo.unirme} />
      </View>
    );
  }

  return (
    <View style={[caja, styles.columna]}>
      <View style={styles.fila}>
        <View style={styles.caras} accessible accessibilityLabel={t.people(dentro.map(nombreDe).join(', '))}>
          {dentro.slice(0, 5).map((p) => {
            const color = autores.get(p.id)?.color ?? theme.textSecondary;
            return (
              <View key={p.id} style={[styles.cara, { backgroundColor: color, borderColor: theme.surface }, p.id === lider?.id ? { borderColor: theme.today } : null]}>
                <Text style={[styles.inicial, { color: luminance(color) > 0.18 ? '#131313' : '#F2F2F2' }]}>{(nombreDe(p) || '?').slice(0, 1).toUpperCase()}</Text>
              </View>
            );
          })}
        </View>
        <AppText variant="label" style={styles.flex} numberOfLines={1}>
          {vivo.yoDirijo ? t.youLead : lider ? t.leads(nombreDe(lider)) : t.inSession}
        </AppText>
        {vivo.yoDirijo && dentro.length > 1 ? (
          <IconButton label={t.handOff} onPress={() => setPasando(true)}>
            <UserRoundCog size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
          </IconButton>
        ) : null}
        <IconButton label={t.leave} onPress={vivo.salir}>
          <LogOut size={IconSize.action} strokeWidth={IconStroke} color={theme.textSecondary} />
        </IconButton>
      </View>
      {/* Seguir o soltarse va abajo, a lo ancho: en la fila de arriba no cabría quién dirige a 375 px. */}
      {!vivo.yoDirijo && lider ? (
        <Button title={vivo.siguiendo ? t.own : t.follow(nombreDe(lider))} variant="secondary" onPress={vivo.siguiendo ? vivo.soltarme : vivo.seguir} />
      ) : null}
      <Sheet visible={pasando} onClose={() => setPasando(false)} title={t.handOffTitle}>
        {dentro
          .filter((p) => p.id !== yo)
          .map((p) => (
            <ActionRow
              key={p.id}
              icon={<View style={[styles.punto, { backgroundColor: autores.get(p.id)?.color ?? theme.textSecondary }]} />}
              label={nombreDe(p)}
              onPress={() => {
                setPasando(false);
                vivo.pasarMando(p.id);
              }}
            />
          ))}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    boxShadow: '0 4px 16px rgba(22,23,26,0.08)',
  },
  columna: { flexDirection: 'column', alignItems: 'stretch', paddingVertical: Spacing.sm },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  caras: { flexDirection: 'row' },
  cara: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, marginLeft: -6, alignItems: 'center', justifyContent: 'center' },
  inicial: { fontSize: 12, fontWeight: '700' },
  punto: { width: 16, height: 16, borderRadius: 8 },
});
