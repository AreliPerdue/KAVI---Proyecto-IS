import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DeleteAccountSheet, Lista } from '@/components/account/delete-account-sheet';
import { AppText, Banner, Button, Screen, SwitchRow, TextField, Wordmark, fechaDesde } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useSignOut } from '@/hooks/use-auth-actions';
import { useAcceptPrivacy, useConsentGate, useDeleteUnderageAccount, useRequestGuardianApproval } from '@/hooks/use-consent';
import { useTheme } from '@/hooks/use-theme';
import { edadEn, EDAD_MINIMA, type ConsentGate, type GuardianRequest } from '@/lib/consent';
import { formatDate, toDayKey } from '@/lib/dates';
import { useAuth } from '@/providers';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PRIVACIDAD_EN_CORTO = [
  'Tus datos son para darte el servicio de KAVI: no hay publicidad ni venta de datos.',
  'Algunos datos del gimnasio, como tu peso corporal o una nota de dolor, pueden revelar información de salud. La ley los llama datos sensibles y necesitan tu permiso expreso.',
  'Puedes eliminar tu cuenta y todos tus datos cuando quieras, desde Perfil.',
];

/**
 * "Antes de empezar" (spec 03, RF-A13): lo que ve una cuenta hasta que la app se abre. Fecha de
 * nacimiento y aceptación expresa del aviso; menores de 16 no pueden usar KAVI; de 16 a 17
 * espera la aprobación de su madre, padre o tutor, que llega por correo.
 */
export function BeforeYouStart({ gate }: { gate: Exclude<ConsentGate, { kind: 'listo' }> }) {
  if (gate.kind === 'aceptar') return <Aceptar />;
  if (gate.kind === 'menor-de-16') return <MenorDe16 />;
  return <AdultoResponsable request={gate.request} />;
}

function Marco({ titulo, intro, children }: { titulo: string; intro: string; children: React.ReactNode }) {
  return (
    <Screen scroll maxWidth={560}>
      <View style={styles.pila}>
        <Wordmark size={28} />
        <AppText variant="title" accessibilityRole="header">
          {titulo}
        </AppText>
        <AppText color="textSecondary">{intro}</AppText>
      </View>
      {children}
    </Screen>
  );
}

/** Salidas que siempre están: cerrar sesión y, si hace falta, eliminar la cuenta. */
function Salidas({ eliminar = false }: { eliminar?: boolean }) {
  const { user } = useAuth();
  const signOut = useSignOut();
  const [borrar, setBorrar] = useState(false);
  return (
    <View style={styles.salidas}>
      <Button title="Cerrar sesión" variant="ghost" loading={signOut.isPending} onPress={() => signOut.mutate()} />
      {eliminar ? (
        <>
          <Button title="Eliminar mi cuenta" variant="ghost" onPress={() => setBorrar(true)} />
          <DeleteAccountSheet visible={borrar} email={user?.email ?? ''} onClose={() => setBorrar(false)} />
        </>
      ) : null}
    </View>
  );
}

