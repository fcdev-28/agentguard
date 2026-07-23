"use client";
import { motion } from "motion/react";
import { springs, motionTokens } from "@/lib/motion-tokens";
import type { ComponentProps } from "react";

export function MotionButton({
  disabled,
  ...props
}: ComponentProps<typeof motion.button>) {
  // Un botón deshabilitado no da feedback de pulsación: sin scale en hover/tap.
  return (
    <motion.button
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: motionTokens.scale.pop }}
      whileTap={disabled ? undefined : { scale: motionTokens.scale.press }}
      transition={springs.snappy}
      {...props}
    />
  );
}
