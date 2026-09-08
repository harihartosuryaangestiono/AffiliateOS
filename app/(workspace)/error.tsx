'use client';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <section className="panel detail-panel text-center py-20">
      <AlertCircle className="mx-auto text-amber-600 mb-4" />
      <h1>We couldn’t load this workspace.</h1>
      <p className="text-muted-foreground mt-4 mb-6">
        Try again. If the problem continues, ask your administrator to check the
        database connection and workspace access.
      </p>
      <Button onClick={reset}>Try again</Button>
    </section>
  );
}
