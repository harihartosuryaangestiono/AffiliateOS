import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="login-screen">
      <h1>This page couldn’t be found.</h1>
      <p className="text-muted-foreground my-5">
        The link may have changed or the record was removed.
      </p>
      <Link className="button-outline" href="/dashboard">
        Back to dashboard
      </Link>
    </main>
  );
}
