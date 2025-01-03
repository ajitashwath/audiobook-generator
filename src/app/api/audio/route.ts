import {NextResponse} from 'next/server';
import {join} from 'path';
import {readFile} from 'fs/promises';

export async function GET(
    request: Request,
    {params} : {params: {filename: string}}
) {
    try {
        const filePath = join(process.cwd(), 'uploads', params.filename);
        const audioBuffer = await readFile(filePath);
        return new NextResponse(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.length.toString(),
            },
        });
    } catch(error) {
        return NextResponse.json(
            {error: 'Audio file not found'},
            {status: 404}
        );
    }
}
