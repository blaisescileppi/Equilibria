import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomFoods } from "@/components/meals/custom-foods";
import { ButtonLink, LoadingBlock, PageHeader } from "@/components/ui";
import { requireUser } from "@/server/auth/current-user";
import { listCustomFoods } from "@/server/services/foods";

export const metadata: Metadata = { title: "My foods" };

export default function CustomFoodsPage() {
  return (
    <>
      <PageHeader
        title="My foods"
        description="Add foods or recipes that aren't in the built-in library. Use the nutrition label, per serving. Only you can see these."
        actions={
          <ButtonLink href="/meals" variant="secondary">
            Back to meals
          </ButtonLink>
        }
      />
      <Suspense fallback={<LoadingBlock />}>
        <CustomFoodsContent />
      </Suspense>
    </>
  );
}

async function CustomFoodsContent() {
  const user = await requireUser();
  return <CustomFoods foods={await listCustomFoods(user.id)} />;
}
