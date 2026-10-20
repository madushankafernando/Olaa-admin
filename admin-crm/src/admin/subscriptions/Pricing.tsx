'use client';
import { Alert, Typography } from '@mui/material';
import { ArrayInput, NumberInput, SelectInput, SimpleFormIterator, TextInput, minValue, regex, required } from 'react-admin';
import { useWatch } from 'react-hook-form';
import type { PriceOption } from '@olaa/shared';

const productIdFormat = regex(/^[A-Za-z0-9_.:-]{1,100}$/, 'Letters, numbers, _ . : - only');
const money = (n: number | undefined) => (typeof n === 'number' && !Number.isNaN(n) ? `$${n.toFixed(2)}` : '$—');

/**
 * Price points for a package (plan or boost pack). App stores don't let apps set prices, so each price is a store
 * product created at that price; here the admin lists them and picks the live one. The app shows and sells the live
 * product straight away (no app update). Keep old ones listed: members who bought them still map to this package.
 */
export function PricingFields({ example }: { example: string }) {
  const options = (useWatch({ name: 'priceOptions' }) as Partial<PriceOption>[] | undefined) ?? [];
  const choices = options
    .filter((o) => o?.productId)
    .map((o) => ({ id: o.productId!, name: `${money(o.priceUsd)} — ${o.productId}` }));
  return (
    <>
      <Typography variant="subtitle2" sx={{ mt: 2 }}>
        Pricing
      </Typography>
      <Alert severity="info" sx={{ my: 1 }}>
        Each price is a product you create once in App Store Connect / Google Play (and RevenueCat) at that price, e.g. <code>{example}</code>. List
        them here, then choose which is live — the app switches within seconds. Keep old prices listed so existing buyers still count.
      </Alert>
      <ArrayInput source="priceOptions" label="Price points" validate={[required('Add at least one price')]}>
        <SimpleFormIterator inline disableReordering>
          <TextInput source="productId" label="Store product id" validate={[required(), productIdFormat]} helperText={false} />
          <NumberInput source="priceUsd" label="Price (USD)" validate={[required(), minValue(0)]} min={0} step={0.01} helperText={false} />
        </SimpleFormIterator>
      </ArrayInput>
      <SelectInput
        source="productId"
        label="Live price"
        choices={choices}
        validate={[required('Choose which price is live')]}
        helperText="The price members see and pay in the app now."
        sx={{ minWidth: 320 }}
      />
    </>
  );
}
