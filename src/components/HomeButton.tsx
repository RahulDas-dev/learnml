import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HomeButtonProps {
  /** Override the default navigate('/') — e.g. an explain flow's onGoHome reset. */
  onClick?: () => void;
  size?: number;
  className?: string;
}

/**
 * Navbar Home button: transparent on hover with the icon filling in. Shared across
 * every navbar so the look and behaviour stay in one place.
 */
export function HomeButton({ onClick, size = 16, className }: HomeButtonProps) {
  const navigate = useNavigate();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick ?? (() => navigate('/'))}
      title="Home"
      aria-label="Home"
      className={cn('group hover:bg-transparent', className)}
    >
      <Home size={size} strokeWidth={1.75} className="group-hover:fill-current" />
    </Button>
  );
}
