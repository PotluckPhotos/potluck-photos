import { redirect } from "next/navigation";

// The dashboard now lives at "/" (public landing for signed-out visitors,
// album list for signed-in users). Keep this path working for old links.
export default function DashboardPage() {
  redirect("/");
}
