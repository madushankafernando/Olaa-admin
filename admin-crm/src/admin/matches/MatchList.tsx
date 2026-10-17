import { Chip } from '@mui/material';
import { Datagrid, DateField, FunctionField, Link, List } from 'react-admin';

type Person = { id: string; name: string };
type MatchRow = { id: string; userA: Person; userB: Person; chatStatus: string | null; lastMessageAt: string | null; createdAt: string };

const PersonLink = ({ p }: { p: Person }) => <Link to={`/members/${p.id}/show`}>{p.name}</Link>;

export function MatchList() {
  return (
    <List title="Matches" perPage={25} sort={{ field: 'createdAt', order: 'DESC' }}>
      <Datagrid bulkActionButtons={false} rowClick={false}>
        <FunctionField label="Member" render={(r: MatchRow) => <PersonLink p={r.userA} />} />
        <FunctionField label="Matched with" render={(r: MatchRow) => <PersonLink p={r.userB} />} />
        <FunctionField
          label="Chat"
          render={(r: MatchRow) => (r.chatStatus ? <Chip size="small" variant="outlined" label={r.chatStatus} color={r.chatStatus === 'open' ? 'success' : 'default'} /> : '—')}
        />
        <DateField source="lastMessageAt" label="Last message" showTime emptyText="no messages yet" sortable={false} />
        <DateField source="createdAt" label="Matched" showTime sortable={false} />
      </Datagrid>
    </List>
  );
}
