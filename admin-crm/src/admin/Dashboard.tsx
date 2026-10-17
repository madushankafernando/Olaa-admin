'use client';
import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Grid, Typography } from '@mui/material';
import { Title, useDataProvider, useRedirect } from 'react-admin';
import type { OlaaDataProvider } from './dataProvider';

const TILES: { key: string; label: string; hint: string }[] = [
  { key: 'pending_review', label: 'Waiting for review', hint: 'Profiles submitted and not yet decided' },
  { key: 'changes_requested', label: 'Changes requested', hint: 'Waiting on the member to fix and resubmit' },
  { key: 'approved_members', label: 'Approved members', hint: 'Inside the app' },
  { key: 'paying_members', label: 'Paying members', hint: 'Weekly, monthly or 3-month plan, active now' },
  { key: 'matches_7d', label: 'Matches this week', hint: 'Mutual likes in the last 7 days' },
  { key: 'total_matches', label: 'Matches all-time', hint: 'Every mutual like so far' },
];

export function Dashboard() {
  const dataProvider = useDataProvider<OlaaDataProvider>();
  const redirect = useRedirect();
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dataProvider.stats().then(setStats, (e: Error) => setError(e.message));
  }, [dataProvider]);

  const pending = Number(stats?.pending_review ?? 0);

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Title title="olaa admin" />
      <Typography variant="h4" gutterBottom>
        Today
      </Typography>
      {error && <Alert severity="error">Couldn&apos;t load numbers: {error}</Alert>}
      {pending > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => redirect('list', 'review')}>
              Open queue
            </Button>
          }
        >
          {pending} profile{pending === 1 ? ' is' : 's are'} waiting for review.
        </Alert>
      )}
      <Grid container spacing={2}>
        {TILES.map((t) => (
          <Grid key={t.key} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {t.label}
                </Typography>
                <Typography variant="h4" sx={{ my: 0.5 }}>
                  {stats ? Number(stats[t.key] ?? 0).toLocaleString() : '…'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t.hint}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
