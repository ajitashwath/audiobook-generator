export type UploadResponse = {
    message: string;
    data?: {
        fileName: string;
        fileSize: number;
        fileType: string;
        uploadedAt: string;
        chapters?: Chapter[];
    };
    error?: string;
};

export type Chapter = {
    id: string;
    title: string;
    content: string;
    audioUrl?: string;
    duration?: number;
    pageStart?: number;
    pageENd?: number;
};

export type FileStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
export type FileMetaData = {
    name: string;
    size: number;
    type: string;
    lastModified: number;
};