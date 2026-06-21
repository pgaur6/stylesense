// cloudinary.js
//
// WHY THIS FILE EXISTS:
// GPT-4o Vision does not accept raw image file data — it can only analyse
// images it can fetch from a public URL on the internet. Cloudinary solves
// this: we upload the user's image here first, Cloudinary gives us back a
// permanent public URL (secure_url), and we pass that URL to GPT-4o Vision.
// This two-step pattern (upload → get URL → pass to AI) is used by every
// image-based feature in StyleSense: wardrobe tagging, outfit pairing,
// buy decision, outfit check, and find similar.
//
// WHY A BUFFER (not a file path)?
// multer is configured with memory storage, which means uploaded files are
// held in RAM as a Buffer object rather than written to disk. Cloudinary's
// upload_stream() method accepts a Buffer directly, so no temp file is needed.

const cloudinary = require('cloudinary').v2;

// Configure the Cloudinary SDK once using credentials from environment variables.
// These are set in backend/.env locally and in Railway's dashboard in production.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─────────────────────────────────────────────────────────────────────────────
// uploadImage
// Uploads a file Buffer to Cloudinary and returns the public image URL.
//
// Parameters:
//   fileBuffer   — the raw image data as a Node.js Buffer (from multer memory
//                  storage via req.file.buffer in the wardrobe route)
//   originalName — the original filename string (from req.file.originalname),
//                  used to build a readable public_id in Cloudinary
//
// Returns:
//   { url: string, publicId: string }
//   url       — the permanent HTTPS URL Cloudinary assigns the image
//   publicId  — Cloudinary's internal identifier (useful for deletion later)
//
// Why upload_stream instead of upload()?
//   cloudinary.uploader.upload() only accepts file paths on disk.
//   upload_stream() accepts a Buffer piped into it, which is what multer gives us.
//   We wrap it in a Promise so we can use async/await in the route that calls us.
// ─────────────────────────────────────────────────────────────────────────────
async function uploadImage(fileBuffer, originalName) {
  return new Promise((resolve, reject) => {

    // Strip the file extension from the name to use as the public_id base.
    // e.g. "my-shirt.jpg" becomes "my-shirt"
    const nameWithoutExtension = originalName.replace(/\.[^/.]+$/, '');

    // Prefix with a timestamp so filenames are always unique even if the
    // user uploads two images with the same name.
    const publicIdBase = `${Date.now()}-${nameWithoutExtension}`;

    // upload_stream returns a writable stream. We pass our options and a
    // callback that fires when the upload is complete (or has failed).
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder:        'stylesense-wardrobe', // all images land in this folder
        public_id:     publicIdBase,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          console.error('[cloudinary] Upload failed:', error.message);
          return reject(new Error('Image upload failed. Please try again.'));
        }

        resolve({
          url:      result.secure_url, // always HTTPS — required for GPT-4o Vision
          publicId: result.public_id,
        });
      }
    );

    // Pipe the Buffer into the upload stream to trigger the actual upload
    uploadStream.end(fileBuffer);
  });
}

module.exports = { uploadImage };