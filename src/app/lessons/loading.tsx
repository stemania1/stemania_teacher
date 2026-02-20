export default function LessonsLoading() {
  return (
    <div>
      <div className="mb-8">
        <div className="skeleton mb-3 h-9 w-48" />
        <div className="skeleton h-5 w-80" />
      </div>
      <div className="space-y-10">
        {Array.from({ length: 2 }).map((_, sectionIdx) => (
          <section key={sectionIdx}>
            <div className="skeleton mb-4 h-7 w-56" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="skeleton mb-2 h-5 w-3/4" />
                  <div className="skeleton mb-1 h-4 w-full" />
                  <div className="skeleton h-4 w-2/3" />
                  <div className="skeleton mt-3 h-3 w-16" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
