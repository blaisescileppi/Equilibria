import { ButtonLink, Card } from "@/components/ui";

const FEATURES = [
  {
    title: "Cycle tracking",
    body: "Log periods and see your average cycle length, period length, and an estimate of when your next period starts.",
  },
  {
    title: "Daily log",
    body: "Record mood, symptoms, and notes each day, and see them on a calendar next to your cycle.",
  },
  {
    title: "Meal tracking",
    body: "Log foods and see calories, macros, and key micronutrients like iron, folate, and calcium.",
  },
  {
    title: "Meal ideas",
    body: "Browse, save, and like meals other people share, or post your own with a photo.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-12 py-6">
      <section className="max-w-2xl space-y-5">
        <p className="text-sm font-medium uppercase tracking-wide text-brand">Equilibria</p>
        <h1 className="text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
          Your cycle, symptoms, and nutrition in one calm place.
        </h1>
        <p className="text-lg text-stone-600">
          Notice how your body changes across the month, and how what you eat fits in.
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/signup">Create an account</ButtonLink>
          <ButtonLink href="/login" variant="secondary">
            Sign in
          </ButtonLink>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <Card key={feature.title}>
            <h2 className="font-semibold text-stone-900">{feature.title}</h2>
            <p className="mt-2 text-sm text-stone-600">{feature.body}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
