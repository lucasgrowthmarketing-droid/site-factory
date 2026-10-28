import { notFound } from "next/navigation";
import BusinessSite from "@/components/business-site";
import { defaultConfig, newLead } from "@/lib/domain";

export default async function TemplatePage({
  params,
}: {
  params: Promise<{ template: string }>;
}) {
  const { template } = await params;
  if (!["barber-premium", "mechanic-pro"].includes(template)) notFound();
  const mechanic = template === "mechanic-pro";
  const config = defaultConfig(
    newLead({
      name: mechanic ? "Oficina Conceito" : "Barbearia Conceito",
      category: mechanic ? "Oficina mecânica" : "Barbearia",
      city: "Porto Alegre / RS",
      fictional: true,
    }),
  );
  return <BusinessSite config={config} />;
}
