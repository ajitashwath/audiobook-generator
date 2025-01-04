export type Chapter = {
    id: string;
    title: string;
    content: string;
    audioUrl?: string;
    duration?: number;
    pageStart?: number;
    pageEnd?: number;
};
  
  export type UploadResponse = {
    message: string;
    success?: boolean;
    data?: {
      fileName?: string;
      fileSize?: number;
      fileType?: string;
      uploadedAt?: string;
      chapters?: Chapter[];
    };
    error?: string;
};
  
  export type FileStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';