import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb skeleton */}
        <div className="mb-6">
          <Skeleton className="h-5 w-48" />
        </div>
        
        {/* Header skeleton */}
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>

        {/* Stats Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg p-6 border border-slate-200">
              <div className="flex items-start justify-between mb-4">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>

        {/* Quick Actions skeleton */}
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 border-2 border-slate-200">
                <Skeleton className="w-12 h-12 rounded-lg mb-4" />
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-full mb-3" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>

        {/* Activity & Overview skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-lg p-6 border border-slate-200">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64 mb-6" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((j) => (
                  <Skeleton key={j} className="h-16 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CopilotSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-5 w-48 mb-6" />
        
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-96" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <Skeleton className="h-10 w-full" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="min-h-[300px] flex items-center justify-center">
              <div className="text-center">
                <Skeleton className="w-32 h-32 rounded-full mx-auto mb-4" />
                <Skeleton className="h-6 w-48 mx-auto mb-2" />
                <Skeleton className="h-4 w-64 mx-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-5 w-48 mb-6" />
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-5 w-96 mb-8" />
        
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-lg p-6 border border-slate-200">
              <Skeleton className="h-6 w-3/4 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
