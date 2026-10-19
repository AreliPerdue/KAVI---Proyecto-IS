import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useT } from '@/i18n';
import { plantillasIncluidas } from '@/lib/library/cards';
import { useAuth } from '@/providers';
import { listCards, listCardTemplates, removeCardTemplate, saveCardTemplate } from '@/services/library';
import type { LibraryCard, LibraryCardTemplate } from '@/types/domain';

const claves = {
  plantillas: (userId: string | null) => ['library', 'card-templates', userId] as const,
  fichas: (userId: string | null) => ['library', 'cards', userId] as const,
};

/**
 * Las plantillas de ficha de la persona (spec 13d; T293), todas (también las archivadas, que siguen
 * pintando sus fichas viejas). La primera vez que no hay ninguna se crean las incluidas (RF-BF1), en el
 * idioma de la app, para que se puedan cambiar como cualquier otra.
 */
export function useCardTemplates() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const t = useT().library.cards.included;
  const consulta = useQuery<LibraryCardTemplate[]>({ queryKey: claves.plantillas(userId), queryFn: () => listCardTemplates(userId as string), enabled: !!userId });
  const sembrando = useRef(false);
  const vacia = consulta.isSuccess && consulta.data.length === 0;
  useEffect(() => {
    if (!vacia || !userId || sembrando.current) return;
    sembrando.current = true;
    void (async () => {
      for (const p of plantillasIncluidas(t)) await saveCardTemplate(userId, p);
      await queryClient.invalidateQueries({ queryKey: claves.plantillas(userId) });
    })().catch(() => {
      sembrando.current = false;
    });
  }, [vacia, userId, t, queryClient]);
  return consulta;
}

/** Las fichas llenas de la persona (RF-BF7), la más reciente primero. */
export function useCards() {
  const { userId } = useAuth();
  return useQuery<LibraryCard[]>({ queryKey: claves.fichas(userId), queryFn: () => listCards(userId as string), enabled: !!userId });
}

type Diseno = Pick<LibraryCardTemplate, 'name' | 'fields' | 'look'>;

/**
 * Guardar un diseño. Uno ya usado por fichas llenas se guarda según lo que eligió la persona (RF-BF5):
 * `todas` lo cambia para todas; `nuevas` archiva la versión de antes (sus fichas la siguen usando) y crea la
 * nueva en su lugar. Devuelve la plantilla vigente.
 */
export function useSaveCardTemplate() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, diseno, aplicar = 'todas' }: { id?: string; diseno: Diseno; aplicar?: 'todas' | 'nuevas' }) => {
      const uid = userId as string;
      const previa = id ? queryClient.getQueryData<LibraryCardTemplate[]>(claves.plantillas(userId))?.find((p) => p.id === id) : undefined;
      if (previa && aplicar === 'nuevas') {
        await saveCardTemplate(uid, { id: previa.id, name: previa.name, fields: previa.fields, look: previa.look, archived: true });
        return saveCardTemplate(uid, diseno);
      }
      return saveCardTemplate(uid, { ...(id ? { id } : {}), ...diseno });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: claves.plantillas(userId) }),
  });
}

/** Borrar un diseño se lleva sus fichas llenas (la app lo advierte antes). */
export function useRemoveCardTemplate() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeCardTemplate(id),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: claves.plantillas(userId) });
      void queryClient.invalidateQueries({ queryKey: claves.fichas(userId) });
    },
  });
}
