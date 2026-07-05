import { TodayPageClient } from "@/features/today/today-page-client";

type TodayPageProps = {
  searchParams?: {
    date?: string;
  };
};

export default function TodayPage({ searchParams }: TodayPageProps) {
  return <TodayPageClient date={searchParams?.date} />;
}
