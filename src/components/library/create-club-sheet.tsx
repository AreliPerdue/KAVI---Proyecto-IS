import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ClubContactPicker } from '@/components/library/club-contact-picker';
import { AppText, Banner, Button, Sheet, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useContacts } from '@/hooks/use-connections';
import { useT } from '@/i18n';
import type { LibraryItem } from '@/types/domain';

/** Hasta 12 personas contando a quien lo crea (C5). */
export const TOPE_DEL_CLUB = 12;

/**
 * Leer en club (spec 13f, RF-BC1, RF-BC2, RF-BC5; T306): el nombre (por omisión, el título), el aviso de
 * derechos y a qué contactos invitar.
 */
export function CreateClubSheet({
  libro,
  onClose,
  onCrear,
  creando,
  error,
}: {
  libro: LibraryItem | null;
  onClose: () => void;
  onCrear: (input: { name: string; invitar: string[] }) => void;
  creando: boolean;
  error: string | null;
}) {
  const c = useT().library.clubs;
  return (
    <Sheet visible={!!libro} onClose={onClose} title={c.createTitle}>
      {libro ? <Formulario key={libro.id} libro={libro} onCrear={onCrear} creando={creando} error={error} /> : null}
    </Sheet>
  );
}

function Formulario({ libro, onCrear, creando, error }: { libro: LibraryItem; onCrear: (i: { name: string; invitar: string[] }) => void; creando: boolean; error: string | null }) {
  const c = useT().library.clubs;
  const contactos = useContacts();
  const [nombre, setNombre] = useState(libro.title.slice(0, 120));
  const [elegidos, setElegidos] = useState<string[]>([]);
  const aceptados = (contactos.data ?? []).filter((k) => k.kind === 'accepted');
  return (
    <View style={styles.cuerpo}>
      <TextField label={c.name} value={nombre} maxLength={120} onChangeText={setNombre} />
      <AppText variant="label" color="textSecondary">
        {c.invite}
      </AppText>
      <ClubContactPicker contactos={aceptados} elegidos={elegidos} max={TOPE_DEL_CLUB - 1} onCambiar={setElegidos} />
      <AppText variant="caption" color="textSecondary">
        {c.rights}
      </AppText>
      {error ? <Banner tone="error" message={error} /> : null}
      <Button title={c.create} onPress={() => onCrear({ name: nombre.trim() || libro.title, invitar: elegidos })} loading={creando} disabled={!nombre.trim()} />
    </View>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.md },
});
