import { SkeletonPageHeader, SkeletonList } from "@/components/skeletons/skeleton-primitives";
export default function Loading() {
  return <div className="max-w-3xl mx-auto space-y-5"><SkeletonPageHeader /><SkeletonList count={4} /></div>;
}
