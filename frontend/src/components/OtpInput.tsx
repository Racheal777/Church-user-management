import { motion } from "framer-motion";
import { useMemo, useRef, type ClipboardEvent, type KeyboardEvent } from "react";

type OtpInputProps = {
  length: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

const DIGIT_PATTERN = /\d/;

function buildSlots(value: string, length: number) {
  const nextSlots = Array.from({ length }, () => "");

  value
    .replace(/\D/g, "")
    .slice(0, length)
    .split("")
    .forEach((digit, index) => {
      nextSlots[index] = digit;
    });

  return nextSlots;
}

export function OtpInput({ length, value, onChange, onComplete, disabled = false, autoFocus = false }: OtpInputProps) {
  const slots = useMemo(() => buildSlots(value, length), [length, value]);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  function focusSlot(index: number) {
    const target = inputRefs.current[index];
    target?.focus();
    target?.select();
  }

  function commit(nextSlots: string[], focusIndex?: number) {
    const nextValue = nextSlots.join("");
    onChange(nextValue);

    if (typeof focusIndex === "number") {
      window.requestAnimationFrame(() => focusSlot(focusIndex));
    }

    if (nextSlots.every(Boolean)) {
      window.requestAnimationFrame(() => onComplete?.(nextValue));
    }
  }

  function handleSlotChange(index: number, rawValue: string) {
    if (disabled) return;

    const digits = rawValue.replace(/\D/g, "");
    const nextSlots = [...slots];

    if (!digits) {
      nextSlots[index] = "";
      onChange(nextSlots.join(""));
      return;
    }

    digits.split("").forEach((digit, offset) => {
      const slotIndex = index + offset;
      if (slotIndex < length) {
        nextSlots[slotIndex] = digit;
      }
    });

    const nextFocusIndex = Math.min(index + digits.length, length - 1);
    commit(nextSlots, nextSlots.every(Boolean) ? undefined : nextFocusIndex);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();
      const nextSlots = [...slots];

      if (nextSlots[index]) {
        nextSlots[index] = "";
        onChange(nextSlots.join(""));
        return;
      }

      if (index > 0) {
        nextSlots[index - 1] = "";
        onChange(nextSlots.join(""));
        focusSlot(index - 1);
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusSlot(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      focusSlot(index + 1);
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    const pastedDigits = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pastedDigits) return;

    event.preventDefault();
    const nextSlots = [...slots];

    pastedDigits.split("").forEach((digit, offset) => {
      const slotIndex = index + offset;
      if (slotIndex < length) {
        nextSlots[slotIndex] = digit;
      }
    });

    const lastIndex = Math.min(index + pastedDigits.length, length - 1);
    commit(nextSlots, nextSlots.every(Boolean) ? undefined : lastIndex);
  }

  return (
    <div className="otp-group" role="group" aria-label={`${length}-digit code input`} style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}>
      {slots.map((digit, index) => (
        <motion.input
          key={index}
          ref={(node) => {
            inputRefs.current[index] = node;
          }}
          className="otp-slot"
          data-filled={digit ? "true" : "false"}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          enterKeyHint="done"
          maxLength={length}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          aria-label={`Digit ${index + 1}`}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => handleSlotChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          whileFocus={{ y: -2, scale: 1.01 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </div>
  );
}
