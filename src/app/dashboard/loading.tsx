export default function DashboardLoading() {
  return (
    <div>
      <div className="mb-8">
        <div className="skeleton mb-3 h-9 w-72" />
        <div className="skeleton h-5 w-96" />
      </div>
      <div className="mb-6">
        <div className="skeleton mb-6 h-8 w-36" />
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="skeleton mb-4 h-12 w-12 rounded-lg" />
              <div className="skeleton mb-2 h-6 w-36" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton mt-1 h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
