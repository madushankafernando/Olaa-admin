'use client';
import { Admin, Resource } from 'react-admin';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import PeopleIcon from '@mui/icons-material/PeopleOutlined';
import FavoriteIcon from '@mui/icons-material/HandshakeOutlined';
import FlagIcon from '@mui/icons-material/OutlinedFlag';
import PlansIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import PromoIcon from '@mui/icons-material/LocalOfferOutlined';
import CampaignIcon from '@mui/icons-material/CampaignOutlined';
import NotificationsIcon from '@mui/icons-material/NotificationsActiveOutlined';
import BoostIcon from '@mui/icons-material/RocketLaunchOutlined';
import { HashRouter } from 'react-router-dom';
import { authProvider } from './authProvider';
import { dataProvider } from './dataProvider';
import { Dashboard } from './Dashboard';
import { MemberList, ReviewList } from './members/MemberList';
import { MemberShow } from './members/MemberShow';
import { MatchList } from './matches/MatchList';
import { BroadcastCreate, BroadcastEdit, BroadcastList, BroadcastShow } from './notifications/Broadcasts';
import { ReportList } from './reports/ReportList';
import { BoostPackEdit, BoostPackList } from './subscriptions/BoostPacks';
import { CampaignCreate, CampaignEdit, CampaignList } from './subscriptions/Campaigns';
import { PlanEdit, PlanList } from './subscriptions/Plans';
import { PromoCodeCreate, PromoCodeEdit, PromoCodeList } from './subscriptions/PromoCodes';
import { theme } from './theme';

/**
 * Hash routing (#/review, #/members/…) so the static export works on any static host with no rewrites.
 *
 * We supply the router ourselves with transitions off. React Router 7 applies location changes inside
 * startTransition by default; with `requireAuth`, react-admin's logout clears the query cache right after
 * navigating to #/login, the cleared auth check re-renders the routes while the location is still "/", and
 * it logs out again — an endless redirect loop and a blank page.
 */
export default function AdminApp() {
  return (
    <HashRouter useTransitions={false}>
      <Admin title="olaa admin" dataProvider={dataProvider} authProvider={authProvider} dashboard={Dashboard} theme={theme} requireAuth disableTelemetry>
        <Resource name="review" options={{ label: 'Review queue' }} list={ReviewList} show={MemberShow} icon={InboxIcon} />
        <Resource name="members" options={{ label: 'Members' }} list={MemberList} show={MemberShow} icon={PeopleIcon} recordRepresentation="display_name" />
        <Resource name="matches" options={{ label: 'Matches' }} list={MatchList} icon={FavoriteIcon} />
        <Resource name="reports" options={{ label: 'Reports' }} list={ReportList} icon={FlagIcon} />
        <Resource name="plans" options={{ label: 'Plans' }} list={PlanList} edit={PlanEdit} icon={PlansIcon} recordRepresentation="label" />
        <Resource name="boost-packs" options={{ label: 'Boost packs' }} list={BoostPackList} edit={BoostPackEdit} icon={BoostIcon} recordRepresentation="label" />
        <Resource name="promo-codes" options={{ label: 'Promo codes' }} list={PromoCodeList} create={PromoCodeCreate} edit={PromoCodeEdit} icon={PromoIcon} recordRepresentation="code" />
        <Resource name="campaigns" options={{ label: 'Campaigns' }} list={CampaignList} create={CampaignCreate} edit={CampaignEdit} icon={CampaignIcon} recordRepresentation="name" />
        <Resource name="broadcasts" options={{ label: 'Push notifications' }} list={BroadcastList} create={BroadcastCreate} edit={BroadcastEdit} show={BroadcastShow} icon={NotificationsIcon} recordRepresentation="title" />
      </Admin>
    </HashRouter>
  );
}
