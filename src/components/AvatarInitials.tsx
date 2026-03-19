import { cn } from '@/lib/utils';

interface AvatarInitialsProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const colors = [
  'from-[hsl(239,84%,67%)] to-[hsl(258,90%,66%)]',
  'from-[hsl(188,95%,43%)] to-[hsl(199,89%,48%)]',
  'from-[hsl(160,84%,39%)] to-[hsl(142,71%,45%)]',
  'from-[hsl(38,92%,50%)] to-[hsl(25,95%,53%)]',
  'from-[hsl(0,84%,60%)] to-[hsl(340,82%,52%)]',
  'from-[hsl(280,84%,60%)] to-[hsl(258,90%,66%)]',
];

function hashCode(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function AvatarInitials({ name, size = 'md', className }: AvatarInitialsProps) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const colorIdx = hashCode(name) % colors.length;

  const sizeClass = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
  }[size];

  return (
    <div className={cn(
      'rounded-full bg-gradient-to-br flex items-center justify-center font-semibold text-white shrink-0',
      colors[colorIdx],
      sizeClass,
      className
    )}>
      {initials}
    </div>
  );
}
