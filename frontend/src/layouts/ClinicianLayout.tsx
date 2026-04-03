import SidebarShell, {
  IconDashboard,
  IconPatients,
} from './_SidebarShell'
import type { NavItem } from './_SidebarShell'

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    to:    '/dashboard',
    icon:  <IconDashboard />,
  },
  {
    label: 'Patients',
    to:    '/patients',
    icon:  <IconPatients />,
  },
]

export default function ClinicianLayout() {
  return <SidebarShell navItems={NAV_ITEMS} />
}
