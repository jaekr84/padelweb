"use client";

export default function ProfileLoading() {
    return (
        <div className="min-h-screen bg-background text-foreground pb-24 font-sans max-w-lg mx-auto overflow-hidden">
            {/* Upper Profile Section Skeleton */}
            <div className="relative h-48 bg-muted animate-pulse">
                {/* Back button */}
                <div className="absolute top-6 left-6 w-8 h-8 rounded-full bg-background/20" />
            </div>

            <div className="px-6 relative -mt-20 z-10">
                {/* Profile Pic */}
                <div className="w-32 h-32 rounded-[2.5rem] bg-card border-4 border-background animate-pulse mb-4" />

                {/* Info */}
                <div className="flex flex-col gap-2 mb-6">
                    <div className="w-48 h-7 bg-muted rounded-xl animate-pulse" />
                    <div className="w-32 h-4 bg-muted/60 rounded-md animate-pulse" />
                    <div className="flex gap-2 mt-2">
                        <div className="w-20 h-6 bg-muted rounded-full animate-pulse" />
                        <div className="w-20 h-6 bg-muted rounded-full animate-pulse" />
                    </div>
                </div>

                {/* Tabs Skeleton */}
                <div className="flex gap-4 mb-8">
                    <div className="w-24 h-10 bg-muted/50 rounded-2xl animate-pulse" />
                    <div className="w-24 h-10 bg-muted/50 rounded-2xl animate-pulse" />
                    <div className="w-24 h-10 bg-muted/50 rounded-2xl animate-pulse" />
                </div>

                {/* Content Cards */}
                <div className="flex flex-col gap-4">
                    {[1, 2].map(i => (
                        <div key={i} className="bg-card border border-border rounded-3xl p-5 shadow-sm animate-pulse">
                            <div className="w-1/2 h-5 bg-muted rounded-md mb-4" />
                            <div className="w-full h-4 bg-muted/60 rounded-md mb-2" />
                            <div className="w-3/4 h-4 bg-muted/60 rounded-md" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
