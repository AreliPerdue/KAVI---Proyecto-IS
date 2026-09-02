import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SnackbarOptions = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** ms visibles; por defecto 5000 (con acción) o 3000. */
  duration?: number;
};

type ShowFn = (options: SnackbarOptions) => void;

const SnackbarContext = createContext<ShowFn | undefined>(undefined);

/** Aviso breve inferior con acción opcional ("Deshacer") (NFR-12). */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<SnackbarOptions | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setCurrent(null);
  }, []);

  const show = useCallback<ShowFn>(
    (options) => {
      if (timer.current) clearTimeout(timer.current);
      setCurrent(options);
      timer.current = setTimeout(dismiss, options.duration ?? (options.onAction ? 5000 : 3000));
    },
    [dismiss],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const value = useMemo(() => show, [show]);
  const bottom = (Platform.OS === 'web' ? Spacing.xl : insets.bottom + Spacing.lg) + 72;

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {current ? (
        <View pointerEvents="box-none" style={[styles.host, { bottom }]}>
          <View
            accessibilityLiveRegion="polite"
            style={[styles.bar, { backgroundColor: theme.ink, boxShadow: Shadow.floating }]}>
            <AppText variant="label" color="onInk" style={styles.message}>
              {current.message}
            </AppText>
            {current.actionLabel && current.onAction ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={current.actionLabel}
                hitSlop={8}
                onPress={() => {
                  current.onAction?.();
                  dismiss();
                }}
                style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}>
                <AppText variant="bodyStrong" color="today">
                  {current.actionLabel}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): ShowFn {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar debe usarse dentro de <SnackbarProvider>.');
  return ctx;
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: Spacing.lg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    maxWidth: 560,
    width: '100%',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  message: { flex: 1 },
  action: { minHeight: 32, justifyContent: 'center' },
  pressed: { opacity: 0.7 },
});
