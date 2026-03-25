import Link from "next/link";

interface SimulatedTeacher {
  employeeNumber: number;
  firstName: string;
  lastName: string;
}

interface SimulationBannerProps {
  simulatedTeacher: SimulatedTeacher | null;
}

export default function SimulationBanner({ simulatedTeacher }: SimulationBannerProps) {
  if (!simulatedTeacher) return null;

  const name = [simulatedTeacher.firstName, simulatedTeacher.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      role="alert"
      className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white"
    >
      Simulating teacher:{" "}
      <span className="font-bold">{name}</span>{" "}
      <span className="opacity-80">#{simulatedTeacher.employeeNumber}</span>
      {" — "}
      <Link
        href="/dashboard?simulate=stop"
        className="underline hover:no-underline"
      >
        Stop Simulation
      </Link>
    </div>
  );
}
