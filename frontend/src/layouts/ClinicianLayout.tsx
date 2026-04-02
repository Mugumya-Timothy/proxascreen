import SidebarShell, {
  IconDashboard,
  IconPatients,
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
    label: 'Add Patient',
    to:    '/patients/new',
    icon:  <IconAddPatient />,
  },
]

export default function ClinicianLayout() {
  return <SidebarShell navItems={NAV_ITEMS} />
}
