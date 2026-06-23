import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Activity,
  Clock,
  Users,
  Target,
  Award,
  Calendar,
  Download,
  Zap,
  Flame
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyticsButtonProps {
  icon: React.ReactNode;
  label: string;
  value?: string | number;
  description?: string;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'yellow';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  isActive?: boolean;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    text: 'text-blue-900 dark:text-blue-100',
    value: 'text-blue-700 dark:text-blue-300'
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-900/30',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
    text: 'text-green-900 dark:text-green-100',
    value: 'text-green-700 dark:text-green-300'
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-900/30',
    border: 'border-orange-200 dark:border-orange-800',
    icon: 'text-orange-600 dark:text-orange-400',
    text: 'text-orange-900 dark:text-orange-100',
    value: 'text-orange-700 dark:text-orange-300'
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-900/30',
    border: 'border-purple-200 dark:border-purple-800',
    icon: 'text-purple-600 dark:text-purple-400',
    text: 'text-purple-900 dark:text-purple-100',
    value: 'text-purple-700 dark:text-purple-300'
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    text: 'text-red-900 dark:text-red-100',
    value: 'text-red-700 dark:text-red-300'
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-600 dark:text-yellow-400',
    text: 'text-yellow-900 dark:text-yellow-100',
    value: 'text-yellow-700 dark:text-yellow-300'
  }
};

function AnalyticsButton({ 
  icon, 
  label, 
  value, 
  description, 
  color = 'blue', 
  size = 'md',
  onClick,
  isActive = false 
}: AnalyticsButtonProps) {
  const colors = colorClasses[color];
  
  const sizeClasses = {
    sm: 'p-3 min-h-[80px]',
    md: 'p-4 min-h-[100px]',
    lg: 'p-6 min-h-[120px]'
  };

  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const valueSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  return (
    <div 
      className={cn(
        "border rounded-lg transition-all duration-200 cursor-pointer select-none",
        colors.bg,
        colors.border,
        sizeClasses[size],
        isActive && "ring-2 ring-offset-2",
        isActive && color === 'blue' && "ring-blue-500",
        isActive && color === 'green' && "ring-green-500",
        isActive && color === 'orange' && "ring-orange-500",
        isActive && color === 'purple' && "ring-purple-500",
        isActive && color === 'red' && "ring-red-500",
        isActive && color === 'yellow' && "ring-yellow-500"
      )}
      onClick={onClick}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <div className={cn(colors.icon, iconSizes[size])}>
            {icon}
          </div>
          {value && (
            <div className={cn("font-bold", colors.value, valueSizes[size])}>
              {value}
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <div className={cn("font-medium", colors.text, textSizes[size])}>
            {label}
          </div>
          {description && (
            <div className={cn("text-xs mt-1 opacity-70", colors.text)}>
              {description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface AnalyticsButtonsProps {
  onButtonClick?: (action: string) => void;
  activeButton?: string;
  stats?: {
    activeEmployees: number;
    totalEmployees: number;
    avgProductivity: number;
    totalTasks: number;
    avgRating: number;
    totalHours: number;
  };
}

export function AnalyticsButtons({ onButtonClick, activeButton, stats }: AnalyticsButtonsProps) {
  const buttons = [
    {
      action: 'overview',
      icon: <Activity />,
      label: 'Overview',
      value: stats?.activeEmployees || 0,
      description: 'Active employees',
      color: 'blue' as const
    },
    {
      action: 'productivity',
      icon: <TrendingUp />,
      label: 'Productivity',
      value: stats ? `${Math.round(stats.avgProductivity)}%` : '0%',
      description: 'Average performance',
      color: 'green' as const
    },
    {
      action: 'tasks',
      icon: <Target />,
      label: 'Tasks',
      value: stats?.totalTasks || 0,
      description: 'Completed today',
      color: 'orange' as const
    },
    {
      action: 'hours',
      icon: <Clock />,
      label: 'Work Hours',
      value: stats ? `${stats.totalHours}h` : '0h',
      description: 'Total logged',
      color: 'purple' as const
    },
    {
      action: 'ratings',
      icon: <Award />,
      label: 'Ratings',
      value: stats ? stats.avgRating.toFixed(1) : '0.0',
      description: 'Average rating',
      color: 'yellow' as const
    },
    {
      action: 'team',
      icon: <Users />,
      label: 'Team View',
      value: stats?.totalEmployees || 0,
      description: 'Total members',
      color: 'blue' as const
    },
    {
      action: 'trends',
      icon: <BarChart3 />,
      label: 'Trends',
      description: 'Weekly analysis',
      color: 'green' as const
    },
    {
      action: 'reports',
      icon: <PieChart />,
      label: 'Reports',
      description: 'Generate insights',
      color: 'purple' as const
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
      {buttons.map((button) => (
        <AnalyticsButton
          key={button.action}
          icon={button.icon}
          label={button.label}
          value={button.value}
          description={button.description}
          color={button.color}
          size="sm"
          onClick={() => onButtonClick?.(button.action)}
          isActive={activeButton === button.action}
        />
      ))}
    </div>
  );
}

// Quick Action Buttons
interface QuickActionButtonsProps {
  onAction?: (action: string) => void;
}

export function QuickActionButtons({ onAction }: QuickActionButtonsProps) {
  const actions = [
    {
      action: 'export',
      icon: <Download />,
      label: 'Export Data',
      color: 'blue' as const
    },
    {
      action: 'calendar',
      icon: <Calendar />,
      label: 'Schedule View',
      color: 'green' as const
    },
    {
      action: 'performance',
      icon: <Zap />,
      label: 'Performance',
      color: 'orange' as const
    },
    {
      action: 'analytics',
      icon: <Flame />,
      label: 'Deep Analytics',
      color: 'red' as const
    }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action.action}
          variant="outline"
          size="sm"
          onClick={() => onAction?.(action.action)}
          className={cn(
            "flex items-center gap-2",
            action.color === 'blue' && "hover:bg-blue-50 hover:border-blue-300",
            action.color === 'green' && "hover:bg-green-50 hover:border-green-300",
            action.color === 'orange' && "hover:bg-orange-50 hover:border-orange-300",
            action.color === 'red' && "hover:bg-red-50 hover:border-red-300"
          )}
        >
          <span className={cn(
            action.color === 'blue' && "text-blue-600",
            action.color === 'green' && "text-green-600",
            action.color === 'orange' && "text-orange-600",
            action.color === 'red' && "text-red-600"
          )}>
            {action.icon}
          </span>
          {action.label}
        </Button>
      ))}
    </div>
  );
}

export default AnalyticsButton;