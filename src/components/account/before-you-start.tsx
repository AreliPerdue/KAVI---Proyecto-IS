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
import { useLanguage, useT } from '@/i18n';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


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
  const tx = useT();
  const { user } = useAuth();
  const signOut = useSignOut();
  const [borrar, setBorrar] = useState(false);
  return (
    <View style={styles.salidas}>
      <Button title={tx.account.signOut} variant="ghost" loading={signOut.isPending} onPress={() => signOut.mutate()} />
      {eliminar ? (
        <>
          <Button title={tx.account.deleteMyAccount} variant="ghost" onPress={() => setBorrar(true)} />
          <DeleteAccountSheet visible={borrar} email={user?.email ?? ''} onClose={() => setBorrar(false)} />
        </>
      ) : null}
    </View>
  );
}

function Aceptar() {
  const tx = useT();
  const lang = useLanguage();
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
    <Marco titulo={tx.account.beforeTitle} intro={tx.account.beforeIntro}>
      <View style={styles.pila}>
        <AppText variant="heading">{tx.account.birthDate}</AppText>
        <AppText variant="label" color="textSecondary">
          Solo tú la ves. KAVI es para personas de 16 años o más; si tienes 16 o 17, le pediremos permiso a tu madre, padre o tutor.
        </AppText>
        <View style={styles.fila}>
          <View style={styles.celda}>
            <TextField label={tx.common.day} value={dia} onChangeText={setDia} keyboardType="number-pad" placeholder="15" maxLength={2} />
          </View>
          <View style={styles.celda}>
            <TextField label={tx.common.month} value={mes} onChangeText={setMes} keyboardType="number-pad" placeholder="9" maxLength={2} />
          </View>
          <View style={styles.celdaAnio}>
            <TextField label={tx.common.year} value={anio} onChangeText={setAnio} keyboardType="number-pad" placeholder="2006" maxLength={4} />
          </View>
        </View>
        {fecha && !fechaInvalida ? (
          <AppText variant="label">{formatDate(fecha, lang)}</AppText>
        ) : completa ? (
          <AppText variant="label" color="danger">
            {fechaInvalida ? tx.common.dateNotYet : tx.common.dateInvalid}
          </AppText>
        ) : null}
      </View>

      <View style={[styles.tarjeta, { backgroundColor: theme.surfaceAlt }]}>
        <Lista titulo={tx.account.privacyShortTitle} puntos={tx.account.privacyShort} />
        <Button title={tx.account.readPrivacy} variant="secondary" onPress={() => router.push('/privacidad')} />
      </View>

      <View>
        <SwitchRow label={tx.account.acceptPrivacy} value={aviso} onValueChange={setAviso} />
        <SwitchRow
          label={tx.account.acceptWellbeing}
          hint={tx.account.acceptWellbeingHint}
          value={sensibles}
          onValueChange={setSensibles}
        />
      </View>

      {aceptar.error ? <Banner tone="error" message={aceptar.error.message} /> : null}
      <Button title={tx.account.continue} disabled={!fecha || !aviso || !sensibles} loading={aceptar.isPending} onPress={continuar} />
      <Salidas />
    </Marco>
  );
}

function ConfirmarMenor({ fecha, edad, onCorregir }: { fecha: Date; edad: number; onCorregir: () => void }) {
  const tx = useT();
  const lang = useLanguage();
  const eliminar = useDeleteUnderageAccount();
  return (
    <Marco
      titulo={tx.account.under16Title}
      intro={tx.account.under16Confirm(formatDate(fecha, lang), edad)}
    >
      {eliminar.error ? <Banner tone="error" message={eliminar.error.message} /> : null}
      <Button title={tx.account.itsCorrectDelete} variant="danger" loading={eliminar.isPending} onPress={() => eliminar.mutate()} />
      <Button title={tx.account.fixDate} variant="secondary" disabled={eliminar.isPending} onPress={onCorregir} />
    </Marco>
  );
}

/** La fecha guardada ya dice menos de 16 (p. ej. una cuenta que se quedó a medias). */
function MenorDe16() {
  const tx = useT();
  const eliminar = useDeleteUnderageAccount();
  return (
    <Marco titulo={tx.account.under16Title} intro={tx.account.under16Stored}>
      {eliminar.error ? <Banner tone="error" message={eliminar.error.message} /> : null}
      <Button title={tx.account.deleteMyAccount} variant="danger" loading={eliminar.isPending} onPress={() => eliminar.mutate()} />
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
  const tx = useT();
  const valido = CORREO.test(email.trim());
  return (
    <Marco
      titulo={tx.account.guardianTitle}
      intro={tx.account.guardianIntro}
    >
      <TextField
        label={tx.account.guardianEmail}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder={tx.account.emailPlaceholder}
      />
      {enviar.error ? <Banner tone="error" message={enviar.error.message} /> : null}
      <Button title={tx.account.sendEmail} disabled={!valido} loading={enviar.isPending} onPress={() => enviar.mutate(email.trim(), { onSuccess: onEnviado })} />
      {onCancelar ? <Button title={tx.account.cancel} variant="ghost" onPress={onCancelar} /> : null}
      <Salidas eliminar />
    </Marco>
  );
}

function Esperando({ request, enviar, onCambiar }: { request: GuardianRequest; enviar: Envio; onCambiar: () => void }) {
  const tx = useT();
  const lang = useLanguage();
  const theme = useTheme();
  const router = useRouter();
  const consent = useConsentGate();
  const vence = formatDate(new Date(request.expiresAt), lang);
  const previewLink = enviar.data?.previewLink ?? null;

  const w = tx.account.waiting;
  const textos = {
    pending: { titulo: w.pending.title, intro: w.pending.intro(request.email, vence) },
    rejected: { titulo: w.rejected.title, intro: w.rejected.intro(request.email) },
    expired: { titulo: w.expired.title, intro: w.expired.intro(request.email) },
    approved: { titulo: w.approved.title, intro: w.approved.intro },
  } as const;
  const { titulo, intro } = textos[request.status === 'replaced' ? 'pending' : request.status];

  return (
    <Marco titulo={titulo} intro={intro}>
      {enviar.isSuccess ? <Banner tone="success" message={tx.account.emailSentTo(request.email)} /> : null}
      {enviar.error ? <Banner tone="error" message={enviar.error.message} /> : null}
      {previewLink ? (
        <View style={[styles.tarjeta, { backgroundColor: theme.surfaceAlt }]}>
          <AppText variant="label" color="textSecondary">
            {tx.account.demoNoEmail}
          </AppText>
          <Button title={tx.account.openEmailLink} variant="secondary" onPress={() => router.push(previewLink as never)} />
        </View>
      ) : null}
      {request.status === 'pending' ? <Button title={tx.account.alreadyApproved} loading={consent.isFetching} onPress={() => void consent.refetch()} /> : null}
      <Button
        title={tx.account.resend}
        variant={request.status === 'pending' ? 'secondary' : 'primary'}
        loading={enviar.isPending}
        onPress={() => enviar.mutate(request.email)}
      />
      <Button title={request.status === 'rejected' ? tx.account.sendToAnother : tx.account.changeEmail} variant="ghost" onPress={onCambiar} />
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

