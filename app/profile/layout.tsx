import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Creator Dashboard',
  description: 'Manage community quizzes, track submissions, and export your decentralized profile data.',
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
