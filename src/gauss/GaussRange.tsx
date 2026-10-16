'use client';
import {useId} from 'react';
import {Slider} from '@/components/ui/slider';
/* A slider as the integral lessons set theirs (Explorer, `Range`): named by its symbol, set large in the figure's
 * italic, with the words as its gloss, and a hidden label both the slider and its group point at, so a screen
 * reader hears what it moves. The page prints no numerals; `format` says the value aloud in its unit. */
export function GaussRange({label, value, min, max, step, onChange, format, valueText}: {
  label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void;
  format?: Intl.NumberFormatOptions; valueText?: (n: number) => string;
}) {
  const id = useId();
  const parts = label.split(' '), last = parts.at(-1) ?? '', symbol = last.length <= 2 && parts.length > 1 ? last : '', name = symbol ? parts.slice(0, -1).join(' ') : label;
  return <div className="exp-range gs-range">
    <div><span>{symbol && <i className="exp-sym">{symbol}</i>}<span className="exp-name">{name}</span></span></div>
    <span id={id} className="sr-only">{label}</span>
    <Slider aria-label={label} aria-labelledby={id} format={format} getAriaValueText={valueText ? (_: string, n: number) => valueText(n) : undefined}
      value={[value]} min={min} max={max} step={step} onValueChange={v => onChange(Array.isArray(v) ? v[0] : v)} />
  </div>;
}
