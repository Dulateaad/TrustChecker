# **App Name**: TrustCheck UI

## Core Features:

- Text Analysis: Accept text input, send it to the AWS backend for analysis via the /v1/analyze/text endpoint, and display the risk score, summary, red flags, actions, and safe reply.
- Link Analysis: Accept URL input, send it to the AWS backend for analysis via the /v1/analyze/link endpoint, and display the risk score, summary, red flags, actions, safe reply, URL diagnostics, and additional URL flags.
- Image Analysis (OCR): Accept image uploads, request a presigned URL from /v1/upload-url, upload the image to S3, trigger analysis via the /v1/analyze/image endpoint, and display the risk assessment results, including extracted text using OCR via Rekognition.
- Document/PDF Analysis (OCR): Accept document uploads, request a presigned URL from /v1/upload-url, upload the document to S3, trigger analysis via the /v1/analyze/document endpoint, and display the risk assessment results, including extracted text using OCR via Textract. Handle processing status (202 responses).
- Audio Analysis: Accept audio uploads, request a presigned URL from /v1/upload-url, upload the audio to S3, trigger analysis via the /v1/analyze/audio endpoint, and display the risk assessment results, including the transcript and language code. Handle processing status (202 responses) with polling.
- Safe Reply Generation: Provide a tool that allows the user to formulate a safe reply based on the analysis results from the backend.

## Style Guidelines:

- Primary color: Dark slate blue (#374151), conveying trust and authority.
- Background color: Light gray (#F9FAFB), offering a clean and modern feel.
- Accent color: Teal (#489FB5), used sparingly to highlight important information and CTAs.
- Body text: 'Inter' sans-serif font for clear and modern readability.
- Headline text: 'Space Grotesk' sans-serif font, offering a clean yet prominent presentation.
- Use simple, outlined icons to represent different file types and actions. Icons should be consistent and easily recognizable.
- Employ a tabbed interface on the left for navigation (Text, Link, Image, Document, Audio). The main content area on the right should display input forms/drag & drop zones and analysis results.