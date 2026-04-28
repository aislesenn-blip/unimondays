"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface DateTimePickerProps {
  date?: Date
  setDate: (date: Date | undefined) => void
  disabled?: boolean
  className?: string
}

export function DateTimePicker({ date, setDate, disabled, className }: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)
  const [timeValue, setTimeValue] = React.useState<string>(
    date ? format(date, "HH:mm") : "00:00"
  )
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    if (selectedDate) {
      const [hours, minutes] = timeValue.split(":").map(Number)
      const newDate = new Date(selectedDate)
      newDate.setHours(hours || 0, minutes || 0, 0, 0)
      setDate(newDate)
    } else {
      setDate(undefined)
    }
  }, [selectedDate, timeValue, setDate])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal border-muted-foreground/20 hover:bg-accent/50 transition-colors shadow-sm",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
          {date ? format(date, "PPP p") : <span>Pick a date & time</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-border/50 overflow-hidden" align="start">
        <div className="bg-gradient-to-b from-blue-50/50 to-transparent">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            initialFocus
            className="rounded-t-2xl"
          />
          <div className="p-3 border-t border-border/50 bg-background/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                type="time"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
                className="h-8 text-sm w-[120px] rounded-lg border-muted-foreground/20"
              />
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-100/50 rounded-lg"
                onClick={() => setIsOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
