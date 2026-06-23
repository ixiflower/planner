import * as React from "react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { Calendar, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"

interface EventToastProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  isStart?: boolean
  onClose?: () => void
  duration?: number
}

export function EventToast({
  title,
  description,
  isStart = true,
  onClose,
  duration = 5000,
  className,
  ...props
}: EventToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!isVisible) return null

  return (
    <Card
      className={cn(
        "fixed right-4 p-4 shadow-lg animate-in fade-in zoom-in duration-300",
        isStart ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950",
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        {isStart ? (
          <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
        ) : (
          <Clock className="h-5 w-5 text-red-600 dark:text-red-400" />
        )}
        <div className="flex-1">
          <h3
            className={cn(
              "font-medium",
              isStart
                ? "text-green-900 dark:text-green-100"
                : "text-red-900 dark:text-red-100"
            )}
          >
            {title}
          </h3>
          {description && (
            <p
              className={cn(
                "mt-1 text-sm",
                isStart
                  ? "text-green-700 dark:text-green-300"
                  : "text-red-700 dark:text-red-300"
              )}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}