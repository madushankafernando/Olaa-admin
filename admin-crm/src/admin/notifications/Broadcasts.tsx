'use client';
import { useEffect, useState } from 'react';
import {
  Alert,
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
  Grid,
  Stack,
  TextField as MuiTextField,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/SendOutlined';
import ScheduleIcon from '@mui/icons-material/ScheduleOutlined';
import UndoIcon from '@mui/icons-material/UndoOutlined';
import NotificationsIcon from '@mui/icons-material/NotificationsActiveOutlined';
import {
  CheckboxGroupInput,
  Create,
  Datagrid,
  DeleteButton,
  Edit,
  FunctionField,
  List,
  SaveButton,
  SelectInput,
  Show,
  SimpleForm,
  TextInput,
  Toolbar,
  maxLength,
  required,
  useDataProvider,
  useNotify,
  useRecordContext,
  useRedirect,
  useRefresh,
} from 'react-admin';
import { useFormState, useWatch } from 'react-hook-form';
import {
  BROADCAST_BODY_MAX,
  BROADCAST_TITLE_MAX,
  PLANS,
  type Broadcast,
  type BroadcastAudience,
  type BroadcastPreview,
  type PaidPlanId,
} from '@olaa/shared';
import type { OlaaDataProvider } from '../dataProvider';
import { fmtDate, LiveNote, paidPlanChoices } from '../subscriptions/common';

export const audienceChoices: { id: BroadcastAudience; name: string }[] = [
  { id: 'all', name: 'All users' },
  { id: 'free', name: 'Free users' },
  { id: 'trial', name: 'Users on the free trial' },
  { id: 'premium', name: 'Premium users (any paid plan or free premium)' },
  { id: 'plans', name: 'Users on specific plans…' },
];

const linkChoices = [
  { id: 'home', name: 'Home' },
  { id: 'cid', name: 'Chat with Cid' },
  { id: 'matches', name: 'Matches' },
  { id: 'subscription', name: 'Subscription & plans' },
];

const audienceText = (b: Pick<Broadcast, 'audience' | 'plans'>) =>
  b.audience === 'plans' ? `${b.plans.map((p) => PLANS[p].label).join(', ')} members` : (audienceChoices.find((c) => c.id === b.audience)?.name ?? b.audience);

const STATUS: Record<Broadcast['status'], { label: string; color: 'default' | 'warning' | 'info' | 'success' | 'error' }> = {
  draft: { label: 'draft', color: 'default' },
  scheduled: { label: 'scheduled', color: 'warning' },
  sending: { label: 'sending…', color: 'info' },
  sent: { label: 'sent', color: 'success' },
  failed: { label: 'failed', color: 'error' },
};

const StatusChip = ({ b }: { b: Broadcast }) => <Chip size="small" variant="outlined" {...STATUS[b.status]} />;
const editable = (b?: Broadcast) => !b || b.status === 'draft' || b.status === 'scheduled';

export function BroadcastList() {
  return (
    <List title="Push notifications" sort={{ field: 'createdAt', order: 'DESC' }}>
      <Datagrid rowClick={(_id, _resource, record) => (editable(record as Broadcast) ? 'edit' : 'show')} bulkActionButtons={false}>
        <FunctionField
          label="Notification"
          render={(b: Broadcast) => (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {b.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {b.body}
              </Typography>
            </Box>
          )}
        />
        <FunctionField label="To" render={audienceText} />
        <FunctionField label="Status" render={(b: Broadcast) => <StatusChip b={b} />} />
        <FunctionField label="When" render={(b: Broadcast) => (b.sentAt ? fmtDate(b.sentAt) : b.status === 'scheduled' ? `for ${fmtDate(b.sendAt)}` : '—')} />
        <FunctionField label="Members" render={(b: Broadcast) => (b.sentAt ? b.recipientCount : '—')} />
        <FunctionField label="Pushes delivered" render={(b: Broadcast) => (b.sentAt ? `${b.deliveredCount} / ${b.deviceCount}` : '—')} />
        <FunctionField label="Opened" render={(b: Broadcast) => (b.sentAt ? b.readCount : '—')} />
      </Datagrid>
    </List>
  );
}

/** Lock-screen style preview of what members will see. */
function PhonePreview({ title, body }: { title?: string; body?: string }) {
  return (
    <Box sx={{ bgcolor: '#1f1b2e', borderRadius: 4, p: 2, color: '#fff' }}>
      <Typography variant="caption" sx={{ opacity: 0.6 }}>
        Preview
      </Typography>
      <Box sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.14)', borderRadius: 3, p: 1.5, display: 'flex', gap: 1.25 }}>
        <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: '#e8a87c', color: '#1f1b2e', display: 'grid', placeItems: 'center', fontWeight: 700, flexShrink: 0 }}>o</Box>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
              {title || 'Title'}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.6, flexShrink: 0 }}>
              now
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ opacity: 0.9, wordBreak: 'break-word' }}>
            {body || 'Your message'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

/** Live count of who the chosen segment reaches. */
function Reach() {
  const dataProvider = useDataProvider<OlaaDataProvider>();
  const audience = useWatch({ name: 'audience' }) as BroadcastAudience | undefined;
  const plans = (useWatch({ name: 'plans' }) as PaidPlanId[] | undefined) ?? [];
  const [preview, setPreview] = useState<BroadcastPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = `${audience}:${[...plans].sort().join(',')}`;

  useEffect(() => {
    if (!audience || (audience === 'plans' && !plans.length)) return setPreview(null);
    let live = true;
    const t = setTimeout(() => {
      dataProvider.previewBroadcast(audience, plans).then(
        (p) => live && (setPreview(p), setError(null)),
        (e: Error) => live && setError(e.message),
      );
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, dataProvider]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!preview) return <Alert severity="info">{audience === 'plans' ? 'Choose at least one plan.' : 'Counting members…'}</Alert>;
  return (
    <Alert severity={preview.members ? 'success' : 'warning'} icon={<NotificationsIcon />}>
      Reaches <strong>{preview.members}</strong> member{preview.members === 1 ? '' : 's'} right now — all of them see it in their in-app inbox.{' '}
      <strong>{preview.reachable}</strong> will also get a push ({preview.devices} device{preview.devices === 1 ? '' : 's'}).
    </Alert>
  );
}

function BroadcastFields() {
  const title = useWatch({ name: 'title' }) as string | undefined;
  const body = useWatch({ name: 'body' }) as string | undefined;
  const audience = useWatch({ name: 'audience' }) as BroadcastAudience | undefined;
  return (
    <Grid container spacing={3} sx={{ width: '100%' }}>
      <Grid size={{ xs: 12, md: 7 }}>
        <TextInput
          source="title"
          validate={[required(), maxLength(BROADCAST_TITLE_MAX)]}
          helperText={`${title?.length ?? 0}/${BROADCAST_TITLE_MAX} — short and clear, e.g. "Double intros this weekend"`}
          fullWidth
        />
        <TextInput
          source="body"
          label="Message"
          validate={[required(), maxLength(BROADCAST_BODY_MAX)]}
          helperText={`${body?.length ?? 0}/${BROADCAST_BODY_MAX} — phones show the first ~100 characters on the lock screen`}
          multiline
          minRows={3}
          fullWidth
        />
        <SelectInput source="audience" label="Send to" choices={audienceChoices} validate={[required()]} defaultValue="all" fullWidth />
        {audience === 'plans' && <CheckboxGroupInput source="plans" label="Plans" choices={paidPlanChoices} validate={[required('Choose at least one plan')]} />}
        <SelectInput
          source="link"
          label="Tapping it opens"
          choices={linkChoices}
          emptyText="Notifications inbox"
          parse={(v: string) => v || null}
          helperText="The screen members land on when they tap the notification."
          fullWidth
        />
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Stack spacing={2}>
          <PhonePreview title={title} body={body} />
          <Reach />
        </Stack>
      </Grid>
    </Grid>
  );
}

export function BroadcastCreate() {
  const notify = useNotify();
  return (
    <Create
      title="New push notification"
      redirect="edit"
      mutationOptions={{ onSuccess: () => notify('Draft saved. Check it, then send it or schedule it below.', { type: 'success' }) }}
    >
      <SimpleForm defaultValues={{ audience: 'all', plans: [], link: null }} toolbar={<Toolbar><SaveButton label="Save draft" /></Toolbar>}>
        <LiveNote>Save a draft first — you can review the reach and the preview, then send it straight away or schedule it.</LiveNote>
        <BroadcastFields />
      </SimpleForm>
    </Create>
  );
}

function EditToolbar() {
  return (
    <Toolbar sx={{ justifyContent: 'space-between' }}>
      <SaveButton label="Save draft" />
      <DeleteButton mutationMode="pessimistic" confirmTitle="Delete this notification?" confirmContent="It hasn't been sent, so no member has seen it." />
    </Toolbar>
  );
}

/** Send now / schedule / pull back to draft. Disabled while the form has unsaved changes. */
function PublishPanel() {
  const record = useRecordContext<Broadcast>();
  const dataProvider = useDataProvider<OlaaDataProvider>();
  const notify = useNotify();
  const redirect = useRedirect();
  const refresh = useRefresh();
  const { isDirty } = useFormState();
  const [confirm, setConfirm] = useState<'now' | 'schedule' | null>(null);
  const [when, setWhen] = useState('');
  const [reach, setReach] = useState<BroadcastPreview | null>(null);
  const [busy, setBusy] = useState(false);
  if (!record) return null;

  const whenIso = when ? new Date(when).toISOString() : '';
  const whenOk = !!when && new Date(when).getTime() > Date.now() + 60_000;

  async function open(kind: 'now' | 'schedule') {
    setConfirm(kind);
    setReach(null);
    dataProvider.previewBroadcast(record!.audience, record!.plans).then(setReach, () => setReach(null));
  }

  async function go() {
    setBusy(true);
    try {
      const b = await dataProvider.publishBroadcast(record!.id, confirm === 'schedule' ? whenIso : null);
      notify(b.status === 'scheduled' ? `Scheduled for ${fmtDate(b.sendAt)}` : 'Sending now', { type: 'success' });
      setConfirm(null);
      if (b.status === 'scheduled') refresh();
      else redirect('show', 'broadcasts', b.id);
    } catch (e) {
      notify((e as Error).message, { type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function unschedule() {
    setBusy(true);
    try {
      await dataProvider.unscheduleBroadcast(record!.id);
      notify('Moved back to draft', { type: 'success' });
      refresh();
    } catch (e) {
      notify((e as Error).message, { type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card variant="outlined" sx={{ width: '100%', mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Publish
        </Typography>
        {record.status === 'scheduled' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Scheduled for <strong>{fmtDate(record.sendAt)}</strong>. Edits you save before then are what members get.
          </Alert>
        )}
        {isDirty && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Save your changes first.
          </Alert>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
          <Button variant="contained" startIcon={<SendIcon />} disabled={busy || isDirty} onClick={() => open('now')}>
            Send now
          </Button>
          <MuiTextField
            type="datetime-local"
            size="small"
            label="Send at (your time)"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Button variant="outlined" startIcon={<ScheduleIcon />} disabled={busy || isDirty || !whenOk} onClick={() => open('schedule')}>
            {record.status === 'scheduled' ? 'Reschedule' : 'Schedule'}
          </Button>
          {record.status === 'scheduled' && (
            <Button startIcon={<UndoIcon />} disabled={busy} onClick={unschedule}>
              Back to draft
            </Button>
          )}
        </Stack>
      </CardContent>

      <Dialog open={!!confirm} onClose={() => !busy && setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{confirm === 'schedule' ? `Schedule for ${fmtDate(whenIso)}?` : 'Send this notification now?'}</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            <strong>{record.title}</strong>
            <br />
            to {audienceText(record).toLowerCase()}
            {reach ? ` — ${reach.members} member${reach.members === 1 ? '' : 's'} today, ${reach.reachable} with push on.` : '.'}
            <br />
            <br />
            {confirm === 'schedule'
              ? 'Who gets it is worked out when it goes out.'
              : 'It goes out straight away and can’t be recalled.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={go} disabled={busy}>
            {confirm === 'schedule' ? 'Schedule' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

function SentNotice() {
  const record = useRecordContext<Broadcast>();
  const redirect = useRedirect();
  useEffect(() => {
    if (record && !editable(record)) redirect('show', 'broadcasts', record.id);
  }, [record, redirect]);
  return null;
}

export function BroadcastEdit() {
  return (
    <Edit title="Push notification" mutationMode="pessimistic" redirect={false}>
      <SimpleForm toolbar={<EditToolbar />}>
        <SentNotice />
        <BroadcastFields />
        <PublishPanel />
      </SimpleForm>
    </Edit>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5">{value}</Typography>
    </Box>
  );
}

function BroadcastDetail() {
  const b = useRecordContext<Broadcast>();
  const refresh = useRefresh();
  // Watch it go from "sending" to "sent".
  useEffect(() => {
    if (b?.status !== 'sending') return;
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [b?.status, refresh]);
  if (!b) return null;
  return (
    <Grid container spacing={3} sx={{ p: 2 }}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <StatusChip b={b} />
            <Typography color="text.secondary">
              to {audienceText(b).toLowerCase()}
              {b.sentAt ? ` · ${fmtDate(b.sentAt)}` : ''}
            </Typography>
          </Stack>
          {b.status === 'failed' && <Alert severity="error">Sending failed: {b.error}</Alert>}
          {b.status === 'sending' && <Alert severity="info">Sending… this page updates by itself.</Alert>}
          <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap' }}>
            <Stat label="Members (inbox)" value={b.recipientCount} />
            <Stat label="Devices" value={b.deviceCount} />
            <Stat label="Pushes delivered" value={b.deliveredCount} />
            <Stat label="Failed" value={b.failedCount} />
            <Stat label="Opened" value={b.recipientCount ? `${b.readCount} (${Math.round((b.readCount / b.recipientCount) * 100)}%)` : b.readCount} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Tapping opens: {linkChoices.find((l) => l.id === b.link)?.name ?? 'Notifications inbox'}. Members who turned announcements off, or have no device
            registered, still see it in their inbox.
          </Typography>
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <PhonePreview title={b.title} body={b.body} />
      </Grid>
    </Grid>
  );
}

export function BroadcastShow() {
  return (
    <Show title="Push notification">
      <BroadcastDetail />
    </Show>
  );
}
