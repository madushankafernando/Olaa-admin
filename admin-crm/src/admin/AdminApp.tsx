'use client';
import { Admin, Resource } from 'react-admin';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import PeopleIcon from '@mui/icons-material/PeopleOutlined';
import FavoriteIcon from '@mui/icons-material/HandshakeOutlined';
import FlagIcon from '@mui/icons-material/OutlinedFlag';
import { authProvider } from './authProvider';
import { dataProvider } from './dataProvider';
import { Dashboard } from './Dashboard';
import { MemberList, ReviewList } from './members/MemberList';
import { MemberShow } from './members/MemberShow';
import { MatchList } from './matches/MatchList';
import { ReportList } from './reports/ReportList';
import { theme } from './theme';

/** Hash routing (#/review, #/members/…) so the static export works on Cloudflare Pages with no rewrites. */
export default function AdminApp() {
  return (
    <Admin title="olaa admin" dataProvider={dataProvider} authProvider={authProvider} dashboard={Dashboard} theme={theme} requireAuth disableTelemetry>
      <Resource name="review" options={{ label: 'Review queue' }} list={ReviewList} show={MemberShow} icon={InboxIcon} />
      <Resource name="members" options={{ label: 'Members' }} list={MemberList} show={MemberShow} icon={PeopleIcon} recordRepresentation="display_name" />
      <Resource name="matches" options={{ label: 'Matches' }} list={MatchList} icon={FavoriteIcon} />
      <Resource name="reports" options={{ label: 'Reports' }} list={ReportList} icon={FlagIcon} />
    </Admin>
  );
}
