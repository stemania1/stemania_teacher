import { redirect } from "next/navigation";

// My Information is shared with STEMania Admin - redirect to the admin app
export default function MyInformationPage() {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.stemania.com";
  redirect(`${adminUrl}/my-information`);
}
