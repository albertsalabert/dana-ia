import { redirect } from "next/navigation";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;

  if (params?.token) {
    redirect(`/api/auth/verify?token=${params.token}`);
  }

  redirect("/auth/login?error=token_missing");
}
