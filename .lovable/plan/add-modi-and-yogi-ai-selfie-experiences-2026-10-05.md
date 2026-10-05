# Add Modi and Yogi AI selfie experiences

## What will change
- Prepare the uploaded Modi and Yogi photos as clean character assets and add both to the AI Person library.
- Add database-controlled selfie poses: side-by-side, handshake, hand on shoulder, and side pose.
- Let customers choose a photo style together with a person and pose, using the existing admin-controlled effects library.
- Use the same person, pose, and style controls for both a live-camera capture and an uploaded photo.
- Improve the on-camera guide so the selected person and pose are previewed before generation, while keeping the final output clearly labeled as AI-generated.

## Technical details
- Store character images on the app asset CDN and save their URLs and identity-preservation prompts in the existing character catalog.
- Add an `ai_person_poses` catalog with authenticated read access and admin-only management; resolve all pose prompts on the server.
- Extend `/api/edit-image` to combine the selected character, pose, and optional effect prompt without exposing prompts in the browser.
- Update generated database types, the Studio controls, and request fields; preserve the current streaming generation and gallery-save flow.
- Verify the database access rules, build status, and the signed-in Studio flow at desktop and mobile widths.
