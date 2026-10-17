'use client';
import { useState } from 'react';
import { PROFILE_QUESTIONS } from '@olaa/shared';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/CheckCircleOutlined';
import EditNoteIcon from '@mui/icons-material/EditNote';
import BlockIcon from '@mui/icons-material/Block';
import ThumbUpIcon from '@mui/icons-material/ThumbUpAltOutlined';
import ThumbDownIcon from '@mui/icons-material/ThumbDownAltOutlined';
import PauseIcon from '@mui/icons-material/PauseCircleOutlined';
import PlayIcon from '@mui/icons-material/PlayCircleOutlined';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { Show, useDataProvider, useNotify, useRecordContext, useRedirect, useRefresh } from 'react-admin';
import type { Decision, OlaaDataProvider, ReviewDetail } from '../dataProvider';
import { ageFrom, StatusChip } from './StatusChip';

type NoteAction = { kind: 'request_changes' | 'reject' | 'suspend'; title: string; help: string; confirm: string; required: boolean };

const NOTE_ACTIONS: Record<NoteAction['kind'], NoteAction> = {
  request_changes: {
    kind: 'request_changes',
    title: 'Ask for changes',
    help: 'Tell the member exactly what to fix (photos or details). They get this by email and in the app, can edit, and resubmit.',
    confirm: 'Send request',
    required: true,
  },
  reject: {
    kind: 'reject',
    title: 'Reject application',
    help: 'The member is told by email. Their account, photos and data are then deleted from every system automatically (within 30 days — set by REJECTED_PURGE_DAYS on the backend). This cannot be undone.',
    confirm: 'Reject and schedule deletion',
    required: true,
  },
  suspend: {
    kind: 'suspend',
    title: 'Suspend member',
    help: 'Hides them from matching and locks them out of Cid and matches. You can reinstate them later. Their open chats stay as they are.',
    confirm: 'Suspend',
    required: true,
  },
};

const answerText = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(', ') : v) || '—';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 160, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" component="div">
        {value ?? '—'}
      </Typography>
    </Stack>
  );
}

