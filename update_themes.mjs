import fs from 'fs';
import path from 'path';

const filesToUpdate = [
    'src/app/profiles/club/ClubProfileClient.tsx',
    'src/app/profiles/centro/CentroProfileClient.tsx',
    'src/app/profiles/profe/ProfeProfileClient.tsx',
    'src/app/profile/PlayerProfileClient.tsx',
    'src/app/tournaments/fixture/TournamentManager.tsx',
    'src/app/tournaments/fixture/FixtureSetup.tsx',
    'src/app/tournaments/register/RegisterForm.tsx',
    'src/app/tournaments/page.tsx',
    'src/app/tournaments/create/CreateTournamentForm.tsx',
    'src/app/onboarding/page.tsx',
    'src/app/home/HomeClient.tsx',
    'src/app/ranking/RankingClient.tsx',
    'src/app/directory/DirectoryClient.tsx',
    'src/app/LandingPage.tsx',
    'src/app/feed/layout.tsx',
    'src/app/admin/layout.tsx'
];

filesToUpdate.forEach(file => {
    const fullPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(fullPath)) return;

    let content = fs.readFileSync(fullPath, 'utf8');

    // Backgrounds
    content = content.replace(/bg-\[#090A0F\]/g, 'bg-background');
    content = content.replace(/bg-slate-50 dark:bg-\[#090A0F\]/g, 'bg-background');
    content = content.replace(/dark:bg-\[#090A0F\]/g, 'bg-background');

    // Cards & Borders
    content = content.replace(/bg-white\/5/g, 'bg-card');
    content = content.replace(/border-white\/10/g, 'border-border');
    content = content.replace(/border-white\/5/g, 'border-border/50');
    content = content.replace(/border-\[#090A0F\]/g, 'border-background');
    content = content.replace(/border-slate-800/g, 'border-border');

    // Modals & Surfaces
    content = content.replace(/bg-\[#0D0F16\]/g, 'bg-card');
    content = content.replace(/bg-\[#0D0F1A\]/g, 'bg-card');
    content = content.replace(/bg-slate-800/g, 'bg-muted');

    // Typography
    content = content.replace(/text-slate-900 dark:text-slate-200/g, 'text-foreground');
    content = content.replace(/text-white pb-20/g, 'text-foreground pb-20');
    content = content.replace(/text-white pb-24/g, 'text-foreground pb-24');
    content = content.replace(/text-white flex items-center/g, 'text-foreground flex items-center');
    content = content.replace(/text-slate-700 dark:text-slate-300/g, 'text-foreground/80');

    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${file}`);
});
