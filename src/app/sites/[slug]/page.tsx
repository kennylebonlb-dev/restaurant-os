import { BookingExperience } from "@/components/booking/booking-experience";

type SitePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function SitePage({ params }: SitePageProps) {
  const { slug } = await params;
  return <BookingExperience initialRestaurantSlug={slug} />;
}
