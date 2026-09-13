import type { ContentGenerationResult } from '../models/content'

// Frontend-only generation output. Replace this module with an API-backed data source when the content service is available.
export const contentGenerationMockData: ContentGenerationResult = {
  title: 'The 15-Minute Sunday Reset That Makes Monday Easier',
  script: [
    'If Monday mornings feel like you are already behind, try this 15-minute Sunday reset.',
    'Start with a quick brain dump. Write down every task, errand, and loose thought competing for your attention.',
    'Next, choose your three non-negotiables for the week. Keep them small enough that you can actually protect time for them.',
    'Then spend five minutes preparing tomorrow: set out what you need, check your calendar, and decide your first task.',
    'You do not need a perfect plan. You just need a calm starting point. Save this for your next Sunday reset.',
  ],
  description: 'A simple Sunday reset can turn a reactive Monday into a focused one. In 15 minutes, clear the mental clutter, choose what matters, and set up your first win for the week.\n\nWhat is one thing you do on Sunday that makes your Monday better?',
  tags: ['sunday reset', 'weekly planning', 'productivity', 'intentional living', 'life organization', 'monday motivation'],
  pinnedComment: 'What is one small thing you can prepare today to make tomorrow easier? Share it below so we can borrow each other\'s ideas.',
  thumbnailPrompt: 'Clean, high-contrast YouTube thumbnail: a calm person at a sunlit desk on Sunday evening, open planner, cup of coffee, and a short checklist. Bold readable text says “15-MIN RESET”. Warm cream, charcoal, and lavender palette; modern productivity aesthetic; uncluttered composition.',
}
