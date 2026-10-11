import type { ComponentType } from "react";
import type { LandingData, LandingVariant } from "@/lib/landing";
import LandingPage from "./LandingPage";
import SportLanding from "./SportLanding";
import TelemetryLanding from "./TelemetryLanding";

// Componente de cada landing registrada en src/lib/landing.ts.
export const LANDING_COMPONENTS: Record<LandingVariant, ComponentType<LandingData>> = {
    remate: SportLanding,
    telemetria: TelemetryLanding,
    clasica: LandingPage,
};

export function Landing({ variant, data }: { variant: LandingVariant; data: LandingData }) {
    const Component = LANDING_COMPONENTS[variant];
    return <Component {...data} />;
}
