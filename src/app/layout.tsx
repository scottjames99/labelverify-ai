import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'LabelVerify AI | Alcohol Label Review',description:'Human-in-the-loop alcohol label verification prototype'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
