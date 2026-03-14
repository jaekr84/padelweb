"use client";

export default function HomeLoading() {
    return (
        <div className="min-h-screen bg-background text-foreground pb-24 font-sans px-4 pt-6 md:pt-12 max-w-2xl mx-auto">
            {/* Header Skeleton */}
            <div className="mb-6 px-1">
                <div className="w-20 h-3 bg-muted rounded-full mb-2 animate-pulse" />
                <div className="w-32 h-8 bg-muted rounded-xl animate-pulse" />
            </div>

            {/* Compose Post Skeleton */}
            <div className="bg-card border border-border rounded-3xl p-4 mb-8 shadow-sm animate-pulse">
                <div className="flex gap-3 mb-4">
                    <div className="w-10 h-10 bg-muted rounded-full shrink-0" />
                    <div className="w-full h-12 bg-muted/50 rounded-2xl" />
                </div>
                <div className="flex justify-between items-center ml-13">
                    <div className="w-8 h-8 bg-muted rounded-full" />
                    <div className="w-24 h-8 bg-muted rounded-full" />
                </div>
            </div>

            {/* Posts List Skeleton */}
            <div className="flex flex-col gap-4">
                {[1, 2].map(i => (
                    <div key={i} className="bg-card border border-border rounded-3xl p-4 sm:p-5 shadow-sm animate-pulse">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-muted rounded-full shrink-0" />
                            <div className="flex flex-col gap-2 flex-1">
                                <div className="w-1/3 h-4 bg-muted rounded-md" />
                                <div className="w-1/4 h-3 bg-muted rounded-md" />
                            </div>
                        </div>
                        <div className="pl-13 flex flex-col gap-3">
                            <div className="w-full h-4 bg-muted rounded-md" />
                            <div className="w-5/6 h-4 bg-muted rounded-md" />
                            <div className="w-full aspect-video bg-muted/50 rounded-2xl mt-2" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
