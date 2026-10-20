'use client';
import { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Stack, TextField as MuiTextField, Typography } from '@mui/material';
import {
  BooleanField,
  BooleanInput,
  Datagrid,
  Edit,
  FunctionField,
  List,
  NumberField,
  NumberInput,
  SimpleForm,
  TextField,
  TextInput,
  maxValue,
  minValue,
  required,
  useDataProvider,
  useNotify,
  useRecordContext,
} from 'react-admin';
import { isPaidPlan, type Plan } from '@olaa/shared';
import type { OlaaDataProvider, SubscriptionSettings } from '../dataProvider';
import { LiveNote } from './common';
import { PricingFields } from './Pricing';

const PLAN_HELP: Record<Plan['id'], string> = {
  trial: 'Every newly approved member starts here. Its length is set in "Trial and store" above.',
  free: 'Members land here when their trial or paid plan ends.',
  weekly: 'Sold in the app stores.',
  monthly: 'Sold in the app stores.',
  quarterly: 'Sold in the app stores.',
};

/** Trial length and the default store offering. Saved straight to the live settings. */
function TrialAndStoreCard() {
  const dataProvider = useDataProvider<OlaaDataProvider>();
  const notify = useNotify();
  const [settings, setSettings] = useState<SubscriptionSettings | null>(null);
  const [trialDays, setTrialDays] = useState('');
  const [offering, setOffering] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    dataProvider.subscriptionSettings().then(
      (s) => {
        setSettings(s);
        setTrialDays(String(s.trialDays));
        setOffering(s.defaultOffering ?? '');
      },
      (e: Error) => notify(e.message, { type: 'error' }),
    );
  }, [dataProvider, notify]);

  const days = Number(trialDays);
  const valid = Number.isInteger(days) && days >= 0 && days <= 90;
  const dirty = settings && (days !== settings.trialDays || (offering.trim() || null) !== settings.defaultOffering);

  async function save() {
    setBusy(true);
    try {
      const s = await dataProvider.saveSubscriptionSettings({ trialDays: days, defaultOffering: offering.trim() || null });
      setSettings(s);
      notify('Saved — applies to newly approved members and the app straight away', { type: 'success' });
    } catch (e) {
      notify((e as Error).message, { type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Trial and store
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'flex-start' } }}>
          <MuiTextField
            label="Free trial length (days)"
            type="number"
            value={trialDays}
            onChange={(e) => setTrialDays(e.target.value)}
            error={!valid}
            helperText={valid ? 'For members approved from now on. 0 = no trial.' : 'Between 0 and 90'}
            disabled={!settings}
            sx={{ minWidth: 220 }}
          />
          <MuiTextField
            label="Default store offering"
            value={offering}
            onChange={(e) => setOffering(e.target.value)}
            helperText='RevenueCat offering id the app shows. Leave empty for RevenueCat&apos;s "current" offering.'
            disabled={!settings}
            sx={{ flex: 1 }}
          />
          <Box sx={{ pt: 1 }}>
            <Button variant="contained" onClick={save} disabled={!dirty || !valid || busy}>
              Save
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function PlanList() {
  return (
    <Box>
      <LiveNote>
        Changes here apply to every member within seconds — the app, Cid and the daily match limits all read these settings. To change a price, open a
        plan and pick another price point (a store product created at that price).
      </LiveNote>
      <TrialAndStoreCard />
      <List title="Plans" pagination={false} actions={false} sort={{ field: 'sort', order: 'ASC' }}>
        <Datagrid rowClick="edit" bulkActionButtons={false}>
          <TextField source="label" sortable={false} />
          <FunctionField label="Type" render={(p: Plan) => <Chip size="small" variant="outlined" label={isPaidPlan(p.id) ? 'paid' : p.id} />} />
          <NumberField source="matchesPerDay" label="Intros / day" sortable={false} />
          <FunctionField label="Price" render={(p: Plan) => (isPaidPlan(p.id) ? `$${p.priceUsd ?? '—'} / ${p.billingPeriod ?? '—'}` : '—')} />
          <TextField source="productId" label="Live store product" emptyText="—" sortable={false} />
          <FunctionField label="On sale" render={(p: Plan) => (isPaidPlan(p.id) ? <BooleanField source="visible" /> : '—')} />
          <TextField source="badge" emptyText="—" sortable={false} />
        </Datagrid>
      </List>
    </Box>
  );
}

function PlanFormFields() {
  const plan = useRecordContext<Plan>();
  if (!plan) return null;
  const paid = isPaidPlan(plan.id);
  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {PLAN_HELP[plan.id]}
      </Typography>
      <TextInput source="label" validate={[required()]} helperText="Name members see in the app" />
      <NumberInput source="matchesPerDay" label="Introductions per day" validate={[required(), minValue(0), maxValue(50)]} min={0} max={50} step={1} />
      {paid && (
        <>
          <BooleanInput source="visible" label="On sale in the app" helperText="Turn off to stop offering this plan. Existing subscribers keep it until it ends." />
          <TextInput source="badge" helperText='Small tag on the subscription screen, e.g. "best value". Leave empty for none.' />
          <NumberInput source="sort" label="Order on the subscription screen" min={0} max={100} step={1} />
          <TextInput source="billingPeriod" helperText='e.g. "week", "month", "3 months"' />
          <PricingFields example={`${plan.productId ?? `olaa_${plan.id}`}_2499`} />
        </>
      )}
    </>
  );
}

export function PlanEdit() {
  return (
    <Edit title="Edit plan" mutationMode="pessimistic" redirect="list">
      <SimpleForm>
        <PlanFormFields />
      </SimpleForm>
    </Edit>
  );
}
