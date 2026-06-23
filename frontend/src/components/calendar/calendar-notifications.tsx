import { useState } from "react"
import { Bell, BellOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EventToast } from "@/components/ui/event-toast"
import { useCalendarEvents } from "@/hooks/use-calendar-events"
interface CalendarEvent {
  id: string
  title: string
  startTime: Date
  endTime: Date
}

interface CalendarNotificationsProps {
  events: CalendarEvent[]
}

export function CalendarNotifications({ events }: CalendarNotificationsProps) {
  const [soundEnabled, setSoundEnabled] = useState(false)
  const { activeNotifications, removeNotification } = useCalendarEvents(
    events,
    soundEnabled
  )

  return (
    <>
      <Button
        onClick={() => setSoundEnabled(!soundEnabled)}
        variant={soundEnabled ? "default" : "outline"}
        size="icon"
        className="relative h-10 w-10 rounded-lg transition-all duration-200"
        aria-label={soundEnabled ? "Disable notifications" : "Enable notifications"}
        aria-pressed={soundEnabled}
      >
        {soundEnabled ? (
          <Bell className="w-5 h-5 ml-0.5" />
        ) : (
          <BellOff className="w-5 h-5 ml-0.5" />
        )}
        {soundEnabled && (
          <span
            className="absolute -top-1 -right-1 size-3 animate-ping rounded-full bg-green-400 dark:bg-green-300"
            aria-hidden="true"
          />
        )}
      </Button>
      
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {activeNotifications.map((notification) => (
          <EventToast
            key={notification.id}
            title={notification.title}
            description={notification.description}
            isStart={notification.isStart}
            onClose={() => removeNotification(notification.id)}
            style={{ bottom: `${activeNotifications.indexOf(notification) * 88}px` }}
          />
        ))}
      </div>
    </>
  )
}