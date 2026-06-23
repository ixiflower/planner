'use client'

import { useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

export function TaskManager() {
  const [date, setDate] = useState<Date | undefined>(new Date(2025, 5, 20))
  const [selectedTime, setSelectedTime] = useState<string | null>('10:00')

  const timeSlots = Array.from({ length: 37 }, (_, i) => {
    const totalMinutes = i * 15
    const hour = Math.floor(totalMinutes / 60) + 9
    const minute = totalMinutes % 60

    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  })

  return (
    <div className="flex justify-center w-full">
      <Card className='gap-0 p-0 w-full max-w-2xl'>
        <CardHeader className='flex h-max justify-center border-b !p-4'>
          <CardTitle>Task Manager</CardTitle>
        </CardHeader>
        <CardContent className='relative p-0 w-full'>
          <div className='p-2'>
            <Calendar
              mode='single'
              selected={date}
              onSelect={setDate}
              defaultMonth={date}
              showOutsideDays={false}
              className='bg-transparent p-0 [--cell-size:--spacing(10)]'
              formatters={{
                formatWeekdayName: date => {
                  return date.toLocaleString('en-US', { weekday: 'short' })
                }
              }}
            />
          </div>
          <div className='flex w-full flex-col gap-4 border-t max-md:h-60 md:border-t-0 md:border-l'>
            <ScrollArea className='h-full'>
              <div className='flex flex-col gap-2 p-2'>
                {timeSlots.map(time => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? 'default' : 'outline'}
                    onClick={() => setSelectedTime(time)}
                    className='w-full shadow-none'
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
        <CardFooter className='flex flex-col gap-4 border-t px-4 !py-5 md:flex-row'>
          <div className='flex items-center gap-2 text-sm'>
            {date && selectedTime ? (
              <>
                <CircleCheck className='size-5 stroke-green-600 dark:stroke-green-400' />
                <span>
                  Adding a task for{' '}
                  <span className='font-medium'>
                    {' '}
                    {date?.toLocaleDateString('en-US', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })}{' '}
                  </span>
                  at <span className='font-medium'>{selectedTime}</span>.
                </span>
              </>
            ) : (
              <>Select a date and time for your task.</>
            )}
          </div>
          <Button disabled={!date || !selectedTime} className='w-full md:ml-auto md:w-auto' variant='outline'>
            Continue
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}