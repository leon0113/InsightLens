import type { Metadata } from 'next';
import {
  Bricolage_Grotesque,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
} from 'next/font/google';
import { Providers } from '@/components/providers';
import { themeScript } from '@/lib/theme';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  weight: ['600', '700'],
});

const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: {
    default: 'InsightLens: automatic EDA reports from any CSV',
    template: '%s | InsightLens',
  },
  description:
    'Upload a CSV and get an exploratory data analysis report: column profiles, missing values, distributions, correlations and plain-language insights.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // The theme script sets the "dark" class before React hydrates, so the
    // class on <html> can differ from the server render on purpose.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
