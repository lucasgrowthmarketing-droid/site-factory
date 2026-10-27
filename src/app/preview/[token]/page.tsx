import PreviewPage from "@/components/preview-page";
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PreviewPage token={token} />;
}
