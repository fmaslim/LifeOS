import type { HomeData } from '../models/home'

// Centralized frontend-only property data. It intentionally has no external integrations.
export const homeMockData: HomeData = {
  propertyName: 'Cedar House',
  propertyDetail: 'Primary residence · Brooklyn, NY',
  periodLabel: 'Household snapshot · September 2026',
  metrics: [
    { label: 'Occupancy', value: '3 / 4', detail: 'One guest room available', icon: 'users', tone: 'green' },
    { label: 'Rent collected', value: '$2,150', detail: 'Due again Oct 1', icon: 'wallet', tone: 'violet' },
    { label: 'Mortgage', value: '$3,240', detail: 'Scheduled Sep 18', icon: 'home', tone: 'blue' },
    { label: 'Utilities', value: '$284', detail: '$36 below monthly plan', icon: 'bolt', tone: 'teal' },
    { label: 'Maintenance', value: '2 open', detail: 'One needs attention', icon: 'alert', tone: 'amber' },
  ],
  occupancy: [
    { id: 'primary', name: 'Primary suite', occupant: 'Frank & Maya', detail: 'Home base · private', status: 'Private', tone: 'violet' },
    { id: 'room-one', name: 'Garden room', occupant: 'Noah Williams', detail: 'Lease through Jan 2027', status: 'Occupied', tone: 'green' },
    { id: 'room-two', name: 'Studio room', occupant: 'Olivia Martin', detail: 'Lease through Aug 2027', status: 'Occupied', tone: 'green' },
    { id: 'guest', name: 'Guest room', occupant: 'Ready for next stay', detail: 'Cleaned Sep 10', status: 'Available', tone: 'blue' },
  ],
  systems: [
    { id: 'hvac', name: 'HVAC', detail: '72°F · Filter replacement due Oct 3', status: 'Attention', icon: 'home', tone: 'amber' },
    { id: 'electrical', name: 'Electrical', detail: 'Panel and circuits operating normally', status: 'Healthy', icon: 'bolt', tone: 'green' },
    { id: 'smart-home', name: 'Internet & smart home', detail: '1.2 Gbps · 18 devices online', status: 'Healthy', icon: 'settings', tone: 'teal' },
    { id: 'appliances', name: 'Appliances', detail: 'Washer service visit booked for Sep 16', status: 'Attention', icon: 'files', tone: 'amber' },
  ],
  projects: [
    { id: 'washer', title: 'Washer diagnostic visit', detail: 'Confirm access window with tenant', due: 'Sep 16 · 10:00 AM', priority: 'This week', icon: 'alert', tone: 'amber' },
    { id: 'gutter', title: 'Schedule fall gutter cleaning', detail: 'Request two vendor estimates', due: 'Sep 22', priority: 'Scheduled', icon: 'home', tone: 'blue' },
    { id: 'filter', title: 'Replace HVAC filters', detail: 'Order 20 × 25 × 1 filters', due: 'Oct 3', priority: 'Scheduled', icon: 'settings', tone: 'teal' },
  ],
  activity: [
    { id: 'rent', title: 'September rent received', description: 'Olivia’s payment was recorded in the household ledger.', time: 'Today · 9:14 AM', icon: 'wallet', tone: 'green' },
    { id: 'internet', title: 'Internet health check passed', description: 'Mesh network and smart-home hub are online.', time: 'Yesterday · 6:42 PM', icon: 'settings', tone: 'teal' },
    { id: 'request', title: 'Maintenance request updated', description: 'Washer vibration report was assigned to the service visit.', time: 'Sep 11', icon: 'alert', tone: 'amber' },
  ],
}