function Aceptar() {
  const theme = useTheme();
  const router = useRouter();
  const aceptar = useAcceptPrivacy();
  const [dia, setDia] = useState('');
  const [mes, setMes] = useState('');
  const [anio, setAnio] = useState('');
  const [aviso, setAviso] = useState(false);
  const [sensibles, setSensibles] = useState(false);
  const [menor, setMenor] = useState<{ fecha: Date; edad: number } | null>(null);
  const [fechaInvalida, setFechaInvalida] = useState(false);

  const fecha = fechaDesde(dia, mes, anio);
  const completa = [dia, mes, anio].every((x) => x.trim().length > 0);

  if (menor) return <ConfirmarMenor fecha={menor.fecha} edad={menor.edad} onCorregir={() => setMenor(null)} />;

  const continuar = () => {
    if (!fecha) return;
    const hoy = toDayKey(new Date());
    const nacimiento = toDayKey(fecha);
    if (nacimiento > hoy) {
      setFechaInvalida(true);
      return;
    }
    setFechaInvalida(false);
    const edad = edadEn(nacimiento, hoy);
    if (edad < EDAD_MINIMA) setMenor({ fecha, edad });
    else aceptar.mutate(nacimiento);
  };

  return (
    <Marco titulo="Antes de empezar" intro="Dos cosas, una sola vez: tu fecha de nacimiento y tu permiso para tratar tus datos.">
      <View style={styles.pila}>
        <AppText variant="heading">Tu fecha de nacimiento</AppText>
        <AppText variant="label" color="textSecondary">
          Solo tú la ves. KAVI es para personas de 16 años o más; si tienes 16 o 17, le pediremos permiso a tu madre, padre o tutor.
        </AppText>
        <View style={styles.fila}>
          <View style={styles.celda}>
            <TextField label="Día" value={dia} onChangeText={setDia} keyboardType="number-pad" placeholder="15" maxLength={2} />
          </View>
          <View style={styles.celda}>
            <TextField label="Mes" value={mes} onChangeText={setMes} keyboardType="number-pad" placeholder="9" maxLength={2} />
          </View>
          <View style={styles.celdaAnio}>
            <TextField label="Año" value={anio} onChangeText={setAnio} keyboardType="number-pad" placeholder="2006" maxLength={4} />
          </View>
        </View>
        {fecha && !fechaInvalida ? (
          <AppText variant="label">{formatDate(fecha)}</AppText>
        ) : completa ? (
          <AppText variant="label" color="danger">
            {fechaInvalida ? 'Esa fecha todavía no ha llegado.' : 'Esa fecha no existe. Revisa el día, el mes y el año.'}
          </AppText>
        ) : null}
      </View>

      <View style={[styles.tarjeta, { backgroundColor: theme.surfaceAlt }]}>
        <Lista titulo="Tu privacidad, en corto" puntos={PRIVACIDAD_EN_CORTO} />
        <Button title="Leer el aviso de privacidad" variant="secondary" onPress={() => router.push('/privacidad')} />
      </View>

      <View>
        <SwitchRow label="Leí y acepto el aviso de privacidad" value={aviso} onValueChange={setAviso} />
        <SwitchRow
          label="Acepto que KAVI trate mis datos de bienestar"
          hint="Peso corporal, energía y notas del gimnasio. Solo para mostrártelos y hacer tus cálculos."
          value={sensibles}
          onValueChange={setSensibles}
        />
      </View>

      {aceptar.error ? <Banner tone="error" message={aceptar.error.message} /> : null}
      <Button title="Continuar" disabled={!fecha || !aviso || !sensibles} loading={aceptar.isPending} onPress={continuar} />
      <Salidas />
    </Marco>
  );
}

function ConfirmarMenor({ fecha, edad, onCorregir }: { fecha: Date; edad: number; onCorregir: () => void }) {
  const eliminar = useDeleteUnderageAccount();
  return (
    <Marco
      titulo="KAVI es para personas de 16 años o más"
      intro={`Con la fecha que escribiste (${formatDate(fecha)}) tienes ${edad} ${edad === 1 ? 'año' : 'años'}. Si es correcta, tu cuenta se elimina ahora, con todo lo que tenga, y no se puede deshacer.`}
    >
      {eliminar.error ? <Banner tone="error" message={eliminar.error.message} /> : null}
      <Button title="Es correcta: eliminar mi cuenta" variant="danger" loading={eliminar.isPending} onPress={() => eliminar.mutate()} />
      <Button title="Corregir la fecha" variant="secondary" disabled={eliminar.isPending} onPress={onCorregir} />
    </Marco>
  );
}

/** La fecha guardada ya dice menos de 16 (p. ej. una cuenta que se quedó a medias). */
function MenorDe16() {
  const eliminar = useDeleteUnderageAccount();
  return (
    <Marco titulo="KAVI es para personas de 16 años o más" intro="Según tu fecha de nacimiento, todavía no puedes usar KAVI. Tu cuenta se elimina con todo lo que tenga.">
      {eliminar.error ? <Banner tone="error" message={eliminar.error.message} /> : null}
      <Button title="Eliminar mi cuenta" variant="danger" loading={eliminar.isPending} onPress={() => eliminar.mutate()} />
      <Salidas />
    </Marco>
  );
}

function AdultoResponsable({ request }: { request: GuardianRequest | null }) {
  const [cambiar, setCambiar] = useState(false);
  const enviar = useRequestGuardianApproval();
  const vista = !request || cambiar ? 'correo' : request.status;

  if (vista === 'correo' || vista === 'replaced') {
    return (
      <PedirCorreo
        inicial={cambiar ? '' : (request?.email ?? '')}
        enviar={enviar}
        onCancelar={request ? () => setCambiar(false) : undefined}
        onEnviado={() => setCambiar(false)}
      />
    );
  }
  return <Esperando request={request as GuardianRequest} enviar={enviar} onCambiar={() => setCambiar(true)} />;
}

