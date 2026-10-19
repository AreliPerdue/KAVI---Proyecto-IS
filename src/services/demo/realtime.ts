import type { RealtimeApi } from '@/services/contracts';
import { subscribeDataChanges } from '@/services/demo/store';

/** En demo, cualquier mutación en memoria notifica a la app (como Realtime). */
export const demoRealtime: RealtimeApi = {
  subscribe(_userId, onChange) {
    return subscribeDataChanges(() => onChange());
  },
  subscribeClub(_clubId, _userId, onChange) {
    return subscribeDataChanges(() => onChange());
  },
};
