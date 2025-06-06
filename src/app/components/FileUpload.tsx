import {useState} from 'react';
import {Upload} from 'lucide-react';
import {UploadResponse} from '../types';

type FileUploadProps = {
    onUploadSuccess?: (data: UploadResponse) => void;
    onUploadError?: (error: string) => void;
}

type AudioPlayerProps = {
    chapters: {
        id: string;
        title: string;
        audioUrl: string;
    }[];
    onReset: () => void;
}

export const AudioPlayer = ({chapters, onReset}: AudioPlayerProps) => {
    const handleDownload = async (audioUrl: string, filename: string) => {
        const response = await fetch(audioUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
    return (
        <div className = "space-y-4">
            {chapters.map((chapter) => (
                <div key = {chapter.id} className = "border p-4 rounded">
                    <h3 className = "font-medium mb-2">{chapter.title}</h3>
                    <audio controls className = "w-full mb-2" src = {chapter.audioUrl}>
                        <track kind = "captions" />
                    </audio>
                    <button
                        onClick = {() => handleDownload(chapter.audioUrl, `${chapter.title}.mp3`)}
                        className = "bg-blue-500 text-white px-4 py-2 rounded"
                    >
                        Download Audio
                    </button>
                </div>
            ))}
            <button
                onClick = {onReset}
                className = "bg-gray-500 text-white px-4 py-2 rounded"
            >
                Reset
            </button>
        </div>
    );
};

const FileUpload = ({ onUploadSuccess, onUploadError }: FileUploadProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;
        const validTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (!validTypes.includes(selectedFile.type)) {
            const error = 'Please upload only PDF or Word documents';
            setError(error);
            onUploadError?.(error);
            setFile(null);
            return;
        }
        setError('');
        setFile(selectedFile);
    };

    const handleUpload = async () => {
        if (!file) {
            const error = 'Please select a file first';
            setError(error);
            onUploadError?.(error);
            return;
        }
        try {
            setLoading(true);
            setError('');

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data: UploadResponse = await response.json();
            if (!response.ok) {
                throw new Error(data.error ?? 'Upload failed');
            }

            onUploadSuccess?.(data);
            setFile(null);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to upload file. Please try again.';
            setError(errorMessage);
            onUploadError?.(errorMessage);
            console.error('Upload error: ', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            const input = document.createElement('input');
            input.type = 'file';
            input.files = e.dataTransfer.files;
            handleFileChange({ target: input } as React.ChangeEvent<HTMLInputElement>);
        }
    };

    return (
        <div className = "max-w-xl mx-auto p-6">
            <div
                className = "border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
                onDragOver = {handleDragOver}
                onDrop = {handleDrop}
            >
                <label
                    htmlFor = "file-upload"
                    className = "mb-4 cursor-pointer inline-flex items-center justify-center"
                    aria-label = "Upload Icon"
                >
                    <Upload className = "mx-auto h-12 w-12 text-gray-400" />
                    <input
                        id = "file-upload"
                        type = "file"
                        className = "hidden"
                        accept = ".pdf, .doc, .docx"
                        onChange = {handleFileChange}
                    />
                </label>

                <label className = "block mb-4">
                    <span className = "text-gray-700">Upload your book (PDF or Word)</span>
                    <input
                        type = "file"
                        className = "mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold hover:file:bg-blue-100"
                        accept = ".pdf, .doc, .docx"
                        onChange = {handleFileChange}
                    />
                </label>

                {file && (
                    <div className = "mt-4 text-sm text-gray-500">
                        Selected file: {file.name}
                    </div>
                )}

                {error && (
                    <div className = "mt-4 text-sm text-red-600">
                        {error}
                    </div>
                )}

                <button
                    onClick = {handleUpload}
                    disabled = {!file || loading}
                    className = {`mt-4 px-4 py-2 rounded-md text-white ${!file || loading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                >
                    {loading ? 'Uploading...' : 'Uploaded'}
                </button>
            </div>
        </div>
    );
};

export default FileUpload;
