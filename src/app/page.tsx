'use client';

import FileUpload from './components/FileUpload';
import { UploadResponse } from './types';

type FileUploadProps = {
    onUploadSuccess?: (data: UploadResponse) => void;
    onUploadError?: (error: string) => void;
}

export default function Home() {

  const handleUploadSuccess = (data: UploadResponse) => {
    console.log('Upload successful: ', data);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload failed: ', error);
  };

  return (
    <main className = "container mx-auto py-10">
      <h1 className = "text-3xl font-bold text-center mb-8">Book Audio Speech</h1>
      <FileUpload
        onUploadSuccess={handleUploadSuccess}
        onUploadError={handleUploadError}
      />
    </main>
  );
}