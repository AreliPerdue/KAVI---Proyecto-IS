import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarDays, ChevronLeft, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CardView, ICONO_DE_SIMBOLO } from '@/components/library/card-view';
import { AppText, Button, Chip, DatePickerSheet, ErrorState, IconButton, LoadingState, Screen, TextField } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useCards, useCardTemplates, useRemoveCard, useSaveCard } from '@/hooks/use-cards';
import { useLibraryItem } from '@/hooks/use-library';
import { useStickerElegible } from '@/hooks/use-sticker-elegible';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage, useT } from '@/i18n';
import { camposDe, LUGARES, MAX_TEXTO_CORTO, MAX_TEXTO_LARGO, type SimboloDeEscala, textoDeValor, valoresOcultos, valoresParaGuardar } from '@/lib/library/cards';
import { formatDate, toDayKey } from '@/lib/dates';
import { useConfirm, useSnackbar } from '@/providers';
import type { CardField, CardPlacement, LibraryCard, LibraryCardTemplate } from '@/types/domain';

/**
 * Llenar la ficha de un libro (spec 13d, RF-BF4, RF-BF6, RF-BF7; T294): la de `?plantilla=` (una por
 * plantilla en cada libro). Arriba la tarjeta como queda; abajo cada campo y dónde va pegada. Los valores de
 * campos que ya no están en el diseño se ven aparte y se borran a propósito (RF-BF5).
 */
export default function CardScreen() {
  const { itemId, plantilla } = useLocalSearchParams<{ itemId: string; plantilla: string }>();
  const plantillas = useCardTemplates();
  const fichas = useCards();
  const item = useLibraryItem(itemId);
  const f = useT().library.cards.fill;
  if (plantillas.isPending || fichas.isPending || item.isPending) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  const diseno = plantillas.data?.find((p) => p.id === plantilla);
  if (!diseno || !item.data) {
    return (
      <Screen>
        <ErrorState message={f.notFound} onRetry={() => void plantillas.refetch()} />
      </Screen>
    );
  }
  const ficha = fichas.data?.find((c) => c.item_id === itemId && c.template_id === plantilla) ?? null;
  return <Formulario key={`${itemId}-${plantilla}`} plantilla={diseno} ficha={ficha} itemId={itemId} titulo={item.data.title} />;
}

function Formulario({ plantilla, ficha, itemId, titulo }: { plantilla: LibraryCardTemplate; ficha: LibraryCard | null; itemId: string; titulo: string }) {
  const theme = useTheme();
  const router = useRouter();
  const tx = useT();
  const c = tx.library.cards;
  const f = c.fill;
  const guardar = useSaveCard();
  const quitar = useRemoveCard();
  const confirmar = useConfirm();
  const avisar = useSnackbar();
  const sticker = useStickerElegible();
  const campos = camposDe(plantilla.fields);
  const [valores, setValores] = useState<Record<string, unknown>>(ficha?.values ?? {});
  const [lugar, setLugar] = useState<CardPlacement>(ficha?.placement ?? 'back');
  const [cambiado, setCambiado] = useState(false);
  const [fechaDe, setFechaDe] = useState<string | null>(null);

  const poner = (id: string, valor: unknown) => {
    setCambiado(true);
    setValores((v) => {
      const sig = { ...v };
      if (valor === null || valor === undefined) delete sig[id];
      else sig[id] = valor;
      return sig;
    });
  };
  const ocultos = valoresOcultos(campos, valores);
  const campoDeFecha = campos.find((x) => x.id === fechaDe) ?? null;

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/(app)/library'));
  const salir = async () => {
    if (!cambiado) return volver();
    const ok = await confirmar({ title: f.discardTitle, message: f.discardMessage, confirmLabel: f.discard, destructive: true });
    if (ok) volver();
  };
  const alGuardar = () =>
    guardar.mutate(
      { item_id: itemId, template_id: plantilla.id, values: valoresParaGuardar(campos, valores), placement: lugar },
      {
        onSuccess: () => {
          avisar({ message: f.saved });
          volver();
        },
        onError: (e) => avisar({ message: e.message }),
      },
    );
  const alQuitar = async () => {
    if (!ficha) return;
    const ok = await confirmar({ title: f.removeTitle, message: f.removeMessage, confirmLabel: f.remove, destructive: true });
    if (!ok) return;
    quitar.mutate(ficha.id, {
      onSuccess: () => {
        avisar({ message: f.removed });
        volver();
      },
      onError: (e) => avisar({ message: e.message }),
    });
  };

  return (
    <Screen scroll>
      <View style={styles.titulo}>
        <IconButton label={tx.common.back} onPress={() => void salir()}>
          <ChevronLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </IconButton>
        <AppText variant="title" accessibilityRole="header" style={styles.flex} numberOfLines={1}>
          {plantilla.name}
        </AppText>
      </View>
      <View style={styles.tarjeta}>
        <CardView plantilla={plantilla} valores={valores} subtitulo={titulo} sticker={sticker} />
      </View>

      {campos.map((campo) => (
        <View key={campo.id} style={styles.campo}>
          {/* El campo de texto ya lleva su nombre encima. */}
          {campo.type !== 'text' ? (
            <AppText variant="label" color="textSecondary">
              {campo.label}
            </AppText>
          ) : null}
          <Control campo={campo} valor={valores[campo.id]} onCambiar={(v) => poner(campo.id, v)} onFecha={() => setFechaDe(campo.id)} />
        </View>
      ))}

      <View style={styles.campo}>
        <AppText variant="label" color="textSecondary">
          {f.placement}
        </AppText>
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={f.placement}>
          {LUGARES.map((l) => (
            <Chip
              key={l}
              label={f.placements[l]}
              selected={lugar === l}
              onPress={() => {
                setLugar(l);
                setCambiado(true);
              }}
            />
          ))}
        </View>
      </View>

      {ocultos.length ? (
        <View style={[styles.ocultos, { borderColor: theme.border }]}>
          <AppText variant="bodyStrong">{f.hidden}</AppText>
          <AppText variant="caption" color="textSecondary">
            {f.hiddenHint}
          </AppText>
          {ocultos.map(({ id, valor }) => {
            const texto = textoDeValor(valor, c);
            return (
              <View key={id} style={styles.fila}>
                <AppText variant="body" style={styles.flex} numberOfLines={2}>
                  {texto}
                </AppText>
                <IconButton label={f.deleteHidden(texto)} onPress={() => poner(id, null)}>
                  <Trash2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.danger} />
                </IconButton>
              </View>
            );
          })}
        </View>
      ) : null}

      <Button title={f.save} onPress={alGuardar} loading={guardar.isPending} />
      {ficha ? <Button title={f.remove} variant="danger" onPress={() => void alQuitar()} /> : null}

      {campoDeFecha ? (
        <DatePickerSheet
          visible
          title={campoDeFecha.label}
          value={fechaDesdeClave(valores[campoDeFecha.id]) ?? new Date()}
          onClose={() => setFechaDe(null)}
          onSelect={(d) => {
            poner(campoDeFecha.id, toDayKey(d));
            setFechaDe(null);
          }}
        />
      ) : null}
    </Screen>
  );
}

