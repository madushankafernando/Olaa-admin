'use client';
import { Chip, Typography } from '@mui/material';
import {
  BooleanInput,
  Create,
  Datagrid,
  Edit,
  FunctionField,
  List,
  NumberInput,
  SelectInput,
  SimpleForm,
  TextField,
  TextInput,
  maxLength,
  maxValue,
  minValue,
  required,
} from 'react-admin';
import { campaignIsLive, PLANS, type Campaign } from '@olaa/shared';
import { audienceChoices, fmtDate, IsoDateTimeInput, LiveNote, paidPlanChoices } from './common';

const audienceName = (a: Campaign['audience']) => audienceChoices.find((c) => c.id === a)?.name ?? a;

function status(c: Campaign): { label: string; color: 'success' | 'default' | 'warning' } {
  if (campaignIsLive(c)) return { label: 'live now', color: 'success' };
  if (!c.active) return { label: 'off', color: 'default' };
  if (new Date(c.startsAt).getTime() > Date.now()) return { label: 'scheduled', color: 'warning' };
  return { label: 'ended', color: 'default' };
}

const effects = (c: Campaign) =>
  [
    c.extraMatches ? `+${c.extraMatches} intros/day` : null,
    c.upgradePlan ? `${PLANS[c.upgradePlan].label} features` : null,
    c.offeringId ? `store offer "${c.offeringId}"` : null,
    c.bannerTitle ? 'banner' : null,
  ]
    .filter(Boolean)
    .join(' · ') || '—';

export function CampaignList() {
  return (
    <List title="Campaigns" sort={{ field: 'startsAt', order: 'DESC' }}>
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <TextField source="name" sortable={false} />
        <FunctionField label="Status" render={(c: Campaign) => <Chip size="small" variant="outlined" {...status(c)} />} />
        <FunctionField label="Who" render={(c: Campaign) => audienceName(c.audience)} />
        <FunctionField label="Runs" render={(c: Campaign) => `${fmtDate(c.startsAt)} → ${fmtDate(c.endsAt)}`} />
        <FunctionField label="What it does" render={effects} />
        <TextField source="priority" sortable={false} />
      </Datagrid>
    </List>
  );
}

const endsAfterStart = (value: string, all: { startsAt?: string }) =>
  value && all.startsAt && new Date(value) <= new Date(all.startsAt) ? 'The end must be after the start' : undefined;

function CampaignFields() {
  return (
    <>
      <LiveNote>
        A campaign switches on and off by itself at the start and end times, and applies to members straight away. When campaigns overlap, members get the
        biggest boost and the best plan, and see the banner and store offer of the highest-priority one.
      </LiveNote>
      <TextInput source="name" validate={[required(), maxLength(80)]} helperText="For admins, e.g. 'Black Friday 50% off'" />
      <SelectInput source="audience" label="Who it's for" choices={audienceChoices} validate={[required()]} defaultValue="all" />
      <IsoDateTimeInput source="startsAt" label="Starts" validate={[required()]} />
      <IsoDateTimeInput source="endsAt" label="Ends" validate={[required(), endsAfterStart]} />
      <BooleanInput source="active" label="Active" defaultValue={true} helperText="Switch off to stop it early without deleting it." />

      <Typography variant="subtitle2" sx={{ mt: 2 }}>
        Boost
      </Typography>
      <NumberInput source="extraMatches" label="Extra introductions per day" min={0} max={20} step={1} validate={[minValue(0), maxValue(20)]} defaultValue={0} />
      <SelectInput source="upgradePlan" label="Give everyone this plan's features" choices={paidPlanChoices} emptyText="No upgrade" emptyValue={null} helperText="Only applies to members whose own plan is lower." />

      <Typography variant="subtitle2" sx={{ mt: 2 }}>
        Store discount
      </Typography>
      <TextInput
        source="offeringId"
        label="RevenueCat offering id"
        helperText="Real price discounts are set up in App Store Connect / Google Play and grouped in a RevenueCat offering (e.g. black_friday). Enter its id and the app shows those prices while the campaign runs."
      />

      <Typography variant="subtitle2" sx={{ mt: 2 }}>
        Banner in the app
      </Typography>
      <TextInput source="bannerTitle" label="Title" validate={[maxLength(60)]} helperText="e.g. '50% off Monthly this weekend'. Empty = no banner." />
      <TextInput source="bannerBody" label="Text" validate={[maxLength(200)]} multiline />
      <NumberInput source="priority" min={-100} max={100} step={1} defaultValue={0} helperText="Higher wins when campaigns overlap." />
    </>
  );
}

export function CampaignCreate() {
  return (
    <Create title="New campaign" redirect="list">
      <SimpleForm>
        <CampaignFields />
      </SimpleForm>
    </Create>
  );
}

export function CampaignEdit() {
  return (
    <Edit title="Edit campaign" mutationMode="pessimistic" redirect="list">
      <SimpleForm>
        <CampaignFields />
      </SimpleForm>
    </Edit>
  );
}
