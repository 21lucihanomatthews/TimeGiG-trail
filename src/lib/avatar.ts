/**
 * Helper utilities for rendering beautiful user avatars with name initials
 * and dynamic name-hashed background color shapes.
 */

export function getInitials(name?: string): string {
  if (!name) return 'U';
  const cleanName = name.trim();
  if (!cleanName) return 'U';
  
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  
  if (parts.length === 1) {
    // If it is a single word, return up to first 2 letters
    return parts[0].slice(0, 2).toUpperCase();
  }
  
  // If it has multiple words, return the first letter of the first and last word
  const firstInitial = parts[0].charAt(0);
  const lastInitial = parts[parts.length - 1].charAt(0);
  return (firstInitial + lastInitial).toUpperCase();
}

export function getAvatarColorClass(name?: string): string {
  if (!name) return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  
  const colors = [
    'bg-rose-100 text-rose-700 border-rose-200',
    'bg-orange-100 text-orange-700 border-orange-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-teal-100 text-teal-700 border-teal-200',
    'bg-sky-100 text-sky-700 border-sky-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    'bg-pink-100 text-pink-700 border-pink-200',
    'bg-purple-100 text-purple-700 border-purple-200',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