const fechaDesdeClave = (v: unknown): Date | null => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** El control de cada tipo de campo. */
function Control({ campo, valor, onCambiar, onFecha }: { campo: CardField; valor: unknown; onCambiar: (v: unknown) => void; onFecha: () => void }) {
  const theme = useTheme();
  const lang = useLanguage();
  const c = useT().library.cards;
  const f = c.fill;

  if (campo.type === 'scale') {
    const max = campo.max === 10 ? 10 : 5;
    const n = typeof valor === 'number' ? valor : 0;
    const Simbolo = ICONO_DE_SIMBOLO[(campo.symbol as SimboloDeEscala) ?? 'star'] ?? ICONO_DE_SIMBOLO.star;
    return (
      <View style={styles.simbolos} accessibilityRole="radiogroup" accessibilityLabel={campo.label}>
        {Array.from({ length: max }, (_, i) => {
          const k = i + 1;
          const lleno = k <= n;
          return (
            <Pressable
              key={k}
              accessibilityRole="radio"
              accessibilityLabel={c.scaleValue(k, max)}
              accessibilityState={{ selected: k === n }}
              // Tocar el que ya está elegido lo borra.
              onPress={() => onCambiar(k === n ? null : k)}
              hitSlop={max === 10 ? 2 : 4}
              style={styles.simbolo}>
              <Simbolo size={max === 10 ? 26 : 32} strokeWidth={1.8} color={lleno ? theme.text : theme.textTertiary} fill={lleno ? theme.text : 'transparent'} />
            </Pressable>
          );
        })}
      </View>
    );
  }
  if (campo.type === 'choice') {
    const elegidas = Array.isArray(valor) ? (valor as string[]) : [];
    return (
      <View style={styles.chips}>
        {(campo.options ?? []).map((o) => {
          const si = elegidas.includes(o);
          return (
            <Chip
              key={o}
              label={o}
              selected={si}
              onPress={() => onCambiar(campo.multiple ? (si ? elegidas.filter((x) => x !== o) : [...elegidas, o]) : si ? null : [o])}
            />
          );
        })}
      </View>
    );
  }
  if (campo.type === 'text') {
    return (
      <TextField
        label={campo.label}
        value={typeof valor === 'string' ? valor : ''}
        onChangeText={(t) => onCambiar(t || null)}
        multiline={campo.long === true}
        maxLength={campo.long ? MAX_TEXTO_LARGO : MAX_TEXTO_CORTO}
        style={campo.long ? styles.largo : undefined}
      />
    );
  }
  if (campo.type === 'date') {
    const fecha = fechaDesdeClave(valor);
    return (
      <View style={styles.fila}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${campo.label}: ${fecha ? formatDate(fecha, lang) : f.pickDate}`}
          onPress={onFecha}
          style={({ pressed }) => [styles.fecha, { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceAlt : theme.surface }]}>
          <CalendarDays size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
          <AppText variant="body" color={fecha ? 'text' : 'textSecondary'}>
            {fecha ? formatDate(fecha, lang) : f.pickDate}
          </AppText>
        </Pressable>
        {fecha ? (
          <IconButton label={f.clear(campo.label)} onPress={() => onCambiar(null)}>
            <X size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
          </IconButton>
        ) : null}
      </View>
    );
  }
  return (
    <View style={styles.chips}>
      <Chip label={c.yes} selected={valor === true} onPress={() => onCambiar(valor === true ? null : true)} />
      <Chip label={c.no} selected={valor === false} onPress={() => onCambiar(valor === false ? null : false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginLeft: -Spacing.sm },
  campo: { gap: Spacing.sm },
  tarjeta: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  simbolos: { flexDirection: 'row', flexWrap: 'wrap' },
  simbolo: { minWidth: 32, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  largo: { minHeight: 96, textAlignVertical: 'top' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  fecha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous', paddingHorizontal: Spacing.md, minHeight: 44 },
  ocultos: { gap: Spacing.sm, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous', padding: Spacing.md },
});
