import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Banner, Button, Sheet, SwitchRow, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useDeleteAccount } from '@/hooks/use-auth-actions';
import { useSnackbar } from '@/providers';
import { useT } from '@/i18n';

/** Lo mismo en la hoja y en la página pública `/eliminar-cuenta`. */
/**
 * Eliminar cuenta (spec 03, RF-A12). Dice exactamente qué se borra y qué les pasa a los demás,
 * pide la contraseña y una confirmación explícita. La confirmación vive en la misma hoja, como un
 * interruptor, y no en un diálogo aparte: un modal encima de otro queda escondido detrás.
 * No hay vuelta atrás: el borrado es inmediato.
 */
export function DeleteAccountSheet({ visible, email, onClose }: { visible: boolean; email: string; onClose: () => void }) {
  const tx = useT();
  return (
    <Sheet visible={visible} onClose={onClose} title={tx.account.deletion.sheetTitle}>
      {visible ? <Contenido email={email} onClose={onClose} /> : null}
    </Sheet>
  );
}

function Contenido({ email, onClose }: { email: string; onClose: () => void }) {
  const tx = useT();
  const showSnackbar = useSnackbar();
  const eliminar = useDeleteAccount();
  const [password, setPassword] = useState('');
  const [entiendo, setEntiendo] = useState(false);

  const enviar = () => {
    eliminar.mutate(
      { email, password },
      {
        onSuccess: () => {
          onClose();
          showSnackbar({ message: tx.account.deletion.deleted });
        },
      },
    );
  };

  return (
    <>
      <AppText>{tx.account.deletion.everythingGoes}</AppText>
      <Lista titulo={tx.account.deletion.whatGoes} puntos={tx.account.deletion.deleted_items} />
      <Lista titulo={tx.account.deletion.others} puntos={tx.account.deletion.others_items} />
      {eliminar.error ? <Banner tone="error" message={eliminar.error.message} /> : null}
      <TextField
        label={tx.account.deletion.yourPassword}
        hint={tx.account.deletion.passwordHint}
        value={password}
        onChangeText={setPassword}
        secure
        autoComplete="current-password"
        textContentType="password"
      />
      <SwitchRow label={tx.account.deletion.iUnderstand} value={entiendo} onValueChange={setEntiendo} />
      <Button title={tx.account.deletion.deleteForever} variant="danger" disabled={!password || !entiendo} loading={eliminar.isPending} onPress={enviar} />
      <Button title={tx.common.cancel} variant="ghost" onPress={onClose} />
    </>
  );
}

export function Lista({ titulo, puntos }: { titulo: string; puntos: readonly string[] }) {
  return (
    <View style={styles.lista}>
      <AppText variant="label" color="textSecondary">
        {titulo}
      </AppText>
      {puntos.map((p) => (
        <AppText key={p} color="textSecondary">
          · {p}
        </AppText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { gap: Spacing.xs },
});
