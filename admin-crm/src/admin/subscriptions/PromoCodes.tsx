'use client';
import { Alert, Chip, Typography } from '@mui/material';
import {
  BooleanInput,
  Create,
  Datagrid,
  Edit,
  FormDataConsumer,
  FunctionField,
  List,
  NumberInput,
  SelectInput,
  SimpleForm,
  TextField,
  TextInput,
  maxValue,
  minValue,
  regex,
  required,
  useRecordContext,
} from 'react-admin';
import { PLANS, type PromoCode } from '@olaa/shared';
import { fmtDate, IsoDateTimeInput, LiveNote, paidPlanChoices } from './common';

const kindChoices = [
  { id: 'premium_days', name: 'Free premium for a number of days' },
  { id: 'trial_extension', name: 'Extra days on the free trial' },
];

const gives = (p: PromoCode) => (p.kind === 'premium_days' ? `${p.days} days of ${p.plan ? PLANS[p.plan].label : '—'}` : `+${p.days} trial days`);

function state(p: PromoCode): { label: string; color: 'success' | 'default' | 'warning' } {
  const now = Date.now();
  if (!p.active) return { label: 'off', color: 'default' };
  if (p.expiresAt && new Date(p.expiresAt).getTime() <= now) return { label: 'expired', color: 'default' };
  if (p.maxRedemptions !== null && p.redemptionCount >= p.maxRedemptions) return { label: 'used up', color: 'warning' };
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return { label: 'scheduled', color: 'warning' };
  return { label: 'live', color: 'success' };
}

export function PromoCodeList() {
  return (
    <List title="Promo codes" sort={{ field: 'createdAt', order: 'DESC' }}>
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <TextField source="code" sortable={false} sx={{ fontFamily: 'monospace', fontWeight: 600 }} />
        <FunctionField label="Gives" render={gives} />
        <FunctionField label="Used" render={(p: PromoCode) => `${p.redemptionCount}${p.maxRedemptions !== null ? ` / ${p.maxRedemptions}` : ''}`} />
        <FunctionField label="Starts" render={(p: PromoCode) => fmtDate(p.startsAt)} />
        <FunctionField label="Expires" render={(p: PromoCode) => fmtDate(p.expiresAt)} />
        <FunctionField label="Status" render={(p: PromoCode) => <Chip size="small" variant="outlined" {...state(p)} />} />
        <TextField source="description" sortable={false} emptyText="—" />
      </Datagrid>
    </List>
  );
}

function PromoFields({ editing }: { editing?: boolean }) {
  const record = useRecordContext<PromoCode>();
  const locked = !!editing && (record?.redemptionCount ?? 0) > 0;
  return (
    <>
      <LiveNote>
        Members enter the code in the app (You → Subscription → Have a code?). Each member can use a code once. Free premium runs alongside any paid plan
        — the better of the two applies.
      </LiveNote>
      {locked && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {record!.redemptionCount} member{record!.redemptionCount === 1 ? ' has' : 's have'} used this code, so what it gives is fixed. To change it,
          switch this one off and create a new code.
        </Alert>
      )}
      <TextInput
        source="code"
        disabled={locked}
        helperText={editing ? '3–32 letters, numbers, - or _' : 'Leave empty to generate one, or type your own (e.g. WELCOME30). Not case-sensitive.'}
        validate={[regex(/^[A-Za-z0-9_-]{3,32}$/, 'Use 3–32 letters, numbers, - or _')]}
        parse={(v: string) => v?.toUpperCase() ?? ''}
      />
      <TextInput source="description" helperText="For admins only, e.g. 'Instagram launch campaign'" multiline />
      <SelectInput source="kind" label="What it gives" choices={kindChoices} validate={[required()]} disabled={locked} defaultValue="premium_days" />
      <FormDataConsumer<{ kind?: string }>>
        {({ formData }) =>
          formData.kind === 'premium_days' ? <SelectInput source="plan" choices={paidPlanChoices} validate={[required()]} disabled={locked} defaultValue="monthly" /> : null
        }
      </FormDataConsumer>
      <NumberInput source="days" validate={[required(), minValue(1), maxValue(365)]} min={1} max={365} step={1} disabled={locked} defaultValue={30} />
      <Typography variant="subtitle2" sx={{ mt: 2 }}>
        Limits (all optional)
      </Typography>
      <NumberInput source="maxRedemptions" label="Maximum uses in total" min={1} step={1} helperText="Empty = unlimited" />
      <IsoDateTimeInput source="startsAt" label="Valid from" helperText="Empty = straight away" />
      <IsoDateTimeInput source="expiresAt" label="Expires" helperText="Empty = never" />
      <BooleanInput source="active" label="Active" defaultValue={true} helperText="Switch off to stop new redemptions. Members who already redeemed keep what they got." />
    </>
  );
}

export function PromoCodeCreate() {
  return (
    <Create title="New promo code" redirect="list">
      <SimpleForm>
        <PromoFields />
      </SimpleForm>
    </Create>
  );
}

export function PromoCodeEdit() {
  return (
    <Edit title="Edit promo code" mutationMode="pessimistic" redirect="list">
      <SimpleForm>
        <PromoFields editing />
      </SimpleForm>
    </Edit>
  );
}
