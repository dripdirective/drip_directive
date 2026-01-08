## `uploads/`

This directory is used at runtime for user uploads and generated images.

- It is **not committed** to git (except for this README and `.gitkeep`).
- In production, mount it as a persistent volume (or store in S3 and serve via CDN).

Expected subdirectories (created automatically on startup):

- `uploads/user_images/`
- `uploads/wardrobe_images/`
- `uploads/generated/`
- `uploads/tryon_images/`


