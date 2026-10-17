import { Datagrid, DateField, FunctionField, Link, List, TextField } from 'react-admin';
import { StatusChip } from '../members/StatusChip';

type ReportRow = { id: string; reporterId: string; reporterName: string; reportedId: string; reportedName: string; reportedStatus: string | null; reason: string; createdAt: string };

/** Members reported from a chat (they blocked someone and gave a reason). Open the reported member to suspend them. */
export function ReportList() {
  return (
    <List title="Reports" perPage={25}>
      <Datagrid bulkActionButtons={false} rowClick={false}>
        <FunctionField label="Reported member" render={(r: ReportRow) => <Link to={`/members/${r.reportedId}/show`}>{r.reportedName}</Link>} />
        <FunctionField label="Their status" render={(r: ReportRow) => (r.reportedStatus ? <StatusChip status={r.reportedStatus} /> : '—')} />
        <TextField source="reason" sortable={false} />
        <FunctionField label="Reported by" render={(r: ReportRow) => <Link to={`/members/${r.reporterId}/show`}>{r.reporterName}</Link>} />
        <DateField source="createdAt" label="When" showTime sortable={false} />
      </Datagrid>
    </List>
  );
}
