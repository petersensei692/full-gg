import { redirect } from "next/navigation";

export default function Home() {
  redirect("/fundamental-analysis/asset?slug=usd");
}
