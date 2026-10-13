import { BookOpen, ListChecks, Pencil, Trash2 } from 'lucide-react-native';

import { ActionRow, Sheet } from '@/components/ui';
import { IconSize, IconStroke } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import type { LibraryItem } from '@/types/domain';

export type ItemSheetProps = {
  item: LibraryItem | null;
  onClose: () => void;
  onOpen: (item: LibraryItem) => void;
  onEdit: (item: LibraryItem) => void;
  onSelect: (item: LibraryItem) => void;
  onDelete: (item: LibraryItem) => void;
};

/**
 * El menú de una pieza (RF-BL16): abrir, editar datos, seleccionar y eliminar, con lo destructivo al
 * final (kavi-design §3). "Agregar a librero" llega con los libreros (T280), "Ver su ficha" con las
 * fichas (L4) y "Cambiar portada" con T314.
 */
export function ItemSheet({ item, onClose, onOpen, onEdit, onSelect, onDelete }: ItemSheetProps) {
  const theme = useTheme();
  const m = useT().library.item;
  const icono = (C: typeof BookOpen, color: string = theme.text) => <C size={IconSize.action} strokeWidth={IconStroke} color={color} />;
  // Cada acción cierra la hoja primero: la siguiente pantalla u hoja no debe abrirse encima de esta.
  const hacer = (accion: (i: LibraryItem) => void) => () => {
    if (!item) return;
    onClose();
    accion(item);
  };
  return (
    <Sheet visible={item !== null} onClose={onClose} title={item?.title ?? ''}>
      {item ? (
        <>
          <ActionRow icon={icono(BookOpen)} label={m.open} onPress={hacer(onOpen)} />
          <ActionRow icon={icono(Pencil)} label={m.edit} onPress={hacer(onEdit)} />
          <ActionRow icon={icono(ListChecks)} label={m.select} onPress={hacer(onSelect)} />
          <ActionRow icon={icono(Trash2, theme.danger)} label={m.delete} color="danger" onPress={hacer(onDelete)} />
        </>
      ) : null}
    </Sheet>
  );
}
