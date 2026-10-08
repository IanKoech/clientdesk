import { requireSession } from "@/lib/session";
import { Brand } from "@/components/brand";
import { OnboardingForm } from "@/components/onboarding-form";
export default async function Onboarding() {
  const session = await requireSession();
  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <Brand />
      <p className="mt-16 text-xs tracking-[.18em] text-[#83946c]">
        YOUR FIRST STEP
      </p>
      <h1 className="mt-5 text-4xl font-semibold tracking-tight">
        Make it yours, {session.user.name.split(" ")[0]}.
      </h1>
      <p className="mt-5 text-sm leading-7 text-[#7c8771]">
        Give your freelance workspace a name. You’ll own this space and invite
        clients to individual projects as we build the next release.
      </p>
      <OnboardingForm />
      <p className="mt-5 text-xs leading-6 text-[#8a947e]">
        Invited clients join an existing workspace through their invitation
        link.
      </p>
    </main>
  );
}
