import fs from 'fs';
import path from 'path';

const files = [
    'src/app/profiles/centro/CentroProfileClient.tsx',
    'src/app/profiles/club/ClubProfileClient.tsx',
    'src/app/profiles/profe/ProfeProfileClient.tsx',
    'src/app/profile/PlayerProfileClient.tsx',
    'src/app/tournaments/page.tsx',
];

const replacements = [
    // Contrast - Headers and Subtitles
    { from: /text-foreground\/60/g, to: 'text-muted-foreground' },
    { from: /text-foreground\/40/g, to: 'text-muted-foreground' },
    { from: /text-foreground\/30/g, to: 'text-muted-foreground' },
    { from: /text-foreground\/20/g, to: 'text-muted-foreground/60' },
    { from: /text-foreground\/10/g, to: 'text-muted-foreground/40' },

    // Player profile uses text-white/XX since it was dark-only
    { from: /text-white\/80/g, to: 'text-foreground/80' },
    { from: /text-white\/70/g, to: 'text-foreground/70' },
    { from: /text-white\/60/g, to: 'text-muted-foreground' },
    { from: /text-white\/50/g, to: 'text-muted-foreground' },
    { from: /text-white\/40/g, to: 'text-muted-foreground' },
    { from: /text-white\/30/g, to: 'text-muted-foreground' },
    { from: /text-white\/20/g, to: 'text-muted-foreground/60' },
    { from: /text-white\/10/g, to: 'text-muted-foreground/40' },

    // Indigo Text on Light backgrounds
    { from: /text-indigo-400/g, to: 'text-indigo-600 dark:text-indigo-400' },

    // Badge backgrounds
    { from: /bg-indigo-500\/10 border border-indigo-500\/20/g, to: 'bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 dark:border-indigo-500/30' },
    { from: /bg-indigo-500\/20 border border-indigo-500\/30/g, to: 'bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 dark:border-indigo-500/30' },

    // Tab Bar Active State - ensure white text on indigo background for both modes
    { from: /bg-indigo-600 text-foreground/g, to: 'bg-indigo-600 text-white' },

    // Tab Bar Inactive State - use muted-foreground
    { from: /text-foreground\/40 hover:text-foreground hover:bg-card/g, to: 'text-muted-foreground hover:text-foreground hover:bg-muted' },
    { from: /text-white\/40 hover:text-white hover:bg-card/g, to: 'text-muted-foreground hover:text-foreground hover:bg-muted' },

    // WhatsApp button contrast
    { from: /bg-emerald-500 hover:bg-emerald-600 text-foreground/g, to: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
];

files.forEach(file => {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        let original = content;

        replacements.forEach(({ from, to }) => {
            content = content.replace(from, to);
        });

        if (content !== original) {
            fs.writeFileSync(fullPath, content);
            console.log(`Updated: ${file}`);
        } else {
            console.log(`No changes needed for: ${file}`);
        }
    } else {
        console.error(`File not found: ${file}`);
    }
});
