'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcardOutlined';
import BoostIcon from '@mui/icons-material/RocketLaunchOutlined';
import { useDataProvider, useNotify, useRefresh } from 'react-admin';
import { PLANS, type EntitlementSource, type PaidPlanId } from '@olaa/shared';
import type { MemberSubscription, OlaaDataProvider } from '../dataProvider';
import { fmtDate, paidPlanChoices } from '../subscriptions/common';

const SOURCE_LABEL: Record<EntitlementSource, string> = {
  paid: 'paid in the app store',
  grant: 'free premium',
  trial: 'free trial',
  free: 'free plan',
};

/** The member's plan right now, their free premium, and the "Give free premium" action. */
export function PlanCard({ memberId, name, canGrant }: { memberId: string; name: string; canGrant: boolean }) {
  const dataProvider = useDataProvider<OlaaDataProvider>();
  const notify = useNotify();
  const refresh = useRefresh();
  const [sub, setSub] = useState<MemberSubscription | null>(null);
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<PaidPlanId>('monthly');
  const [days, setDays] = useState('14');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const [boostCount, setBoostCount] = useState('1');
  const [boostNote, setBoostNote] = useState('');

  const load = useCallback(
    () => dataProvider.memberSubscription(memberId).then(setSub, (e: Error) => notify(e.message, { type: 'error' })),
    [dataProvider, memberId, notify],
  );
  useEffect(() => {
    void load();
  }, [load]);

  const n = Number(days);
  const validDays = Number.isInteger(n) && n >= 1 && n <= 365;
  const bc = Number(boostCount);
  const validBoosts = Number.isInteger(bc) && bc >= 1 && bc <= 50;

  async function act(label: string, fn: () => Promise<MemberSubscription>) {
    setBusy(true);
    try {
      setSub(await fn());
      notify(label, { type: 'success' });
      setOpen(false);
      setBoostOpen(false);
      setNote('');
      setBoostNote('');
      refresh(); // history card
    } catch (e) {
      notify((e as Error).message, { type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const now = Date.now();
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6">Plan</Typography>
          {canGrant && (
            <Stack direction="row" spacing={1}>
              <Button size="small" startIcon={<BoostIcon />} onClick={() => setBoostOpen(true)}>
                Give boosts
              </Button>
              <Button size="small" startIcon={<CardGiftcardIcon />} onClick={() => setOpen(true)}>
                Give free premium
              </Button>
            </Stack>
          )}
        </Stack>
        {!sub ? (
          <Typography color="text.secondary">Loading…</Typography>
        ) : (
          <>
            <Typography variant="body1">
              <strong>{sub.plan.label}</strong> · {sub.plan.matchesPerDay} intro{sub.plan.matchesPerDay === 1 ? '' : 's'} a day
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {SOURCE_LABEL[sub.plan.source]}
              {sub.plan.endsAt ? ` · until ${fmtDate(sub.plan.endsAt)}` : ''}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Boosts: <strong>{sub.boost.balance}</strong> left
              {sub.boost.activeUntil ? ` · boosted until ${fmtDate(sub.boost.activeUntil)}` : ''}
            </Typography>
            {sub.grants.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="subtitle2">Free premium</Typography>
                {sub.grants.map((g, i) => {
                  const active = !g.revokedAt && new Date(g.endsAt).getTime() > now;
                  return (
                    <Box key={g.id} sx={{ py: 0.75 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography variant="body2">
                          {PLANS[g.plan].label} · {fmtDate(g.startsAt)} → {fmtDate(g.endsAt)}
                        </Typography>
                        <Chip size="small" variant="outlined" label={g.revokedAt ? 'revoked' : active ? 'active' : 'ended'} color={active ? 'success' : 'default'} />
                        {active && (
                          <Button size="small" color="error" disabled={busy} onClick={() => act('Free premium revoked', () => dataProvider.revokeGrant(g.id))}>
                            Revoke
                          </Button>
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {g.source === 'promo_code' ? `Promo code ${g.promoCode ?? ''}` : 'Given by an admin'}
                        {g.note ? ` — ${g.note}` : ''}
                      </Typography>
                      {i < sub.grants.length - 1 && <Divider sx={{ mt: 0.75 }} />}
                    </Box>
                  );
                })}
              </Box>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={open} onClose={() => !busy && setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Give {name} free premium</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Starts now and applies straight away. If they also pay for a plan, the better one applies. They get a push notification, and it&apos;s logged in
            their history.
          </DialogContentText>
          <Stack spacing={2}>
            <TextField select label="Plan" value={plan} onChange={(e) => setPlan(e.target.value as PaidPlanId)}>
              {paidPlanChoices.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Days" type="number" value={days} onChange={(e) => setDays(e.target.value)} error={!validDays} helperText={validDays ? ' ' : 'Between 1 and 365'} />
            <TextField label="Reason (for admins)" value={note} onChange={(e) => setNote(e.target.value)} slotProps={{ htmlInput: { maxLength: 500 } }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={busy || !validDays}
            onClick={() => act(`Gave ${n} days of ${PLANS[plan].label}`, () => dataProvider.grantPremium(memberId, { plan, days: n, note: note.trim() || undefined }))}
          >
            Give
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={boostOpen} onClose={() => !busy && setBoostOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Give {name} boosts</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>Added to their balance to use whenever they like. They get a push notification, and it&apos;s logged in their history.</DialogContentText>
          <Stack spacing={2}>
            <TextField label="Boosts" type="number" value={boostCount} onChange={(e) => setBoostCount(e.target.value)} error={!validBoosts} helperText={validBoosts ? ' ' : 'Between 1 and 50'} />
            <TextField label="Reason (for admins)" value={boostNote} onChange={(e) => setBoostNote(e.target.value)} slotProps={{ htmlInput: { maxLength: 500 } }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBoostOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={busy || !validBoosts}
            onClick={() => act(`Gave ${bc} boost${bc === 1 ? '' : 's'}`, () => dataProvider.grantBoosts(memberId, { count: bc, note: boostNote.trim() || undefined }))}
          >
            Give
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
