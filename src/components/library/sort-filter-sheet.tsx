import { format } from 'date-fns';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Chip, ColorSwatch, DatePickerSheet, Segmented, Sheet } from '@/components/ui';
import { LIBRARY_FILTER_COLORS } from '@/constants/library';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage, useT } from '@/i18n';
import { formatShortDate } from '@/lib/dates';
import { type FiltrosBiblioteca, type OrdenBiblioteca, ORDENES, type RangoDeFecha, SIN_FILTROS } from '@/lib/library/filters';
import type { VistaDeSagas } from '@/lib/library/series';
import type { LibrarySeries } from '@/types/domain';

export type SortFilterSheetProps = {
  visible: boolean;
  onClose: () => void;
  orden: OrdenBiblioteca;
  onOrden: (orden: OrdenBiblioteca) => void;
  filtros: FiltrosBiblioteca;
  onFiltros: (filtros: FiltrosBiblioteca) => void;
  opciones: { generos: readonly string[]; autores: readonly string[] };
  /** Dentro de un librero, "Como los acomodé" es el orden de ese librero (RF-BL7). */
  enLibrero: boolean;
  /** Las sagas, para filtrar por ellas y elegir cómo se ven (RF-BL25). */
  sagas: readonly LibrarySeries[];
  vistaSagas: VistaDeSagas;
  onVistaSagas: (vista: VistaDeSagas) => void;
};

const alternar = (lista: readonly string[], valor: string) => (lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]);
const aIso = (d: Date) => format(d, 'yyyy-MM-dd');
const deIso = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Ordenar y filtrar la librería (RF-BL8, RF-BL10). El orden se recuerda en el dispositivo; los filtros
 * se combinan y se ven como chips en la librería.
 */
