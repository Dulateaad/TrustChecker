import { NextRequest, NextResponse } from 'next/server';

const AWS_API_URL = 'https://q4lp4xk3q4.execute-api.us-east-1.amazonaws.com/v1/upload-url';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new NextResponse(JSON.stringify({ message: 'File not found' }), { status: 400 });
    }

    // 1. Get presigned URL from the existing backend
    const ext = file.name.slice(((file.name.lastIndexOf('.') - 1) >>> 0) + 2);
    const uploadUrlRes = await fetch(AWS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType: file.type, ext }),
    });

    if (!uploadUrlRes.ok) {
        const errorData = await uploadUrlRes.json();
        return new NextResponse(JSON.stringify({ message: 'Failed to get upload URL', ...errorData }), { status: uploadUrlRes.status });
    }
    const { uploadUrl, s3Key } = await uploadUrlRes.json();

    // 2. Upload file to S3 using the presigned URL from the server
    const fileBuffer = await file.arrayBuffer();
    const s3UploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': file.type,
        },
        body: fileBuffer,
    });

    if (!s3UploadRes.ok) {
        let errorBody = 'S3 upload error';
        try {
            errorBody = await s3UploadRes.text();
        } catch(e) {}
        return new NextResponse(JSON.stringify({ message: 'Failed to upload file to S3', error: errorBody }), { status: s3UploadRes.status });
    }

    // 3. Return the s3Key to the client so it can start the analysis
    return NextResponse.json({ s3Key });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error', error: errorMessage }), { status: 500 });
  }
}
