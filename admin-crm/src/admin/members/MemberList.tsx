import {
  Datagrid,
  DateField,
  FunctionField,
  List,
  NumberField,
  SearchInput,
  SelectInput,
  TextField,
  TopToolbar,
  ExportButton,
} from 'react-admin';
import { Typography } from '@mui/material';
import { AgeField, StatusChip } from './StatusChip';
import { STATUS_LABEL } from '../theme';

const statusChoices = Object.entries(STATUS_LABEL).map(([id, name]) => ({ id, name }));

const memberFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Name, email, phone or city" />,
  <SelectInput key="status" source="status" choices={statusChoices} label="Status" alwaysOn emptyText="All" />,
];

const planLabel = (r: { plan?: string; trial_ends_at?: string | null; current_period_end?: string | null }) => {
  const now = Date.now();
  if (r.plan && r.plan !== 'free' && r.plan !== 'trial' && r.current_period_end && new Date(r.current_period_end).getTime() > now) return r.plan;
  if (r.trial_ends_at && new Date(r.trial_ends_at).getTime() > now) return 'trial';
  return 'free';
};

/** Everyone, with status filter. */
export function MemberList() {
  return (
    <List filters={memberFilters} sort={{ field: 'created_at', order: 'DESC' }} perPage={25} actions={<TopToolbar><ExportButton /></TopToolbar>}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <TextField source="display_name" label="Name" emptyText="(no name yet)" />
        <TextField source="email" emptyText="—" sortable={false} />
        <TextField source="phone" emptyText="—" sortable={false} />
        <TextField source="provider" label="Sign-in" sortable={false} />
        <StatusChip label="Status" />
        <TextField source="gender" sortable={false} emptyText="—" />
        <AgeField label="Age" />
        <TextField source="city" sortable={false} emptyText="—" />
        <FunctionField label="Plan" sortable={false} render={planLabel} />
        <TextField source="cid_persona" label="Cid" sortable={false} emptyText="—" />
        <DateField source="created_at" label="Joined" />
      </Datagrid>
    </List>
  );
}

/** Oldest first, so nobody waits too long. */
export function ReviewList() {
  return (
    <List
      sort={{ field: 'submitted_at', order: 'ASC' }}
      filters={[<SearchInput key="q" source="q" alwaysOn placeholder="Search" />]}
      title="Review queue"
      empty={
        <Typography sx={{ p: 4 }} color="text.secondary">
          Nothing waiting for review. Nice work.
        </Typography>
      }
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <TextField source="display_name" label="Name" sortable={false} />
        <TextField source="email" emptyText="—" sortable={false} />
        <TextField source="phone" emptyText="—" sortable={false} />
        <TextField source="gender" sortable={false} />
        <AgeField label="Age" />
        <TextField source="city" sortable={false} />
        <NumberField source="photo_count" label="Photos" sortable={false} />
        <DateField source="submitted_at" label="Submitted" showTime sortable={false} />
      </Datagrid>
    </List>
  );
}
