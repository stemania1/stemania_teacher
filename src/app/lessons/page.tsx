import Link from "next/link";
import { getCurrentTeacherFromDb } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

interface LessonItem {
  lessonId: string;
  title: string;
  description: string | null;
  curriculumTitle: string | null;
  subject: string | null;
  gradeLevel: string | null;
  estimatedDuration: number | null;
  hasPresentation: boolean;
}

async function getAssignedLessons(): Promise<LessonItem[]> {
  const teacher = await getCurrentTeacherFromDb();
  if (!teacher) return [];

  const supabase = getSupabaseAdmin();
  const { data: assignments } = await supabase
    .from("teacher_lesson_assignments")
    .select("lesson_id")
    .eq("teacher_id", teacher.employeeNumber)
    .eq("status", "active")
    .or("expires_at.is.null,expires_at.gt.now()");

  const lessonIds = (assignments || [])
    .map((a: { lesson_id: string }) => a.lesson_id)
    .filter(Boolean);
  if (lessonIds.length === 0) return [];

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, description, estimated_duration, curriculum_id")
    .in("id", lessonIds)
    .eq("status", "published")
    .is("archived_at", null);

  if (!lessons?.length) return [];

  // Check which lessons have presentation blocks
  const { data: presBlocks } = await supabase
    .from("lesson_blocks")
    .select("lesson_id")
    .in("lesson_id", lessons.map((l: { id: string }) => l.id))
    .eq("block_type", "presentation");

  const presLessonIds = new Set(
    (presBlocks || []).map((b: { lesson_id: string }) => b.lesson_id)
  );

  const curriculumIds = [
    ...new Set(
      lessons
        .map((l: { curriculum_id: string }) => l.curriculum_id)
        .filter(Boolean)
    ),
  ];
  const { data: curricula } = await supabase
    .from("curricula")
    .select("id, title, subject, grade_level")
    .in("id", curriculumIds);

  const currMap = new Map(
    (curricula || []).map(
      (c: {
        id: string;
        title: string;
        subject: string | null;
        grade_level: string | null;
      }) => [c.id, c]
    )
  );

  return lessons.map(
    (l: {
      id: string;
      title: string;
      description: string | null;
      estimated_duration: number | null;
      curriculum_id: string;
    }) => ({
      lessonId: l.id,
      title: l.title,
      description: l.description ?? null,
      curriculumTitle: currMap.get(l.curriculum_id)?.title ?? null,
      subject: currMap.get(l.curriculum_id)?.subject ?? null,
      gradeLevel: currMap.get(l.curriculum_id)?.grade_level ?? null,
      estimatedDuration: l.estimated_duration ?? null,
      hasPresentation: presLessonIds.has(l.id),
    })
  );
}

function groupByCurriculum(
  lessons: LessonItem[]
): Map<string, LessonItem[]> {
  const map = new Map<string, LessonItem[]>();
  for (const l of lessons) {
    const key = l.curriculumTitle ?? "Other";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(l);
  }
  return map;
}

function PresentationBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
      title="Contains presentation slides"
    >
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h16.5M3.75 3l2.664 11.942M20.25 3v11.25A2.25 2.25 0 0118 16.5h-2.25M20.25 3l-2.664 11.942m0 0L12 21l-5.586-5.058"
        />
      </svg>
      Slides
    </span>
  );
}

export default async function MyLessonsPage() {
  const lessons = await getAssignedLessons();
  const byCurriculum = groupByCurriculum(lessons);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          My Lessons
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          View your assigned lesson plans and teaching materials.
        </p>
      </div>

      {lessons.length === 0 ? (
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
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            No lessons assigned yet
          </h3>
          <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            No lessons have been assigned to you yet. Contact your director
            if you believe this is an error.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {Array.from(byCurriculum.entries()).map(
            ([curriculumTitle, items]) => (
              <section key={curriculumTitle}>
                <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                  {curriculumTitle}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((lesson) => (
                    <Link
                      key={lesson.lessonId}
                      href={`/lessons/${lesson.lessonId}`}
                      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {lesson.title}
                        </h3>
                        {lesson.hasPresentation && <PresentationBadge />}
                      </div>
                      {lesson.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                          {lesson.description}
                        </p>
                      )}
                      {lesson.estimatedDuration != null && (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {lesson.estimatedDuration} min
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )
          )}
        </div>
      )}
    </div>
  );
}
