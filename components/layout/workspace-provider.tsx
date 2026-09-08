'use client';
import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from 'react';
import type { WorkspaceData, Role, Entity, RecordData } from '@/types/domain';
import { toast } from 'sonner';
import {
  useBrowserStorage,
  writeBrowserStorage,
} from '@/hooks/use-browser-storage';
type Context = {
  data: WorkspaceData;
  setData: (d: WorkspaceData) => void;
  demo: boolean;
  role: Role;
  name: string;
  canEdit: (e: Entity) => boolean;
  save: (e: Entity, r: RecordData) => Promise<void>;
  remove: (e: Entity, id: string) => Promise<void>;
};
const C = createContext<Context | null>(null);
export function WorkspaceProvider({
  children,
  initialData,
  demo,
  role = 'Admin',
  name = 'Hari Hartosurya',
}: {
  children: ReactNode;
  initialData: WorkspaceData;
  demo: boolean;
  role?: Role;
  name?: string;
}) {
  const [liveData, update] = useState(initialData);
  const stored = useBrowserStorage(
    'affiliateos-demo-v1',
    JSON.stringify(initialData),
    demo,
  );
  const data = useMemo(() => {
    if (!demo) return liveData;
    try {
      return JSON.parse(stored) as WorkspaceData;
    } catch {
      return initialData;
    }
  }, [stored, demo, liveData, initialData]);
  const displayName = useBrowserStorage('affiliateos-profile-name', name, demo);
  const setData = (next: WorkspaceData) => {
    if (demo) writeBrowserStorage('affiliateos-demo-v1', JSON.stringify(next));
    else update(next);
  };
  const canEdit = (e: Entity) =>
    role === 'Admin' ||
    (role === 'Affiliate Manager' &&
      ['campaigns', 'creators', 'tasks'].includes(e));
  const save = async (e: Entity, r: RecordData) => {
    if (!canEdit(e)) throw Error('Your role does not allow this change.');
    const exists = data.entities[e].some((x) => x.id === r.id);
    if (!demo) {
      const response = await fetch('/api/entities/' + e, {
        method: exists ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r),
      });
      if (!response.ok)
        throw Error(
          ((await response.json()) as { error?: string }).error ||
            'Could not save.',
        );
    }
    setData({
      ...data,
      entities: {
        ...data.entities,
        [e]: exists
          ? data.entities[e].map((x) => (x.id === r.id ? r : x))
          : [r, ...data.entities[e]],
      },
      activity: [
        {
          id: crypto.randomUUID(),
          action: r.name + (exists ? ' updated' : ' created'),
          entity_type: e,
          entity_id: r.id,
          created_at: new Date().toISOString(),
          user: name,
        },
        ...data.activity,
      ],
    });
    toast.success(exists ? 'Changes saved' : `${r.name} created`);
  };
  const remove = async (e: Entity, id: string) => {
    if (!canEdit(e)) throw Error('Your role does not allow this change.');
    const linked = [
      ...data.tiktok_accounts,
      ...data.shopee_accounts,
      ...data.campaign_creators,
      ...data.tiktok_performance,
      ...data.shopee_performance,
    ].some((r) =>
      Object.entries(r).some(([k, v]) => k.endsWith('_id') && v === id),
    );
    const refs =
      linked ||
      Object.values(data.entities)
        .flat()
        .some(
          (r) =>
            r.id !== id &&
            Object.entries(r).some(([k, v]) => k.endsWith('_id') && v === id),
        );
    if (refs)
      throw Error(
        'This record is linked to other records. Remove those links first.',
      );
    if (!demo) {
      const response = await fetch('/api/entities/' + e, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok)
        throw Error(
          ((await response.json()) as { error?: string }).error ||
            'Could not delete.',
        );
    }
    setData({
      ...data,
      entities: {
        ...data.entities,
        [e]: data.entities[e].filter((r) => r.id !== id),
      },
      activity: [
        {
          id: crypto.randomUUID(),
          action: 'Record deleted',
          entity_type: e,
          entity_id: id,
          created_at: new Date().toISOString(),
          user: name,
        },
        ...data.activity,
      ],
    });
    toast.success('Record deleted');
  };
  return (
    <C.Provider
      value={{
        data,
        setData,
        demo,
        role,
        name: displayName,
        canEdit,
        save,
        remove,
      }}
    >
      {children}
    </C.Provider>
  );
}
export function useWorkspace() {
  const c = useContext(C);
  if (!c) throw Error('Workspace is unavailable');
  return c;
}