function ReviewPanel() {
  const record = useRecordContext<ReviewDetail>();
  const dataProvider = useDataProvider<OlaaDataProvider>();
  const notify = useNotify();
  const refresh = useRefresh();
  const redirect = useRedirect();
  const [dialog, setDialog] = useState<NoteAction | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);

  // While loading, React-Admin may hand us the list row as a placeholder (no `profile` yet).
  if (!record?.profile) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  const id = record.id;
  const p = record.profile as ReviewDetail['profile'] & {
    birthdate?: string;
    gender?: string;
    seeking?: string[];
    city?: string;
    bio?: string;
    age_min?: number;
    age_max?: number;
    max_distance_km?: number;
    review_note?: string | null;
    cid_persona?: string | null;
    created_at?: string;
    approved_at?: string | null;
  };
  const status = p.status;

  async function run(label: string, fn: () => Promise<unknown>, after: 'refresh' | 'queue' | 'members' = 'refresh') {
    setBusy(true);
    try {
      await fn();
      notify(label, { type: 'success' });
      setDialog(null);
      setNote('');
      if (after === 'queue') redirect('list', 'review');
      else if (after === 'members') redirect('list', 'members');
      else refresh();
    } catch (e) {
      notify((e as Error).message || 'Something went wrong', { type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const decide = (d: Decision, n?: string) =>
    run(
      d === 'approve' ? 'Approved — the member has been told and their 14-day trial has started' : d === 'reject' ? 'Rejected — deletion scheduled' : 'Change request sent',
      () => dataProvider.decide(id, d, n),
      'queue',
    );

  function submitDialog() {
    if (!dialog) return;
    if (dialog.required && !note.trim()) return;
    if (dialog.kind === 'suspend') return run('Member suspended', () => dataProvider.suspend(id, note.trim()));
    return decide(dialog.kind, note.trim());
  }

  const rejectedPhotos = record.photos.filter((ph) => ph.moderation_status === 'rejected').length;

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5">
            {p.display_name ?? '(no name)'}
            {ageFrom(p.birthdate) !== null ? `, ${ageFrom(p.birthdate)}` : ''}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5, alignItems: 'center' }}>
            <StatusChip status={status} />
            <Typography variant="body2" color="text.secondary">
              {record.email ?? 'no email (phone or social sign-in)'}
            </Typography>
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {status === 'pending_review' && (
            <>
              <Button variant="contained" color="success" startIcon={<CheckIcon />} disabled={busy} onClick={() => decide('approve')}>
                Approve
              </Button>
              <Button variant="outlined" startIcon={<EditNoteIcon />} disabled={busy} onClick={() => setDialog(NOTE_ACTIONS.request_changes)}>
                Ask for changes
              </Button>
              <Button variant="outlined" color="error" startIcon={<BlockIcon />} disabled={busy} onClick={() => setDialog(NOTE_ACTIONS.reject)}>
                Reject
              </Button>
            </>
          )}
          {status === 'approved' && (
            <Button variant="outlined" color="warning" startIcon={<PauseIcon />} disabled={busy} onClick={() => setDialog(NOTE_ACTIONS.suspend)}>
              Suspend
            </Button>
          )}
          {status === 'suspended' && (
            <Button variant="outlined" startIcon={<PlayIcon />} disabled={busy} onClick={() => run('Member reinstated', () => dataProvider.reinstate(id))}>
              Reinstate
            </Button>
          )}
          <Tooltip title="Delete this member from every system right now">
            <span>
              <Button color="error" startIcon={<DeleteForeverIcon />} disabled={busy} onClick={() => setConfirmPurge(true)}>
                Delete now
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {p.review_note && (
        <Alert severity={status === 'rejected' || status === 'suspended' ? 'error' : 'info'} sx={{ mb: 2 }}>
          Last note to member: {p.review_note}
        </Alert>
      )}
      {rejectedPhotos > 0 && status === 'pending_review' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {rejectedPhotos} photo{rejectedPhotos > 1 ? 's were' : ' was'} flagged by automatic moderation. Check them before approving.
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Photos ({record.photos.length})
              </Typography>
              {record.photos.length === 0 && <Typography color="text.secondary">No photos.</Typography>}
              <Grid container spacing={1.5}>
                {record.photos.map((ph) => (
                  <Grid key={ph.id} size={{ xs: 6, sm: 4 }}>
                    <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: 1, borderColor: ph.moderation_status === 'rejected' ? 'error.main' : 'divider' }}>
                      <a href={ph.url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ph.thumbUrl} alt="" style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', display: 'block', background: '#eee' }} />
                      </a>
                      <Stack direction="row" sx={{ px: 1, py: 0.5, bgcolor: 'background.paper', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Chip
                          size="small"
                          label={ph.moderation_status}
                          color={ph.moderation_status === 'approved' ? 'success' : ph.moderation_status === 'rejected' ? 'error' : 'default'}
                          variant="outlined"
                        />
                        <Box>
                          <Tooltip title="Photo is fine">
                            <IconButton size="small" onClick={() => run('Photo approved', () => dataProvider.moderatePhoto(ph.id, 'approved'))}>
                              <ThumbUpIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Hide this photo">
                            <IconButton size="small" onClick={() => run('Photo hidden', () => dataProvider.moderatePhoto(ph.id, 'rejected'))}>
                              <ThumbDownIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Stack>
                      {!!ph.moderation_score?.reasons?.length && (
                        <Typography variant="caption" color="error" sx={{ px: 1, pb: 0.5, display: 'block' }}>
                          {ph.moderation_score.reasons.join(', ')}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Details
              </Typography>
              <Row label="Gender" value={p.gender} />
              <Row label="Looking for" value={p.seeking?.join(', ')} />
              <Row label="Birthdate" value={p.birthdate} />
              <Row label="Age range" value={p.age_min && p.age_max ? `${p.age_min}–${p.age_max}` : null} />
              <Row label="Distance" value={p.max_distance_km ? `${p.max_distance_km} km` : null} />
              <Row label="City" value={p.city} />
              <Row label="Bio" value={p.bio} />
              <Row label="Cid" value={p.cid_persona} />
              <Row label="Joined" value={p.created_at ? new Date(p.created_at).toLocaleString() : null} />
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Answers
              </Typography>
              {PROFILE_QUESTIONS.map((q) => (
                <Row key={q.key} label={q.prompt} value={answerText(record.answers[q.key])} />
              ))}
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                History
              </Typography>
              {record.history.length === 0 && <Typography color="text.secondary">No decisions yet.</Typography>}
              {record.history.map((h, i) => (
                <Box key={i} sx={{ py: 0.75 }}>
                  <Typography variant="body2">
                    <strong>{(h.decision ?? h.action ?? '').replace('_', ' ')}</strong> · {new Date(h.created_at).toLocaleString()}
                  </Typography>
                  {h.note && (
                    <Typography variant="body2" color="text.secondary">
                      {h.note}
                    </Typography>
                  )}
                  {i < record.history.length - 1 && <Divider sx={{ mt: 0.75 }} />}
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={!!dialog} onClose={() => !busy && setDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>{dialog?.title}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>{dialog?.help}</DialogContentText>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Note to the member"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" color={dialog?.kind === 'request_changes' ? 'primary' : 'error'} disabled={busy || (dialog?.required && !note.trim())} onClick={submitDialog}>
            {dialog?.confirm}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmPurge} onClose={() => !busy && setConfirmPurge(false)}>
        <DialogTitle>Delete {p.display_name ?? 'this member'} everywhere now?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Removes their account, profile, photos, Cid history, matches and chats, email contact and analytics. Their matches lose the chat too. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmPurge(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={busy}
            onClick={() => {
              setConfirmPurge(false);
              void run('Member deleted from every system', () => dataProvider.purge(id), 'members');
            }}
          >
            Delete permanently
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export function MemberShow() {
  return (
    <Show title="Member" actions={false}>
      <ReviewPanel />
    </Show>
  );
}
