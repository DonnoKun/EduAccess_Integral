# Architecture rules
- Group lesson edits are stored in owner-only lesson_drafts; publishing copies a draft into group_lessons so students never see unfinished edits.
- Pin each student's first published lesson snapshot in lesson_progress and preserve it on updates; exercise answers and scores must remain tied to the material they started.
- Use shared browser speech voice selection for setup, tutorials and lessons to prefer natural language-matched device voices without paid AI calls.
- Keep setup media samples as reusable static assets so previews do not generate AI content per user.
- Show saved exercise-based lesson progress separately from each audio block's playback percentage, preserving explicit completion on revisit.
- Translate original structured lesson content rather than regenerating a topic; validate structure and preserve source URLs and image prompts to prevent changed exercises and unnecessary image generation.