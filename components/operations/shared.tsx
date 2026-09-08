'use client';
import type { ReactNode } from 'react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { FolderOpen } from 'lucide-react';
export function Choice({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select…',
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
  placeholder?: string;
}) {
  return (
    <Select
      value={value || null}
      onValueChange={(v) => onChange(String(v || ''))}
      items={options}
    >
      <SelectTrigger aria-label={label} className="w-full h-10 bg-white">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function Status({ value }: { value: string }) {
  return (
    <span
      className={
        'status-badge ' +
        (['Active', 'Completed', 'Done'].includes(value)
          ? 'success'
          : ['Warning', 'Watchlist', 'High', 'Urgent'].includes(value)
            ? 'warning'
            : ['Failed'].includes(value)
              ? 'danger'
              : 'neutral')
      }
    >
      <i />
      {value}
    </span>
  );
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <Empty className="empty-state">
      <EmptyHeader>
        <FolderOpen className="mx-auto mb-3 text-neutral-400" size={28} />
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children}
    </Empty>
  );
}
