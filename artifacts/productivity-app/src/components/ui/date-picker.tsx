import { useState } from "react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek,
  isSameDay, isSameMonth, isToday, isPast, addMonths, subMonths,
} from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value?: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = "Pick a date", className }: DatePickerProps) {
  const selected = value ? new Date(value) : null;
  const [viewMonth, setViewMonth] = useState(selected ?? new Date());
  const [open, setOpen] = useState(false);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd   = endOfMonth(viewMonth);
  const calStart   = startOfWeek(monthStart);
  const calEnd     = endOfWeek(monthEnd);
  const days       = eachDayOfInterval({ start: calStart, end: calEnd });

  const handleSelect = (day: Date) => {
    onChange(day.toISOString());
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors",
            "hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex items-center gap-2">
            <CalendarIcon className="w-3.5 h-3.5 opacity-60" />
            {selected
              ? format(selected, "dd/MM/yy")
              : placeholder}
          </span>
          {selected && (
            <span
              onClick={handleClear}
              className="ml-2 opacity-50 hover:opacity-100 transition-opacity"
              role="button"
              aria-label="Clear date"
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-auto p-0 bg-card border-border/70 shadow-xl"
      >
        {/* Month navigation */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-border/40">
          <button
            type="button"
            onClick={() => setViewMonth(m => subMonths(m, 1))}
            className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-foreground">
            {format(viewMonth, "MMM")} <span className="text-primary">{format(viewMonth, "yy")}</span>
          </span>
          <button
            type="button"
            onClick={() => setViewMonth(m => addMonths(m, 1))}
            className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 px-2 pt-2">
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-muted-foreground/50 pb-1">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-0.5 px-2 pb-3">
          {days.map((day, i) => {
            const isSelected = selected ? isSameDay(day, selected) : false;
            const isThisMonth = isSameMonth(day, viewMonth);
            const todayDate = isToday(day);

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(day)}
                className={cn(
                  "w-8 h-8 rounded-lg text-xs font-medium transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                    : todayDate
                    ? "bg-primary/10 text-primary font-bold ring-1 ring-primary/40"
                    : !isThisMonth
                    ? "text-muted-foreground/30 hover:bg-secondary"
                    : "text-foreground hover:bg-secondary",
                )}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>

        {/* Today shortcut */}
        <div className="border-t border-border/40 px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => handleSelect(new Date())}
          >
            Today — {format(new Date(), "dd/MM/yy")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
