"use client";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { usePathname } from "next/navigation";
import { motionTokens } from "@/lib/motion-tokens";

const variants = {
  initial: { opacity: 0, y: motionTokens.distance.sm },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -motionTokens.distance.sm },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // reducedMotion="user" hace que TODO el motion bajo el contenido de página
  // (esta transición, el stagger de las listas y los MotionButton) respete
  // prefers-reduced-motion: desactiva los transforms y deja solo la opacidad.
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          variants={variants}
          initial="initial"
          animate="enter"
          exit="exit"
          transition={{
            duration: motionTokens.duration.normal,
            ease: motionTokens.easing.smooth,
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
