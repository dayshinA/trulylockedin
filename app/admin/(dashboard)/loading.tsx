// Suspense boundary for the dashboard pages. Each page re-checks the session
// (request-time). On a client navigation, a boundary in an already-mounted
// segment can't show a fallback, so every page folder re-exports this file
// from its own loading.tsx.
export default function DashboardLoading() {
  return <p className="text-sand">Loading…</p>;
}
