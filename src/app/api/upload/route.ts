import {NextResponse} from 'next/server';
import {writeFile} from 'fs/promises';
import {join} from 'path';
import textToSpeech, { protos } from '@google-cloud/text-to-speech';

const ttsClient = new textToSpeech.TextToSpeechLongAudioSynthesizeClient({
    keyFilename: 'path-to-your-google-credentials.json',
});

export async function POST(request: Request) {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
  
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const uploadDir = join(process.cwd(), 'uploads');
      const filePath = join(uploadDir, file.name);
      
      await writeFile(filePath, buffer);
  
      return NextResponse.json({
        message: 'File uploaded successfully',
        fileName: file.name
      });
  
    } catch (error) {
      console.error('Upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }
}

function extractChapters(text: string) {
    const chapters = text.split(/Chapter \d+/i)
        .filter(content => content.trim().length > 0)
        .map((content, index) => ({
            id: `chapter-${index + 1}`,
            title: `Chapter ${index + 1}`,
            content: content.trim()
        }));
    return chapters;
}

async function generateAudio(text: string) {
    const request = {
        input: {text},
        voice: {languageCode: 'en-US', ssmlGender: protos.google.cloud.texttospeech.v1.SsmlVoiceGender.NEUTRAL},
        audioConfig: {audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding.MP3},
    };
    const [operation] = ttsClient.synthesizeLongAudio(request) as any;
    const [response] = await operation.promise();
    return response.audioContent;
}