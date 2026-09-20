import { notFound } from "next/navigation";
import { getOffer } from "@/lib/offers";
import { OfferForm } from "@/components/offer-form";

export const dynamic = "force-dynamic";

export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const offer = await getOffer(id);
  if (!offer) notFound();

  return (
    <OfferForm
      mode="edit"
      offerId={offer.id}
      initialOffer={{
        candidateName: offer.candidateName,
        candidateEmail: offer.candidateEmail,
        candidateNationality: offer.candidateNationality,
        documentNumber: offer.documentNumber,
        jobTitle: offer.jobTitle,
        department: offer.department,
        location: offer.location,
        contractType: offer.contractType,
        contractDuration: offer.contractDuration,
        workDays: offer.workDays,
        probation: offer.probation,
        annualLeave: offer.annualLeave,
        totalSalary: offer.totalSalary,
        insurance: offer.insurance,
        basic: offer.basic,
        housing: offer.housing,
        transport: offer.transport,
        netSalary: offer.netSalary,
        language: offer.language,
        footerSalaryReview: offer.footerSalaryReview,
        footerValidity: offer.footerValidity,
        footerAcceptance: offer.footerAcceptance,
        footerRejection: offer.footerRejection,
      }}
    />
  );
}
