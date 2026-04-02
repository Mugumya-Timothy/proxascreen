import SidebarShell, {
  IconDashboard,
  IconPatients,
  IconClinicians,
  IconAddPatient,
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
  {
    label: 'Clinicians',
    to:    '/clinicians',
    icon:  <IconClinicians />,
  },
  {
    label: 'Add Patient',
    to:    '/patients/new',
    icon:  <IconAddPatient />,
  },
]

export default function AdminLayout() {
  return <SidebarShell navItems={NAV_ITEMS} />
}
