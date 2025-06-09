// src/components/TaskCardSkeleton.tsx
// Provides a skeleton loading state for the TaskCard component.
// Used in Dashboard.tsx to indicate tasks are being loaded.

const TaskCardSkeleton = () => {
  return (
    <div className="glass-card overflow-hidden animate-pulse">
      <div className="p-5">
        {/* Task Header Skeleton */}
        <div className="flex justify-between items-start mb-4">
          <div className="h-5 bg-slate-700 rounded w-3/4"></div> {/* Title */}
          <div className="h-5 bg-slate-700 rounded w-1/6"></div> {/* Status */}
        </div>

        {/* Task Details Skeleton */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center">
            <div className="h-4 w-4 bg-slate-700 rounded-full mr-2"></div> {/* Icon */}
            <div className="h-4 bg-slate-700 rounded w-1/2"></div> {/* Detail text */}
          </div>
          <div className="flex items-center">
            <div className="h-4 w-4 bg-slate-700 rounded-full mr-2"></div> {/* Icon */}
            <div className="h-4 bg-slate-700 rounded w-2/3"></div> {/* Detail text */}
          </div>
          <div className="flex items-center">
            <div className="h-4 w-4 bg-slate-700 rounded-full mr-2"></div> {/* Icon */}
            <div className="h-4 bg-slate-700 rounded w-1/3"></div> {/* Detail text */}
          </div>
        </div>

        {/* Actions Skeleton */}
        <div className="flex justify-end pt-3 border-t border-white/10">
           <div className="h-8 bg-slate-700 rounded w-1/4"></div> {/* Button placeholder */}
        </div>
      </div>
    </div>
  );
};

export default TaskCardSkeleton;
