import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface ProgressRingProps {
  progress: number;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { outer: 40, inner: 32, stroke: 4, text: 'text-xs' },
  md: { outer: 60, inner: 48, stroke: 6, text: 'text-sm' },
  lg: { outer: 80, inner: 64, stroke: 8, text: 'text-base' }
};

export function ProgressRing({ 
  progress, 
  size = 'md', 
  showText = true, 
  className 
}: ProgressRingProps) {
  const { outer, inner, stroke, text } = sizeMap[size];
  const normalizedProgress = Math.min(Math.max(progress, 0), 100);
  const circumference = 2 * Math.PI * (inner / 2);
  const strokeDashoffset = circumference - (normalizedProgress / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={outer} height={outer} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={outer / 2}
          cy={outer / 2}
          r={inner / 2}
          stroke="var(--background)"
          strokeWidth={stroke}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={outer / 2}
          cy={outer / 2}
          r={inner / 2}
          stroke="var(--primary)"
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
      {showText && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center font-semibold text-foreground text-center text-secondary",
          text
        )}>
          {Math.round(normalizedProgress)}%
        </div>
      )}
    </div>
  );
}