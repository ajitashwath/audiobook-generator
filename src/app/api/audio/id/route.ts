import {NextRequest} from 'next/server';
import {join} from 'path';
import {readFile} from 'fs/promises';
import {existsSync} from 'fs';

export async function GET(
    request: NextRequest,
    {params}: {params:{id:string}}
) {
    try {
        const audioId = params.id;
        if (!audioId) {
            return new Response('Audio ID is required', {status: 400});
        }

        const audioFileName = audioId.endsWith('.mp3') ? audioId : `${audioId}.mp3`;
        const audioPath = join(process.cwd(), 'public', 'audio', audioFileName);

        if (!existsSync(audioPath)) {
            console.error('Audio file not found:', audioPath);
            return new Response('Audio file not found', { status: 404 });
        }

        const audioBuffer = await readFile(audioPath);
        return new Response(audioBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.length.toString(),
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=31536000',
                'Content-Disposition': `inline; filename="${audioFileName}"`,
            },
        });

    } catch (error) {
        console.error('Error serving audio file:', error);
        return new Response('Error retrieving audio file', { status: 500 });
    }
}

export async function HEAD(
    request: NextRequest,
    {params}: {params: {id:string}}
) {
    try {
        const audioId = params.id;
        if (!audioId) {
            return new Response(null, {status: 400});
        }

        const audioFileName = audioId.endsWith('.mp3') ? audioId : `${audioId}.mp3`;
        const audioPath = join(process.cwd(), 'public', 'audio', audioFileName);

        if (!existsSync(audioPath)) {
            return new Response(null, {status: 404});
        }

        const audioBuffer = await readFile(audioPath);

        return new Response(null, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.length.toString(),
                'Accept-Ranges': 'bytes',
            },
        });

    } catch (error) {
        console.error('Error in HEAD request:', error);
        return new Response(null, {status: 500});
    }
}