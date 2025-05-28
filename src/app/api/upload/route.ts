import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import textToSpeech, { protos } from '@google-cloud/text-to-speech'
import { Chapter } from '../../types'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
  join(process.cwd(), 'google-credentials.json');

const ttsClient = new textToSpeech.TextToSpeechClient({
    keyFilename: credentialsPath,
});

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
            return NextResponse.json({ 
                message: 'No file provided',
                error: 'No file provided',
                success: false 
            }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadDir = join(process.cwd(), 'uploads');
        const audioDir = join(process.cwd(), 'public', 'audio');
        
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }
        if (!existsSync(audioDir)) {
            await mkdir(audioDir, { recursive: true });
        }
        
        const filePath = join(uploadDir, file.name);
        await writeFile(filePath, buffer);

        let textContent: string;
        
        if (file.type === 'application/pdf') {
            textContent = await extractTextFromPDF(buffer);
        } else if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
            textContent = await extractTextFromWord(buffer);
        } else {
            throw new Error('Unsupported file type');
        }

        if (!textContent || textContent.trim().length === 0) {
            throw new Error('No text content found in the uploaded file');
        }

        const chapters = extractChapters(textContent);
        
        if (chapters.length === 0) {
            throw new Error('No chapters found in the document');
        }

        const processedChapters: Chapter[] = [];
        for (const chapter of chapters) {
            try {
                console.log(`Generating audio for ${chapter.title}...`);
                const audioBuffer = await generateAudio(chapter.content);
                const audioFileName = `${chapter.id}.mp3`;
                const audioFilePath = join(audioDir, audioFileName);
                
                await writeFile(audioFilePath, audioBuffer);
                
                processedChapters.push({
                    ...chapter,
                    audioUrl: `/audio/${audioFileName}`,
                    duration: estimateAudioDuration(chapter.content),
                });
                
                console.log(`Audio generated for ${chapter.title}`);
            } catch (audioError) {
                console.error(`Failed to generate audio for ${chapter.title}:`, audioError);
                processedChapters.push({
                    ...chapter,
                    audioUrl: undefined,
                    duration: estimateAudioDuration(chapter.content),
                });
            }
        }

        return NextResponse.json({
            message: `File processed successfully. Generated ${processedChapters.filter(c => c.audioUrl).length} audio files.`,
            success: true,
            data: {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                uploadedAt: new Date().toISOString(),
                chapters: processedChapters,
                totalChapters: processedChapters.length,
                audioGenerated: processedChapters.filter(c => c.audioUrl).length
            }
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { 
                message: 'Failed to process file',
                error: error instanceof Error ? error.message : 'Unknown error',
                success: false 
            },
            { status: 500 }
        );
    }
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
        
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
            fullText += pageText + '\n';
        }
        
        return fullText;
    } catch (error) {
        console.error('PDF extraction error:', error);
        throw new Error('Failed to extract text from PDF');
    }
}

async function extractTextFromWord(buffer: Buffer): Promise<string> {
    try {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    } catch (error) {
        console.error('Word extraction error:', error);
        throw new Error('Failed to extract text from Word document');
    }
}

function extractChapters(text: string): Chapter[] {
    const chapterPatterns = [
        /^Chapter\s+(\d+|[IVX]+)\s*:?\s*(.*)$/gim,
        /^(\d+)\.\s+(.+)$/gm,
        /^Part\s+(\d+|[IVX]+)\s*:?\s*(.*)$/gim,
        /^Section\s+(\d+)\s*:?\s*(.*)$/gim
    ];
    
    let chapters: Chapter[] = [];
    
    for (const pattern of chapterPatterns) {
        const matches = Array.from(text.matchAll(pattern));
        if (matches.length > 1) { 
            chapters = extractChaptersByPattern(text, pattern);
            break;
        }
    }

    if (chapters.length === 0) {
        chapters = splitTextIntoChunks(text);
    }
    
    return chapters.filter(chapter => chapter.content.trim().length > 100); // Filter out very short chapters
}

function extractChaptersByPattern(text: string, pattern: RegExp): Chapter[] {
    const matches = Array.from(text.matchAll(pattern));
    const chapters: Chapter[] = [];
    
    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const nextMatch = matches[i + 1];
        
        const chapterStart = match.index!;
        const chapterEnd = nextMatch ? nextMatch.index! : text.length;
        
        const chapterText = text.substring(chapterStart, chapterEnd).trim();
        const title = match[2] ? `Chapter ${match[1]}: ${match[2].trim()}` : `Chapter ${match[1]}`;
        
        chapters.push({
            id: `chapter-${i + 1}`,
            title: title,
            content: chapterText
        });
    }
    
    return chapters;
}

function splitTextIntoChunks(text: string, maxChunkSize: number = 3000): Chapter[] {
    const words = text.split(/\s+/);
    const chunks: Chapter[] = [];
    let currentChunk = '';
    let chunkIndex = 1;
    
    for (const word of words) {
        if (currentChunk.length + word.length > maxChunkSize && currentChunk.length > 0) {
            chunks.push({
                id: `section-${chunkIndex}`,
                title: `Section ${chunkIndex}`,
                content: currentChunk.trim()
            });
            currentChunk = word + ' ';
            chunkIndex++;
        } else {
            currentChunk += word + ' ';
        }
    }
    
    // Add remaining content
    if (currentChunk.trim().length > 0) {
        chunks.push({
            id: `section-${chunkIndex}`,
            title: `Section ${chunkIndex}`,
            content: currentChunk.trim()
        });
    }
    
    return chunks;
}

async function generateAudio(text: string): Promise<Buffer> {
    const cleanedText = text
        .replace(/[^\w\s.,!?;:'"()-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    
    if (cleanedText.length === 0) {
        throw new Error('No valid text content for audio generation');
    }
    
    const maxLength = 5000;
    const textChunks = splitTextForTTS(cleanedText, maxLength);
    const audioBuffers: Buffer[] = [];
    
    for (const chunk of textChunks) {
        const request = {
            input: { text: chunk },
            voice: { 
                languageCode: 'en-US', 
                ssmlGender: protos.google.cloud.texttospeech.v1.SsmlVoiceGender.NEUTRAL,
                name: 'en-US-Journey-F'
            },
            audioConfig: { 
                audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding.MP3,
                speakingRate: 1.0,
                pitch: 0.0
            },
        };
        
        try {
            const [response] = await ttsClient.synthesizeSpeech(request);
            if (response.audioContent) {
                audioBuffers.push(Buffer.from(response.audioContent));
            }
        } catch (error) {
            console.error('TTS error for chunk:', error);
            throw new Error('Failed to generate audio');
        }
    }
    return Buffer.concat(audioBuffers);
}

function splitTextForTTS(text: string, maxLength: number): string[] {
    const sentences = text.split(/[.!?]+\s+/);
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxLength && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence + '. ';
        } else {
            currentChunk += sentence + '. ';
        }
    }
    
    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks;
}

function estimateAudioDuration(text: string): number {
    const words = text.split(/\s+/).length;
    return Math.ceil((words / 150) * 60);
}