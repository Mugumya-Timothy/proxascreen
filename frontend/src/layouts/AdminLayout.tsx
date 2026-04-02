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
  {
    label: 'Add Patient',
    to:    '/admin/patients/new',
    icon:  <IconAddPatient />,
  },
]

export default function AdminLayout() {
  return <SidebarShell navItems={NAV_ITEMS} />
}
