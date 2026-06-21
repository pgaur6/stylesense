'use client';

// ImageUpload.jsx
// Reusable image upload zone used across the wardrobe and feature pages.
// Supports click-to-select AND drag-and-drop.
//
// Props:
//   onUpload(imageUrl) — called with the Cloudinary URL after a successful upload
//   hint               — string shown in the upload zone e.g. "Upload a garment photo"
//   loading            — external boolean; shows spinner when true (e.g. parent is busy)
//
// CRITICAL — no <form> tag. The hidden <input> is triggered via a ref.
// CRITICAL — do NOT set Content-Type manually on the fetch. The browser must
//            set it automatically so the multipart boundary is correct.

import { useState, useRef } from 'react';
import { getSessionId } from '../utils/session';
import LoadingState from './LoadingState';
import ErrorMessage from './ErrorMessage';

export default function ImageUpload({ onUpload, hint, loading: externalLoading }) {

  // preview: local object URL shown immediately when a file is chosen
  const [preview, setPreview]     = useState(null);
  // uploading: true while the file is being sent to the backend
  const [uploading, setUploading] = useState(false);
  // error: shown below the zone if the upload fails
  const [error, setError]         = useState(null);
  // isDragging: true while a file is being dragged over the zone
  const [isDragging, setIsDragging] = useState(false);

  // ref to the hidden file input — clicked programmatically when zone is tapped
  const inputRef = useRef(null);

  // Either the internal upload or an external loading state shows the spinner
  const isLoading = uploading || externalLoading;

  // Core upload function — called by both click-to-select and drag-and-drop paths
  async function handleFile(file) {
    if (!file) return;

    // Reject non-image files immediately
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, HEIC, etc.)');
      return;
    }

    // Show a local preview instantly — before the upload completes
    // URL.createObjectURL creates a temporary URL from the local file
    setPreview(URL.createObjectURL(file));
    setError(null);
    setUploading(true);

    try {
      const sessionId = getSessionId();
      const apiUrl    = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // Build a FormData object — required for multipart/form-data uploads
      // Do NOT JSON.stringify — the backend expects a real file, not a string
      const formData = new FormData();
      formData.append('image',     file);
      formData.append('sessionId', sessionId);

      // IMPORTANT: no Content-Type header set here.
      // The browser automatically adds: Content-Type: multipart/form-data; boundary=...
      // If you set it manually you will break the boundary and multer will not parse the file.
      const response = await fetch(`${apiUrl}/api/wardrobe/upload`, {
        method: 'POST',
        body:   formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Upload failed. Please try again.');
      }

      // Reset the zone so the user can upload another item
      setPreview(null);

      // Notify the parent page with the permanent Cloudinary URL
      onUpload(data.item.image_url);

    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
      setPreview(null);
    } finally {
      setUploading(false);
      // Reset the input value so the same file can be re-selected if needed
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  // Triggered when the user picks a file via the file picker dialog
  function handleInputChange(e) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  // Triggered when a dragged file is released over the zone
  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  // Triggered while a file is being dragged over the zone
  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  // Triggered when a dragged file leaves the zone without being dropped
  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  return (
    <div className="space-y-3">

      {/* Hidden file input — triggered programmatically by clicking the zone */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Upload zone */}
      <div
        onClick={() => !isLoading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative rounded-xl border-2 border-dashed overflow-hidden transition-colors duration-150 ${
          isLoading
            ? 'cursor-default border-stroke bg-surface'
            : isDragging
            ? 'cursor-pointer border-accent bg-accent-pale'
            : 'cursor-pointer border-stroke bg-surface hover:border-accent hover:bg-accent-pale'
        }`}
        style={{ minHeight: '220px' }}
      >

        {/* ── Loading state ── */}
        {isLoading && (
          <div
            className="flex items-center justify-center"
            style={{ minHeight: '220px' }}
          >
            <LoadingState message="Tagging your item..." />
          </div>
        )}

        {/* ── Preview state — image selected, not yet uploaded ── */}
        {!isLoading && preview && (
          <img
            src={preview}
            alt="Preview"
            className="w-full object-cover"
            style={{ minHeight: '220px', maxHeight: '360px' }}
          />
        )}

        {/* ── Default state — no file selected ── */}
        {!isLoading && !preview && (
          <div
            className="flex flex-col items-center justify-center gap-3 px-6 py-10"
            style={{ minHeight: '220px' }}
          >
            {/* Upload cloud icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-10 w-10 transition-colors duration-150 ${
                isDragging ? 'text-accent' : 'text-dust'
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            </svg>

            {/* Hint prop — context-specific text from the parent */}
            {hint && (
              <p className={`font-body text-sm text-center max-w-xs transition-colors duration-150 ${
                isDragging ? 'text-accent' : 'text-dust'
              }`}>
                {hint}
              </p>
            )}

            {/* Static sub-label */}
            <p className="font-body text-xs text-dust">
              Click to browse, or drag and drop
            </p>
          </div>
        )}

      </div>

      {/* Error message — shown below the zone on failure */}
      {error && <ErrorMessage message={error} />}

    </div>
  );
}