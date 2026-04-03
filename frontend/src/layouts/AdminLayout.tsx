import SidebarShell, {
  IconDashboard,
  IconPatients,
  IconClinicians,
} from './_SidebarShell'
import type { NavItem } from './_SidebarShell'

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    to:    '/admin/dashboard',
    icon:  <IconDashboard />,
  },
  {
    label: 'Patients',
    to:    '/admin/patients',
    icon:  <IconPatients />,
  },
  {
    label: 'Clinicians',
    to:    '/admin/clinicians',
    icon:  <IconClinicians />,
  },
]

export default function AdminLayout() {
  return <SidebarShell navItems={NAV_ITEMS} />
}
