/**
 * nav.js — Single source of truth for role-based navigation.
 * The navbar renders from this list; App.jsx guards the same routes by role.
 */

import { FiGrid, FiUpload, FiMic, FiAward, FiBookOpen, FiShield } from 'react-icons/fi';

export const ROLES = {
    candidate: 'candidate',
    recruiter: 'recruiter',
    admin: 'admin',
};

export const ALL_ROLES = Object.values(ROLES);
export const STAFF_ROLES = [ROLES.recruiter, ROLES.admin];

export const NAV_ITEMS = [
    { to: '/dashboard', label: 'Dashboard', icon: FiGrid, roles: ALL_ROLES },
    { to: '/resume', label: 'Resume', icon: FiUpload, roles: [ROLES.candidate] },
    { to: '/interview', label: 'Interview', icon: FiMic, roles: [ROLES.candidate] },
    { to: '/results', label: 'Results', icon: FiAward, roles: [ROLES.candidate] },
    { to: '/courses', label: 'Courses', icon: FiBookOpen, roles: ALL_ROLES },
    { to: '/admin', label: 'Admin', labels: { recruiter: 'Candidates' }, icon: FiShield, roles: STAFF_ROLES },
];

/** Items visible to a role, with role-specific labels resolved */
export const navItemsFor = (role) =>
    NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => ({ ...item, label: item.labels?.[role] || item.label }));
