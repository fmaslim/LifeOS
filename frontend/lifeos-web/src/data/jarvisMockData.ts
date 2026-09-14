import type { JarvisData } from '../models/jarvis'

// Frontend-only source of truth for the Jarvis placeholder dashboard.
export const jarvisMockData: JarvisData = {
  connection: 'connected',
  providerName: 'LinLoop Reach',
  fetchedAt: new Date().toISOString(),
  status: 'Running',
  statusDetail: 'Prospecting across your saved audiences',
  lastRun: 'Today, 9:42 AM',
  nextRun: 'Today, 2:00 PM',
  metrics: [
    { label: 'Prospects found', value: '146', detail: '+24 this week', icon: 'users', tone: 'violet' },
    { label: 'Qualified prospects', value: '28', detail: '+6 discovered today', icon: 'users', tone: 'amber' },
    { label: 'Outreach queue', value: '12', detail: '8 scheduled today', icon: 'send', tone: 'violet' },
    { label: 'Replies', value: '7', detail: '18.4% reply rate', icon: 'mail', tone: 'green' },
    { label: 'Link clicks', value: '19', detail: '23.8% click rate', icon: 'chart', tone: 'blue' },
    { label: 'Emails sent', value: '38', detail: '12 queued next', icon: 'send', tone: 'amber' },
    { label: 'Signups', value: '5', detail: '13.2% conversion', icon: 'chart', tone: 'green' },
  ],
  qualifiedProspects: [
    { initials: 'AM', name: 'Avery Mitchell', company: 'Northstar Studio', role: 'Founder', score: 94, scoreLabel: 'Excellent fit' },
    { initials: 'JR', name: 'Jordan Rivera', company: 'Kinetic Labs', role: 'Head of Growth', score: 89, scoreLabel: 'Strong fit' },
    { initials: 'SK', name: 'Samira Khan', company: 'Meridian Works', role: 'Operations Director', score: 86, scoreLabel: 'Strong fit' },
  ],
  outreachQueue: [
    { initials: 'DO', name: 'Devon Ortiz', company: 'Aperture Collective', status: 'Personalized', scheduledFor: '10:30 AM' },
    { initials: 'LC', name: 'Lena Chen', company: 'BrightPath', status: 'Ready to review', scheduledFor: '11:15 AM' },
    { initials: 'MH', name: 'Marcus Hall', company: 'Civicline', status: 'Scheduled', scheduledFor: '1:00 PM' },
  ],
  activity: [
    { title: 'Added 6 qualified prospects', detail: 'Matched against your ideal customer profile', time: '9:42 AM', tone: 'amber' },
    { title: 'Prepared 4 personalized messages', detail: 'Saved to the outreach queue for review', time: '9:31 AM', tone: 'violet' },
    { title: 'New reply from Maya Patel', detail: 'Marked as interested and ready to follow up', time: 'Yesterday', tone: 'green' },
    { title: 'Audience research refreshed', detail: 'Technology and professional-services segments updated', time: 'Yesterday', tone: 'blue' },
  ],
}
