import {NextResponse} from 'next/server';
import {writeFile, mkdir} from 'fs/promises';
import {join} from 'path';
import {existsSync} from 'fs';
import textToSpeech, { protos } from '@google-cloud/text-to-speech';
import { Chapter } from '../../types';

// Use environment variable for credentials path
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
  join(process.cwd(), 'google-credentials.json');

const ttsClient = new textToSpeech.TextToSpeechLongAudioSynthesizeClient({
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
      
      // Create uploads directory if it doesn't exist
      const uploadDir = join(process.cwd(), 'uploads');
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      
      const filePath = join(uploadDir, file.name);
      await writeFile(filePath, buffer);
    
      const textContent = "Chapter 1\nSample text content.\nChapter 2\nMore sample content.";
      const chapters = extractChapters(textContent);
      const processedChapters: Chapter[] = [];
      
      for (const chapter of chapters) {
        processedChapters.push({
          ...chapter,
          audioUrl: `/api/audio/${chapter.id}`,
          duration: Math.floor(Math.random() * 300) + 60,
        });
      }

      return NextResponse.json({
        message: 'File uploaded successfully',
        success: true,
        data: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadedAt: new Date().toISOString(),
          chapters: processedChapters
        }
      });
  
    } catch (error) {
      console.error('Upload error:', error);
      return NextResponse.json(
        { 
          message: 'Failed to upload file',
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false 
        },
        {status: 500}
      );
    }
}

function extractChapters(text: string): Chapter[] {
    const chapters = text.split(/Chapter \d+/i)
        .filter(content => content.trim().length > 0)
        .map((content, index) => ({
            id: `chapter-${index + 1}`,
            title: `Chapter ${index + 1}`,
            content: content.trim()
        }));
    return chapters;
}

async function generateAudio(text: string): Promise<Buffer> {
    const request = {
        input: {text},
        voice: {languageCode: 'en-US', ssmlGender: protos.google.cloud.texttospeech.v1.SsmlVoiceGender.NEUTRAL},
        audioConfig: {audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding.MP3},
    };
    
    try {
        const [operation] = await ttsClient.synthesizeLongAudio(request);
        const [response] = await operation.promise();
        return response.audioContent as Buffer;
    } catch (error) {
        console.error('Error generating audio:', error);
        throw new Error('Failed to generate audio');
    }
}