export function SortFilterSheet({ visible, onClose, orden, onOrden, filtros, onFiltros, opciones, enLibrero, sagas, vistaSagas, onVistaSagas }: SortFilterSheetProps) {
  const theme = useTheme();
  const tx = useT();
  const lang = useLanguage();
  const f = tx.library.find;
  const [eligiendo, setEligiendo] = useState<'desde' | 'hasta' | null>(null);
  const propio = typeof filtros.fecha === 'object' && filtros.fecha ? filtros.fecha : null;

  const etiquetaOrden: Record<OrdenBiblioteca, string> = {
    recent: f.sortRecent,
    title: f.sortTitleAZ,
    author: f.sortAuthor,
    category: f.sortCategory,
    manual: f.sortManual,
    series: tx.library.series.sortSeries,
  };
  const atajos: { valor: Exclude<RangoDeFecha, object>; etiqueta: string }[] = [
    { valor: 'week', etiqueta: f.dateWeek },
    { valor: 'month', etiqueta: f.dateMonth },
    { valor: 'year', etiqueta: f.dateYear },
  ];
  const ponerFecha = (fecha: RangoDeFecha | null) => onFiltros({ ...filtros, fecha });

  return (
    <Sheet visible={visible} onClose={onClose} title={f.sortAndFilter}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.cuerpo}>
        <View style={styles.seccion} accessibilityRole="radiogroup" accessibilityLabel={f.sortTitle}>
          <AppText variant="label" color="textSecondary">
            {f.sortTitle}
          </AppText>
          {ORDENES.filter((o) => o !== 'series' || sagas.length > 0).map((o) => (
            <Pressable
              key={o}
              accessibilityRole="radio"
              accessibilityState={{ checked: orden === o }}
              accessibilityLabel={etiquetaOrden[o]}
              onPress={() => onOrden(o)}
              style={({ pressed }) => [styles.opcion, { borderColor: theme.border }, pressed ? styles.presionada : null]}>
              <AppText variant="body" style={styles.flex}>
                {etiquetaOrden[o]}
              </AppText>
              {orden === o ? <Check size={IconSize.inline} strokeWidth={IconStroke} color={theme.ink} /> : null}
            </Pressable>
          ))}
          <AppText variant="caption" color="textTertiary">
            {enLibrero ? f.sortManualShelfHint : f.sortManualHint}
          </AppText>
        </View>

        {sagas.length > 0 ? (
          <View style={styles.seccion}>
            <AppText variant="label" color="textSecondary">
              {tx.library.series.viewTitle}
            </AppText>
            <Segmented<VistaDeSagas>
              fullWidth
              label={tx.library.series.viewTitle}
              options={[
                { value: 'loose', label: tx.library.series.viewLoose },
                { value: 'stacked', label: tx.library.series.viewStacked },
              ]}
              value={vistaSagas}
              onChange={onVistaSagas}
            />
            <View style={styles.chips}>
              {sagas.map((sg) => (
                <Chip key={sg.id} label={sg.name} compact selected={filtros.sagas.includes(sg.id)} onPress={() => onFiltros({ ...filtros, sagas: alternar(filtros.sagas, sg.id) })} />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.seccion}>
          <AppText variant="label" color="textSecondary">
            {f.dateTitle}
          </AppText>
          <View style={styles.chips}>
            {atajos.map((a) => (
              <Chip key={a.valor} label={a.etiqueta} selected={filtros.fecha === a.valor} onPress={() => ponerFecha(filtros.fecha === a.valor ? null : a.valor)} />
            ))}
            <Chip
              label={propio ? f.dateChip(formatShortDate(deIso(propio.desde), lang), formatShortDate(deIso(propio.hasta), lang)) : f.dateCustom}
              selected={!!propio}
              onPress={() => setEligiendo('desde')}
            />
          </View>
        </View>

        {opciones.generos.length > 0 ? (
          <View style={styles.seccion}>
            <AppText variant="label" color="textSecondary">
              {f.genresTitle}
            </AppText>
            <View style={styles.chips}>
              {opciones.generos.map((g) => (
                <Chip key={g} label={g} compact selected={filtros.generos.includes(g)} onPress={() => onFiltros({ ...filtros, generos: alternar(filtros.generos, g) })} />
              ))}
            </View>
          </View>
        ) : null}

        {opciones.autores.length > 0 ? (
          <View style={styles.seccion}>
            <AppText variant="label" color="textSecondary">
              {f.authorsTitle}
            </AppText>
            <View style={styles.chips}>
              {opciones.autores.map((a) => (
                <Chip key={a} label={a} compact selected={filtros.autores.includes(a)} onPress={() => onFiltros({ ...filtros, autores: alternar(filtros.autores, a) })} />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.seccion}>
          <AppText variant="label" color="textSecondary">
            {f.colorTitle}
          </AppText>
          <AppText variant="caption" color="textTertiary">
            {f.colorHint}
          </AppText>
          <View style={styles.chips}>
            {LIBRARY_FILTER_COLORS.map((c) => (
              <ColorSwatch
                key={c.id}
                hex={c.hex}
                label={f.colorA11y(f.colorNames[c.id] ?? c.id)}
                selected={filtros.color === c.hex}
                onPress={() => onFiltros({ ...filtros, color: filtros.color === c.hex ? null : c.hex })}
              />
            ))}
          </View>
        </View>

        <View style={styles.acciones}>
          <Button title={f.done} onPress={onClose} />
          <Button title={f.clearAll} variant="ghost" onPress={() => onFiltros(SIN_FILTROS)} />
        </View>
      </ScrollView>

      {/* Rango propio: primero "desde", luego "hasta" (que no puede ser antes de "desde"). */}
      <DatePickerSheet
        visible={eligiendo !== null}
        title={eligiendo === 'hasta' ? f.dateTo : f.dateFrom}
        value={eligiendo === 'hasta' && propio ? deIso(propio.hasta) : propio ? deIso(propio.desde) : new Date()}
        onClose={() => setEligiendo(null)}
        onSelect={(d) => {
          if (eligiendo === 'desde') {
            const hasta = propio && propio.hasta >= aIso(d) ? propio.hasta : aIso(d);
            ponerFecha({ desde: aIso(d), hasta });
            setEligiendo('hasta');
          } else {
            const desde = propio?.desde ?? aIso(d);
            ponerFecha(aIso(d) < desde ? { desde: aIso(d), hasta: desde } : { desde, hasta: aIso(d) });
            setEligiendo(null);
          }
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.xl, paddingBottom: Spacing.md },
  seccion: { gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  opcion: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: Radius.sm },
  flex: { flex: 1 },
  acciones: { gap: Spacing.sm },
  presionada: { opacity: 0.85 },
});
