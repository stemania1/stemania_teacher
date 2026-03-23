import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentTeacherFromDb } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export default async function ClassesPage() {
  const teacher = await getCurrentTeacherFromDb();
  if (!teacher) {
    redirect("/login");
  }

  const supabase = getSupabaseAdmin();
  const { data: assignments } = await supabase
    .from("class_teacher_assignments")
    .select("class_id")
    .eq("teacher_id", teacher.employeeNumber);

  const classIds = (assignments || [])
    .map((a: { class_id: string }) => a.class_id)
    .filter(Boolean);

  let classes: {
    id: string;
    name: string;
    description: string | null;
    start_time: string | null;
    end_time: string | null;
  }[] = [];

  if (classIds.length > 0) {
    const { data } = await supabase
      .from("bookeo_classes")
      .select("id, name, description, start_time, end_time")
      .in("id", classIds)
      .order("name");
    classes = data || [];
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          My Classes
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          View your assigned classes and take attendance.
        </p>
      </div>

      {classes.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            No classes assigned
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            You don&apos;t have any classes assigned yet. Contact your
            administrator for class assignments.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <Link
              key={cls.id}
              href={`/dashboard/classes/${cls.id}/attendance`}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-stemania-teal-100 dark:bg-stemania-teal-900">
                <svg
                  className="h-6 w-6 text-stemania-teal-600 dark:text-stemania-teal-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                {cls.name}
              </h3>
              {cls.description && (
                <p className="mb-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
                  {cls.description}
                </p>
              )}
              <span className="inline-flex items-center text-sm font-medium text-stemania-teal-600 dark:text-stemania-teal-400">
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
      )}
    </div>
  );
}
