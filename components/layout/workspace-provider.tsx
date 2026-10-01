'use client';
import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from 'react';
import type { WorkspaceData, Role, Entity, RecordData } from '@/types/domain';
import { upgradeDemo } from '@/lib/operations/demo';
import { applyChanges, freezeReport, recordCreatorStage, type Change } from '@/lib/operations/mutations';
import { canOperate } from '@/lib/operations/config';
import { entitySchema } from '@/lib/validations/entities';
import { toast } from 'sonner';
import {
  useBrowserStorage,
  writeBrowserStorage,
} from '@/hooks/use-browser-storage';
type Context = {
  mutate: (changes: Change[]) => Promise<void>;
  finalize: (id: string) => Promise<void>;
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
  name = 'Hariharto Surya',
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
      return upgradeDemo(JSON.parse(stored) as WorkspaceData);
    } catch {
      return upgradeDemo(initialData);
    }
  }, [stored, demo, liveData, initialData]);
  const fallbackName = (!name || name === 'Demo Operator') ? 'Hariharto Surya' : name;
  const rawStored = useBrowserStorage('affiliateos-profile-name', fallbackName, demo);
  const displayName = (!rawStored || rawStored === 'Demo Operator') ? fallbackName : rawStored;
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
    const validated = entitySchema(e).safeParse(r);
    if (!validated.success) throw Error(validated.error.issues.map(i=>i.message).join(' · '));
    if (e==='creators' && r.phone && !/^[+0-9 ()-]{8,22}$/.test(String(r.phone))) throw Error('Enter a valid international phone number.');
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
      ...(e === 'creators' ? recordCreatorStage(data, r, name) : data),
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
      ...Object.values(data.operations || {}).flat(),
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
  const mutate = async (changes: Change[]) => {
    const result = applyChanges(data, changes, role, name);
    if (!demo) {
      const response = await fetch('/api/operations', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({changes})});
      const value = await response.json() as {error?:string; data:WorkspaceData};
      if (!response.ok) throw Error(value.error || 'Could not save operations.');
      setData(value.data);
    } else setData(result.data);
    toast.success('Changes saved');
  };
  const finalize = async (id:string) => {
    if (!canOperate(role,'reports')) throw Error('Read-only access.');
    if (!demo) {
      const response = await fetch('/api/operations', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({finalize:id})});
      const value = await response.json() as {error?:string; data:WorkspaceData};
      if (!response.ok) throw Error(value.error || 'Could not finalize report.');
      setData(value.data);
    } else {
      const result=freezeReport(data,id,name);
      setData({...result.data,activity:[{id:crypto.randomUUID(),action:'Report finalized',entity_type:'reports',entity_id:id,created_at:new Date().toISOString(),user:name},...data.activity]});
    }
    toast.success('Report marked Ready · metrics frozen');
  };
  return (
    <C.Provider
      value={{
        data,
        mutate,
        finalize,
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
