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
    // 1. Inactive tabs hover and bg
    { from: /hover:bg-card/g, to: 'hover:bg-muted' },
    { from: /hover:text-white/g, to: 'hover:text-foreground' },

    // 2. Active tabs should ALWAYS have white text on indigo
    { from: /bg-indigo-600 text-foreground/g, to: 'bg-indigo-600 text-white' },

    // 3. Low contrast opacities
    { from: /text-foreground\/60/g, to: 'text-foreground/80' },
    { from: /text-foreground\/70/g, to: 'text-foreground/80' },
    { from: /text-white\/70/g, to: 'text-foreground/80' },
    { from: /text-white\/60/g, to: 'text-muted-foreground' },

    // 4. Ensure badges are theme-aware
    { from: /text-indigo-600 dark:text-indigo-600/g, to: 'text-indigo-600' },
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
