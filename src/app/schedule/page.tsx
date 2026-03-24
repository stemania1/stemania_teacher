import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentTeacherFromDb } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const DAY_SHORT: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

interface ScheduleClass {
  id: string;
  name: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  daysOfWeek: string[];
  studentCount: number;
}

function formatTime(time: string | null): string {
  if (!time) return "";
  // Handle HH:MM or HH:MM:SS format
  const parts = time.split(":");
  if (parts.length < 2) return time;
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${ampm}`;
}

function getTodayDayName(): string {
  const dayIndex = new Date().getDay(); // 0=Sun, 1=Mon, ...
  const mapping = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return mapping[dayIndex];
}

export default async function SchedulePage() {
  const teacher = await getCurrentTeacherFromDb();
  if (!teacher) {
    redirect("/login");
  }

  const supabase = getSupabaseAdmin();

  // Get classes assigned to this teacher
  const { data: assignments } = await supabase
    .from("class_teacher_assignments")
    .select("class_id")
    .eq("teacher_id", teacher.employeeNumber);

  const classIds = (assignments || [])
    .map((a: { class_id: string }) => a.class_id)
    .filter(Boolean);

  let classes: ScheduleClass[] = [];

  if (classIds.length > 0) {
    const { data: classData } = await supabase
      .from("bookeo_classes")
      .select("id, name, description, start_time, end_time, days_of_week")
      .in("id", classIds)
      .order("start_time");

    // Get student counts for each class
    const { data: enrollments } = await supabase
      .from("class_enrollments")
      .select("class_id, student_id")
      .in("class_id", classIds);

    const countMap: Record<string, number> = {};
    for (const e of enrollments || []) {
      countMap[e.class_id] = (countMap[e.class_id] || 0) + 1;
    }

    classes = (classData || []).map(
      (c: {
        id: string;
        name: string;
        description: string | null;
        start_time: string | null;
        end_time: string | null;
        days_of_week: string[] | null;
      }) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        startTime: c.start_time,
        endTime: c.end_time,
        daysOfWeek: c.days_of_week ?? [],
        studentCount: countMap[c.id] || 0,
      })
    );
  }

  const todayName = getTodayDayName();
  const todayClasses = classes.filter((c) =>
    c.daysOfWeek.includes(todayName)
  );
  const unscheduledClasses = classes.filter(
    (c) => c.daysOfWeek.length === 0
  );

  // Build a map of day -> classes for the weekly grid
  const dayClassMap: Record<string, ScheduleClass[]> = {};
  for (const day of DAYS) {
    dayClassMap[day] = classes
      .filter((c) => c.daysOfWeek.includes(day))
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          My Schedule
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          View your weekly class schedule and student rosters.
        </p>
      </div>

      {classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stemania-teal-100 text-stemania-teal-600 dark:bg-stemania-teal-900/30 dark:text-stemania-teal-400">
            <svg
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            No classes assigned
          </h3>
          <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Your class schedule will appear here once classes are assigned to
            you. Check back soon!
          </p>
        </div>
      ) : (
        <>
          {/* Today's Classes */}
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
              Today &mdash; {DAY_LABELS[todayName]}
            </h2>
            {todayClasses.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {todayClasses.map((cls) => (
                  <Link
                    key={cls.id}
                    href={`/dashboard/classes/${cls.id}/attendance`}
                    className="rounded-xl border border-stemania-teal-200 bg-stemania-teal-50 p-5 shadow-sm transition-shadow hover:shadow-md dark:border-stemania-teal-800 dark:bg-stemania-teal-900/20"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {cls.name}
                      </h3>
                      <span className="rounded-full bg-stemania-teal-100 px-2.5 py-0.5 text-xs font-medium text-stemania-teal-700 dark:bg-stemania-teal-900/50 dark:text-stemania-teal-300">
                        Today
                      </span>
                    </div>
                    {(cls.startTime || cls.endTime) && (
                      <p className="mb-1 text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(cls.startTime)}
                        {cls.startTime && cls.endTime && " – "}
                        {formatTime(cls.endTime)}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {cls.studentCount}{" "}
                      {cls.studentCount === 1 ? "student" : "students"}
                    </p>
                    <span className="mt-3 inline-flex items-center text-sm font-medium text-stemania-teal-600 dark:text-stemania-teal-400">
                      Take Attendance
                      <svg
                        className="ml-1 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No classes scheduled for today.
                </p>
              </div>
            )}
          </section>

          {/* Weekly Calendar Grid */}
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
              Weekly Schedule
            </h2>
            <div className="overflow-x-auto">
              <div className="grid min-w-[700px] grid-cols-7 gap-2">
                {/* Day headers */}
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className={`rounded-t-lg px-3 py-2 text-center text-sm font-semibold ${
                      day === todayName
                        ? "bg-stemania-teal-600 text-white dark:bg-stemania-teal-500"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span className="hidden sm:inline">
                      {DAY_LABELS[day]}
                    </span>
                    <span className="sm:hidden">{DAY_SHORT[day]}</span>
                  </div>
                ))}
                {/* Day columns */}
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className={`min-h-[120px] rounded-b-lg border p-2 ${
                      day === todayName
                        ? "border-stemania-teal-300 bg-stemania-teal-50/50 dark:border-stemania-teal-700 dark:bg-stemania-teal-900/10"
                        : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                    }`}
                  >
                    {dayClassMap[day].length > 0 ? (
                      <div className="space-y-2">
                        {dayClassMap[day].map((cls) => (
                          <Link
                            key={cls.id}
                            href={`/dashboard/classes/${cls.id}/attendance`}
                            className="block rounded-lg bg-stemania-teal-100 p-2 text-xs transition-colors hover:bg-stemania-teal-200 dark:bg-stemania-teal-900/30 dark:hover:bg-stemania-teal-900/50"
                          >
                            <p className="font-medium text-gray-900 dark:text-white">
                              {cls.name}
                            </p>
                            {cls.startTime && (
                              <p className="text-gray-600 dark:text-gray-400">
                                {formatTime(cls.startTime)}
                                {cls.endTime &&
                                  ` – ${formatTime(cls.endTime)}`}
                              </p>
                            )}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="pt-4 text-center text-xs text-gray-400 dark:text-gray-500">
                        &mdash;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Unscheduled Classes */}
          {unscheduledClasses.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                Unscheduled Classes
              </h2>
              <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                These classes don&apos;t have days assigned yet. Ask your
                administrator to set their schedule.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {unscheduledClasses.map((cls) => (
                  <Link
                    key={cls.id}
                    href={`/dashboard/classes/${cls.id}/attendance`}
                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                  >
                    <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">
                      {cls.name}
                    </h3>
                    {(cls.startTime || cls.endTime) && (
                      <p className="mb-1 text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(cls.startTime)}
                        {cls.startTime && cls.endTime && " – "}
                        {formatTime(cls.endTime)}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {cls.studentCount}{" "}
                      {cls.studentCount === 1 ? "student" : "students"}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
