'use client';
// Wrapper client para poder usar HelpButton dentro del superadmin layout (Server Component)
import HelpButton from '@/components/help/HelpButton';

export default function SuperAdminHelpButton() {
    return <HelpButton className="text-white/80 hover:text-white hover:bg-white/10" />;
}
