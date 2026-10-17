import { Chip } from '@mui/material';
import { useRecordContext } from 'react-admin';
import { STATUS_COLOR, STATUS_LABEL } from '../theme';

export function StatusChip({ status: explicit }: { status?: string; label?: string }) {
  const record = useRecordContext<{ status?: string }>();
  const status = explicit ?? record?.status;
  if (!status) return null;
  return <Chip size="small" label={STATUS_LABEL[status] ?? status} color={STATUS_COLOR[status] ?? 'default'} variant="outlined" />;
}

export function ageFrom(birthdate?: string | null): number | null {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export function AgeField(_: { label?: string }) {
  const record = useRecordContext<{ birthdate?: string | null }>();
  const age = ageFrom(record?.birthdate);
  return <span>{age ?? '—'}</span>;
}
