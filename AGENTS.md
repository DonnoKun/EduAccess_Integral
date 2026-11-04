# Architecture rules
- Group lesson edits are stored in owner-only lesson_drafts; publishing copies a draft into group_lessons so students never see unfinished edits.
- Pin each student's first published lesson snapshot in lesson_progress and preserve it on updates; exercise answers and scores must remain tied to the material they started.
- Await device voice readiness through shared browser speech selection for setup, tutorials and lessons so both roles prefer the same natural language-matched voices without paid AI calls.
- Keep setup media samples as static files in public/media (not CDN asset pointers) so they load on every host without generating AI content per user.
- Onboarding owns global preview styles until unmount, then restores the saved profile; background profile application must not overwrite an active preview.
- Show saved exercise-based lesson progress separately from each audio block's playback percentage, preserving explicit completion on revisit.
- Translate original structured lesson content rather than regenerating a topic; validate structure and preserve source URLs and image prompts to prevent changed exercises and unnecessary image generation.
- Manual lesson players remain available independently of automatic TTS preference; shared Button markers scale control dimensions and icons with profile text across roles.