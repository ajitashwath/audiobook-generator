import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file')

        if(!file) {
            return NextResponse.json(
                {error: 'No file received.'},
                {status: 400}
            )
        }

        return NextResponse.json(
            {message: 'Upload successful' },
            { status: 200 }
        )
    } catch(error) {
        return NextResponse.json(
            { error: 'Failed to upload' },
            {status: 500}
        )
    }
}