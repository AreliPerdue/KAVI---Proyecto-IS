import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Banner, Button, Sheet, SwitchRow, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useDeleteAccount } from '@/hooks/use-auth-actions';
import { useSnackbar } from '@/providers';

/** Lo mismo en la hoja y en la página pública `/eliminar-cuenta`. */
export const SE_BORRA = [
  'Tu perfil, tu nombre de usuario y tu Nobi.',
  'Tu calendario: actividades, temas y recordatorios.',
  'Tus listas y sus pendientes.',
  'Tus entrenamientos, notas, récords y racha.',
  'Tus contactos y lo que compartiste con ellos.',
];

export const LOS_DEMAS = [
  'Dejan de ver lo que les compartiste.',
  'Lo que otras personas te compartieron sigue siendo suyo.',
  'Los pendientes que agregaste a listas de otras personas se borran; los que palomeaste ahí siguen hechos.',
];

/**
 * Eliminar cuenta (spec 03, RF-A12). Dice exactamente qué se borra y qué les pasa a los demás,
 * pide la contraseña y una confirmación explícita. La confirmación vive en la misma hoja, como un
 * interruptor, y no en un diálogo aparte: un modal encima de otro queda escondido detrás.
 * No hay vuelta atrás: el borrado es inmediato.
 */
export function DeleteAccountSheet({ visible, email, onClose }: { visible: boolean; email: string; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Eliminar tu cuenta">
      {visible ? <Contenido email={email} onClose={onClose} /> : null}
    </Sheet>
  );
}

function Contenido({ email, onClose }: { email: string; onClose: () => void }) {
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
          showSnackbar({ message: 'Tu cuenta y tus datos se eliminaron.' });
        },
      },
    );
  };

  return (
    <>
      <AppText>Se borra todo, de inmediato. No se puede deshacer.</AppText>
      <Lista titulo="Qué se borra" puntos={SE_BORRA} />
      <Lista titulo="Qué pasa con los demás" puntos={LOS_DEMAS} />
      {eliminar.error ? <Banner tone="error" message={eliminar.error.message} /> : null}
      <TextField
        label="Tu contraseña"
        hint="Para confirmar que eres tú."
        value={password}
        onChangeText={setPassword}
        secure
        autoComplete="current-password"
        textContentType="password"
      />
      <SwitchRow label="Entiendo que se borra todo y no se puede deshacer" value={entiendo} onValueChange={setEntiendo} />
      <Button title="Eliminar mi cuenta para siempre" variant="danger" disabled={!password || !entiendo} loading={eliminar.isPending} onPress={enviar} />
      <Button title="Cancelar" variant="ghost" onPress={onClose} />
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
