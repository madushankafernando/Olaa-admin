'use client';
import { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Stack, TextField as MuiTextField, Typography } from '@mui/material';
import {
  BooleanField,
  BooleanInput,
  Datagrid,
  Edit,
  FunctionField,
  List,
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
import type { BoostPack } from '@olaa/shared';
import type { OlaaDataProvider, SubscriptionSettings } from '../dataProvider';
import { LiveNote } from './common';
import { PricingFields } from './Pricing';

/** How long one boost lasts. Saved straight to the live settings. */
function BoostLengthCard() {
  const dataProvider = useDataProvider<OlaaDataProvider>();
  const notify = useNotify();
  const [settings, setSettings] = useState<SubscriptionSettings | null>(null);
  const [hours, setHours] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    dataProvider.subscriptionSettings().then(
      (s) => {
        setSettings(s);
        setHours(String(s.boostHours));
      },
      (e: Error) => notify(e.message, { type: 'error' }),
    );
  }, [dataProvider, notify]);

  const n = Number(hours);
  const valid = Number.isInteger(n) && n >= 1 && n <= 168;

  async function save() {
    setBusy(true);
    try {
      setSettings(await dataProvider.saveSubscriptionSettings({ boostHours: n }));
      notify('Saved — boosts started from now on last this long', { type: 'success' });
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
          Boost length
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'flex-start' } }}>
          <MuiTextField
            label="Hours per boost"
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            error={!valid}
            helperText={valid ? 'While boosted, a member is moved to the front of other members’ introductions.' : 'Between 1 and 168 (a week)'}
            disabled={!settings}
            sx={{ minWidth: 260 }}
          />
          <Box sx={{ pt: 1 }}>
            <Button variant="contained" onClick={save} disabled={!settings || !valid || n === settings.boostHours || busy}>
              Save
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

const perBoost = (p: BoostPack) => `$${(p.priceUsd / Math.max(p.boosts, 1)).toFixed(2)}`;

export function BoostPackList() {
  return (
    <Box>
      <LiveNote>
        Members buy boosts in packs and use them whenever they like. Edits here (contents, prices, what&apos;s on sale) reach the app within seconds.
      </LiveNote>
      <BoostLengthCard />
      <List title="Boost packs" pagination={false} actions={false} sort={{ field: 'sort', order: 'ASC' }}>
        <Datagrid rowClick="edit" bulkActionButtons={false}>
          <TextField source="label" sortable={false} />
          <TextField source="boosts" sortable={false} />
          <FunctionField label="Price" render={(p: BoostPack) => `$${p.priceUsd.toFixed(2)}`} />
          <FunctionField label="Per boost" render={perBoost} />
          <TextField source="productId" label="Live store product" sortable={false} />
          <FunctionField label="Price points" render={(p: BoostPack) => p.priceOptions.length} />
          <FunctionField label="On sale" render={() => <BooleanField source="visible" />} />
          <TextField source="badge" emptyText="—" sortable={false} />
        </Datagrid>
      </List>
    </Box>
  );
}

function BoostPackFields() {
  const pack = useRecordContext<BoostPack>();
  if (!pack) return null;
  return (
    <>
      <TextInput source="label" validate={[required()]} helperText='Name members see, e.g. "3 boosts"' />
      <NumberInput source="boosts" label="Boosts in the pack" validate={[required(), minValue(1), maxValue(50)]} min={1} max={50} step={1} />
      <BooleanInput source="visible" label="On sale in the app" />
      <TextInput source="badge" helperText='Small tag, e.g. "best value". Leave empty for none.' />
      <NumberInput source="sort" label="Order in the app" min={0} max={100} step={1} />
      <PricingFields example={`${pack.productId}_299`} />
    </>
  );
}

export function BoostPackEdit() {
  return (
    <Edit title="Edit boost pack" mutationMode="pessimistic" redirect="list">
      <SimpleForm>
        <BoostPackFields />
      </SimpleForm>
    </Edit>
  );
}
