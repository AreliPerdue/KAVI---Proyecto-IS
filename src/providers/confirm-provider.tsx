import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Sheet } from '@/components/ui';
import { Spacing } from '@/constants/theme';

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

/** Diálogo de confirmación con la misma apariencia en iOS, Android y web (NFR-12). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Sheet visible={options !== null} onClose={() => settle(false)} title={options?.title}>
        {options?.message ? <AppText color="textSecondary">{options.message}</AppText> : null}
        <View style={styles.actions}>
          <Button title={options?.cancelLabel ?? 'Cancelar'} variant="secondary" onPress={() => settle(false)} />
          <Button
            title={options?.confirmLabel ?? 'Confirmar'}
            variant={options?.destructive ? 'danger' : 'primary'}
            onPress={() => settle(true)}
          />
        </View>
      </Sheet>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>.');
  return ctx;
}

const styles = StyleSheet.create({
  actions: { gap: Spacing.sm, marginTop: Spacing.sm },
});
