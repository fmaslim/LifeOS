import type { ContentFormat, ContentTemplate } from '../models/content'

/** Frontend-only templates used by MockContentService until generator integration is available. */
export const contentMockData: Record<ContentFormat, ContentTemplate> = {
  short: {
    title: 'A quick take on {topic}',
    body: 'Here is the one idea to remember: {topic} becomes easier when you start with a small, repeatable action. Try it today, then build from there.',
  },
  long: {
    title: 'A practical guide to {topic}',
    body: 'Start by defining what success looks like for {topic}. Then choose one manageable next step and make time to review what you learn. Consistent progress comes from simple systems that are easy to return to.',
  },
}
