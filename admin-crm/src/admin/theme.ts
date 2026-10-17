import { defaultTheme, type RaThemeOptions } from 'react-admin';

/** olaa brand (founder/brand.md): Ink, Linen, Apricot (shapes only, never text on light), Clay for buttons/links. */
export const brand = {
  ink: '#1F2A44',
  linen: '#FAF6F0',
  apricot: '#F2A971',
  clay: '#A8482A',
};

export const theme: RaThemeOptions = {
  ...defaultTheme,
  palette: {
    mode: 'light',
    primary: { main: brand.ink, contrastText: '#FFFFFF' },
    secondary: { main: brand.clay, contrastText: '#FFFFFF' },
    background: { default: brand.linen, paper: '#FFFFFF' },
    text: { primary: brand.ink },
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
    h4: { fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600 },
    h5: { fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600 },
    h6: { fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    ...defaultTheme.components,
    MuiAppBar: { styleOverrides: { root: { backgroundColor: brand.ink } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
  },
};

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Drafting',
  pending_review: 'Waiting for review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

export const STATUS_COLOR: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  draft: 'default',
  pending_review: 'warning',
  changes_requested: 'info',
  approved: 'success',
  rejected: 'error',
  suspended: 'error',
};
