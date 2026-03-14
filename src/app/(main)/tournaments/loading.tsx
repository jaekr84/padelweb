"use client";

import { Trophy, Calendar, MapPin, Activity } from "lucide-react";

export default function TournamentsLoading() {
    return (
        <div className="min-h-screen bg-background text-foreground pb-24 font-sans px-4 pt-6 max-w-3xl mx-auto">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="w-20 h-3 bg-muted rounded-full mb-2 animate-pulse" />
                    <div className="w-40 h-8 bg-muted rounded-xl animate-pulse" />
                </div>
            </div>

            {/* Stats Skeleton */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-card border border-border rounded-2xl p-3 flex flex-col items-center gap-2 shadow-sm h-24 animate-pulse">
                        <div className="w-4 h-4 bg-muted rounded-full" />
                        <div className="w-8 h-6 bg-muted rounded-md" />
                        <div className="w-12 h-2 bg-muted rounded-full" />
                    </div>
                ))}
            </div>

            {/* Filter Skeleton */}
            <div className="flex gap-2 mb-6">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-24 h-8 bg-muted rounded-full animate-pulse shrink-0" />
                ))}
            </div>

            {/* List Skeleton */}
            <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-card border border-border rounded-3xl p-4 flex flex-col gap-4 shadow-sm animate-pulse">
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 bg-muted rounded-2xl shrink-0" />
                            <div className="flex-1">
                                <div className="w-3/4 h-4 bg-muted rounded-md mb-2" />
                                <div className="w-1/2 h-3 bg-muted rounded-md mb-3" />
                                <div className="flex gap-4">
                                    <div className="w-16 h-3 bg-muted rounded-full" />
                                    <div className="w-16 h-3 bg-muted rounded-full" />
                                </div>
                            </div>
                        </div>
                        <div className="h-10 bg-muted/50 rounded-xl" />
                    </div>
                ))}
            </div>
        </div>
    );
}
