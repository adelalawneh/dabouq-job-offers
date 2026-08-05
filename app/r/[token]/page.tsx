import { notFound } from "next/navigation";
import { getOfferByToken, expireStaleOffers } from "@/lib/offers";
import { CandidateResponse } from "@/components/candidate-response";

export const dynamic = "force-dynamic";

export default async function CandidatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await expireStaleOffers();
  const offer = await getOfferByToken(token);
  if (!offer) notFound();

  return (
    <CandidateResponse
      offer={{
        id: offer.id,
        token: offer.token,
        status: offer.status,
        candidateName: offer.candidateName,
        jobTitle: offer.jobTitle,
        department: offer.department,
        location: offer.location,
        totalSalary: offer.totalSalary,
        insurance: offer.insurance,
        netSalary: offer.netSalary,
        language: offer.language,
        expiresAt: offer.expiresAt ? offer.expiresAt.toISOString() : null,
      }}
    />
  );
}
