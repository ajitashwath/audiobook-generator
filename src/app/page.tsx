'use client';

import {useState} from 'react';
import FileUpload, {AudioPlayer} from './components/FileUpload';
import {UploadResponse, Chapter, FileStatus} from './types';

export default function Home() {
  const [fileStatus, setFileStatus] = useState<FileStatus>('idle');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleUploadSuccess = (data: UploadResponse) => {
    console.log('Upload successful:', data);
    if (data.data?.chapters) {
      setChapters(data.data.chapters);
      setFileStatus('completed');
    } else {
      setFileStatus('processing');
    }
  };

  const handleUploadError = (error: string) => {
    console.error('Upload failed:', error);
    setError(error);
    setFileStatus('error');
  };

  const handleReset = () => {
    setChapters([]);
    setFileStatus('idle');
    setError(null);
  };

  return (
    <div className = "container mx-auto py-10">
      <h1 className = "text-3xl font-bold text-center mb-8">
        AudioBook Generator
      </h1>
      
      {fileStatus === 'idle' || fileStatus === 'error' ? (
        <>
          <FileUpload 
            onUploadSuccess = {handleUploadSuccess}
            onUploadError = {handleUploadError}
          />
          {error && (
            <div className = "mt-4 text-red-600 text-center">
              {error}
            </div>
          )}
        </>
      ) : fileStatus === 'uploading' || fileStatus === 'processing' ? (
        <div className = "text-center py-10">
          <p className = "text-xl">Processing your audiobook...</p>
          <p className = "text-gray-500 mt-2">This may take a few minutes depending on the size of your book.</p>
        </div>
      ) : (
        <AudioPlayer chapters={chapters} onReset={handleReset} />
      )}
    </div>
  );
}