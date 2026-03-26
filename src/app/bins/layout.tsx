import TeacherNav from "@/components/TeacherNav";
import SimulationBannerServer from "@/components/SimulationBannerServer";

export default function BinsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SimulationBannerServer />
      <TeacherNav />
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
