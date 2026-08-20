import { redirect } from "next/navigation";

type Props = { params: Promise<{ code: string }> };

/** Links antigos /validar/[código] → /validador?c= */
export default async function ValidarLegacyRedirect({ params }: Props) {
  const { code } = await params;
  redirect(`/validador?c=${encodeURIComponent(code)}`);
}
