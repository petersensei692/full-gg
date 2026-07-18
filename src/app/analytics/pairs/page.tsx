import { redirect } from "next/navigation";

/** Keep old analytics URL working; canonical route is /pairs. */
export default function AnalyticsPairsRedirect() {
  redirect("/pairs");
}
