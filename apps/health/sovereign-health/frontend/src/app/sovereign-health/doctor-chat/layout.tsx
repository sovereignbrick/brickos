import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Doctor Chat',
  description: 'Get AI-powered health insights based on your biomarker data. Ask questions about your markers, trends, and health optimization.',
}

export default function DoctorChatLayout({ children }: { children: React.ReactNode }) {
  return children
}
