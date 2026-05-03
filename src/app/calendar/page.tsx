import { redirect } from "next/navigation";

/** Legacy `/calendar` route removed; weekly calendar module deleted. */
export default function CalendarPage() {
  redirect("/watch-list");
}
