export default function SchedulePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          My Schedule
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          View your upcoming class schedule, locations, and student rosters.
        </p>
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stemania-teal-100 text-stemania-teal-600 dark:bg-stemania-teal-900/30 dark:text-stemania-teal-400">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          No upcoming classes
        </h3>
        <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          Your class schedule will appear here once classes are assigned to you.
          Check back soon!
        </p>
      </div>
    </div>
  );
}
