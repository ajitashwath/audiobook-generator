import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import React from 'react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Audiobook Generator',
    description: 'Convert your books into chapter-wise audio files',
}
export default function RootLayout({
    children,
}: {
    readonly children: React.ReactNode
}): React.JSX.Element {
    return (
        <html lang="en-US">
            <body className={inter.className}>
                <header className='border-b'>
                    <nav className="container mx-auto px-4 py-4"></nav>
                </header>
                <main className="container mx-auto px-4 py-8 min-h-screen">{children}</main>
                <footer className="border-t">
                    <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-600">
                        {new Date().getFullYear()}&copy; Audiobook Generator
                    </div>
                </footer>
            </body>
        </html>
    )
}