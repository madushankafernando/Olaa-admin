import { Alert } from '@mui/material';
import { DateTimeInput, type DateTimeInputProps } from 'react-admin';
import { PLANS, type PaidPlanId } from '@olaa/shared';

/** The paid plans as choices. Ids are fixed; labels are the defaults (rename plans on the Plans screen). */
export const paidPlanChoices: { id: PaidPlanId; name: string }[] = [
  { id: 'weekly', name: PLANS.weekly.label },
  { id: 'monthly', name: PLANS.monthly.label },
  { id: 'quarterly', name: PLANS.quarterly.label },
];

export const audienceChoices = [
  { id: 'all', name: 'Everyone' },
  { id: 'free', name: 'Free members' },
  { id: 'trial', name: 'Members on the free trial' },
  { id: 'paid', name: 'Premium members (paid or free premium)' },
];

/** Date + time in the admin's local time, sent to the API as an ISO timestamp. */
export function IsoDateTimeInput(props: DateTimeInputProps) {
  return <DateTimeInput {...props} parse={(v: string) => (v ? new Date(v).toISOString() : null)} />;
}

export function LiveNote({ children }: { children: React.ReactNode }) {
  return (
    <Alert severity="info" sx={{ mb: 2 }}>
      {children}
    </Alert>
  );
}

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
