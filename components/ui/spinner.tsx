import { cn } from '@/lib/utils';
import { Loader2Icon } from 'lucide-react';

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <output aria-label="Loading"><Loader2Icon
      data-slot="spinner"
      aria-hidden="true"
      className={cn('size-4 animate-spin motion-reduce:animate-none', className)}
      {...props}
    /></output>
  );
}

export { Spinner };