type Envio = ReturnType<typeof useRequestGuardianApproval>;

function PedirCorreo({
  inicial,
  enviar,
  onCancelar,
  onEnviado,
}: {
  inicial: string;
  enviar: Envio;
  onCancelar?: () => void;
  onEnviado: () => void;
}) {
  const [email, setEmail] = useState(inicial);
  const valido = CORREO.test(email.trim());
  return (
    <Marco
      titulo="Falta el permiso de un adulto"
      intro="Como tienes 16 o 17 años, la ley pide que tu madre, padre o tutor apruebe que uses KAVI. Le mandaremos un correo con un enlace para revisar el aviso de privacidad y decidir."
    >
      <TextField
        label="Correo de tu madre, padre o tutor"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="nombre@correo.com"
      />
      {enviar.error ? <Banner tone="error" message={enviar.error.message} /> : null}
      <Button title="Enviar correo" disabled={!valido} loading={enviar.isPending} onPress={() => enviar.mutate(email.trim(), { onSuccess: onEnviado })} />
      {onCancelar ? <Button title="Cancelar" variant="ghost" onPress={onCancelar} /> : null}
      <Salidas eliminar />
    </Marco>
  );
}

function Esperando({ request, enviar, onCambiar }: { request: GuardianRequest; enviar: Envio; onCambiar: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const consent = useConsentGate();
  const vence = formatDate(new Date(request.expiresAt));
  const previewLink = enviar.data?.previewLink ?? null;

  const textos = {
    pending: {
      titulo: 'Esperando la aprobación',
      intro: `Le mandamos un correo a ${request.email} con un enlace. En cuanto lo apruebe, KAVI se abre aquí solo. Si no lo encuentra, que revise su carpeta de spam. El enlace vence el ${vence}.`,
    },
    rejected: {
      titulo: 'No se aprobó',
      intro: `${request.email} no aprobó que uses KAVI. Si crees que fue un error, habla con esa persona y vuelve a enviar el correo, o envíalo a otro adulto responsable.`,
    },
    expired: {
      titulo: 'El enlace venció',
      intro: `El enlace que le mandamos a ${request.email} ya no sirve. Envía uno nuevo.`,
    },
    approved: { titulo: 'Listo', intro: 'Ya se aprobó. Abriendo KAVI…' },
  } as const;
  const { titulo, intro } = textos[request.status === 'replaced' ? 'pending' : request.status];

  return (
    <Marco titulo={titulo} intro={intro}>
      {enviar.isSuccess ? <Banner tone="success" message={`Correo enviado a ${request.email}.`} /> : null}
      {enviar.error ? <Banner tone="error" message={enviar.error.message} /> : null}
      {previewLink ? (
        <View style={[styles.tarjeta, { backgroundColor: theme.surfaceAlt }]}>
          <AppText variant="label" color="textSecondary">
            Modo demo: no se manda ningún correo. Abre el enlace como si fueras el adulto.
          </AppText>
          <Button title="Abrir el enlace del correo" variant="secondary" onPress={() => router.push(previewLink as never)} />
        </View>
      ) : null}
      {request.status === 'pending' ? <Button title="Ya lo aprobó" loading={consent.isFetching} onPress={() => void consent.refetch()} /> : null}
      <Button
        title="Volver a enviar"
        variant={request.status === 'pending' ? 'secondary' : 'primary'}
        loading={enviar.isPending}
        onPress={() => enviar.mutate(request.email)}
      />
      <Button title={request.status === 'rejected' ? 'Enviar a otro correo' : 'Cambiar el correo'} variant="ghost" onPress={onCambiar} />
      <Salidas eliminar />
    </Marco>
  );
}

const styles = StyleSheet.create({
  pila: { gap: Spacing.sm },
  salidas: { gap: Spacing.xs },
  fila: { flexDirection: 'row', gap: Spacing.md },
  celda: { flex: 1 },
  celdaAnio: { flex: 1.4 },
  tarjeta: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, borderCurve: 'continuous' },
});

