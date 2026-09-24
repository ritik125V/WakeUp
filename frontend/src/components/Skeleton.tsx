'use client';

import React from 'react';

export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      style={style}
      className={`animate-pulse bg-neutral-900/70 rounded-lg ${className}`}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Sleek Minimal Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Streamlined Stats Summary Bar Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-neutral-950 rounded-2xl flex items-center justify-between shadow-md border-none">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-12" />
          </div>
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
        <div className="p-4 bg-neutral-950 rounded-2xl flex items-center justify-between shadow-md border-none">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-6 w-12" />
          </div>
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
      </div>

      {/* Monitored Backend Services Skeleton List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>

        {[1, 2].map((i) => (
          <div key={i} className="p-5 bg-neutral-950 rounded-2xl space-y-4 border-none shadow-md">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <div className="p-4 bg-neutral-900/40 rounded-xl space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-6 w-full rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatusPagesSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 bg-neutral-950 rounded-2xl space-y-4 border-none shadow-md">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <div className="pt-3 border-t border-neutral-900/60 flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <div className="flex gap-2">
                <Skeleton className="h-7 w-16 rounded-lg" />
                <Skeleton className="h-7 w-24 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EndpointDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in font-mono">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      {/* Main Endpoint Title & Badge */}
      <div className="p-6 bg-neutral-950 rounded-2xl space-y-4 shadow-md border-none">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-60" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3 bg-neutral-900/40 rounded-xl space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Skeleton */}
      <div className="p-6 bg-neutral-950 rounded-2xl space-y-3 shadow-md border-none">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-full rounded-xl" />
      </div>

      {/* Incidents Accordion Skeleton */}
      <div className="p-6 bg-neutral-950 rounded-2xl space-y-3 shadow-md border-none">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function WorkflowsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-5 bg-neutral-950 rounded-2xl flex items-center justify-between shadow-md border-none">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PublicStatusSkeleton() {
  return (
    <div className="w-full max-w-3xl space-y-6 my-6 font-mono z-10">
      {/* Announcement Skeleton */}
      <Skeleton className="h-10 w-full rounded-xl" />

      {/* Hero Banner Skeleton */}
      <Skeleton className="h-44 sm:h-56 w-full rounded-xl" />

      {/* Header Skeleton */}
      <div className="text-center space-y-3">
        <div className="flex justify-center gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-6 w-36 rounded-full" />
        </div>
        <Skeleton className="h-8 w-64 mx-auto" />
        <Skeleton className="h-4 w-96 mx-auto" />
      </div>

      {/* Telemetry Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>

      {/* Overall Banner Skeleton */}
      <Skeleton className="h-16 w-full rounded-xl" />

      {/* Monitored Services Skeleton */}
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="p-4 bg-neutral-950 rounded-xl space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-6 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
