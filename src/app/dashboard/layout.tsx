import TeacherNav from "@/components/TeacherNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TeacherNav />
      <main id="main-content" className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
