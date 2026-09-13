export type ContentMode = 'short' | 'long'

export interface ContentField {
  label: string
  value: string
  multiline?: boolean
}

export interface ContentSection {
  eyebrow: string
  title: string
  description: string
  fields: ContentField[]
}

export interface ContentModeData {
  label: string
  description: string
  formFields: ContentField[]
  sections: ContentSection[]
  actionLabel: string
}

// Frontend-only content examples. These values are intentionally static until generation is connected to a service.
export const contentGeneratorMockData: Record<ContentMode, ContentModeData> = {
  short: {
    label: 'YouTube Short', description: 'Build a concise, scroll-stopping video with the metadata YouTube Shorts needs.', actionLabel: 'Generate Short brief',
    formFields: [
      { label: 'Video idea', value: 'The 20-minute Sunday reset that makes Monday easier', multiline: true },
      { label: 'Audience', value: 'Busy professionals building better weekly systems' },
      { label: 'Target length', value: '45–60 seconds' },
      { label: 'Tone', value: 'Practical, confident, energizing' },
    ],
    sections: [{
      eyebrow: 'Shorts metadata', title: 'YouTube-ready details', description: 'The essentials for discovery, clarity, and a strong first impression.',
      fields: [
        { label: 'Working title', value: 'Reset Your Week in 20 Minutes #Shorts' },
        { label: 'Hook text', value: 'If Monday always feels chaotic, try this on Sunday.' },
        { label: 'Description', value: 'A quick weekly reset to clear your head and start Monday with momentum.', multiline: true },
        { label: 'Hashtags', value: '#Productivity #WeeklyReset #Shorts' },
        { label: 'Thumbnail text', value: 'RESET YOUR WEEK' },
        { label: 'Call to action', value: 'Save this for your next Sunday reset.' },
      ],
    }],
  },
  long: {
    label: 'Long-form video', description: 'Shape a complete long-form story with a durable outline and distribution plan.', actionLabel: 'Generate video brief',
    formFields: [
      { label: 'Video topic', value: 'A complete weekly reset system for busy professionals', multiline: true },
      { label: 'Audience', value: 'Professionals who want a calmer, more intentional week' },
      { label: 'Target length', value: '10–12 minutes' },
      { label: 'Format', value: 'Educational walkthrough' },
    ],
    sections: [
      {
        eyebrow: 'Long-form structure', title: 'Story and chapters', description: 'Give the video a clear arc that rewards viewers for staying to the end.',
        fields: [
          { label: 'Opening promise', value: 'A simple weekly system that turns scattered to-dos into a calm plan.' },
          { label: 'Chapter outline', value: '00:00 Why weeks feel chaotic\n01:12 Clear your mental inbox\n04:20 Plan your priorities\n08:10 Set up your Monday', multiline: true },
          { label: 'Key takeaway', value: 'A repeatable reset is more useful than a perfect plan.' },
          { label: 'End-screen call to action', value: 'Subscribe for practical systems that make life lighter.' },
        ],
      },
      {
        eyebrow: 'Distribution metadata', title: 'Publish everywhere', description: 'Leave space for the channel and platform details that accompany a long-form release.',
        fields: [
          { label: 'YouTube title', value: 'The Weekly Reset System That Makes Monday Easier' },
          { label: 'Description', value: 'A step-by-step weekly reset for planning priorities, protecting your time, and starting fresh.', multiline: true },
          { label: 'Search tags', value: 'weekly reset, productivity system, weekly planning' },
          { label: 'Distribution notes', value: 'Newsletter teaser, LinkedIn post, podcast clip, and chapters for the description.', multiline: true },
        ],
      },
    ],
  },
}
