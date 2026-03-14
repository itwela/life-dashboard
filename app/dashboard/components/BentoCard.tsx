"use client";

import { useRef, useEffect, useCallback, useState, type ReactNode } from "react";
import gsap from "gsap";
import { HyperText } from "@/components/ui/hyper-text";
import { TextAnimate } from "@/components/ui/text-animate";
import { TypingAnimation } from "@/components/ui/typing-animation";

export type BentoCardKey = "finances" | "school" | "fitness" | "reading" | "projects" | "content";

const CARD_STYLES: Record<
  BentoCardKey,
  { shadowRest: string; shadowHover: string; borderHover: string }
> = {
  finances: {
    shadowRest: "0 0 30px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
    shadowHover: "0 0 40px rgba(74,222,128,0.3), 0 8px 32px rgba(0,0,0,0.3)",
    borderHover: "rgba(74,222,128,0.45)",
  },
  school: {
    shadowRest: "0 0 30px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
    shadowHover: "0 12px 40px rgba(96,165,250,0.25), 0 0 30px rgba(96,165,250,0.2)",
    borderHover: "rgba(96,165,250,0.5)",
  },
  fitness: {
    shadowRest: "0 0 30px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
    shadowHover: "0 0 45px rgba(251,146,60,0.35), 0 10px 35px rgba(0,0,0,0.25)",
    borderHover: "rgba(251,146,60,0.55)",
  },
  reading: {
    shadowRest: "0 0 30px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
    shadowHover: "0 10px 38px rgba(192,132,252,0.25), 0 0 25px rgba(192,132,252,0.15)",
    borderHover: "rgba(192,132,252,0.45)",
  },
  projects: {
    shadowRest: "0 0 30px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
    shadowHover: "0 0 42px rgba(251,191,36,0.32), 0 8px 30px rgba(0,0,0,0.28)",
    borderHover: "rgba(251,191,36,0.55)",
  },
  content: {
    shadowRest: "0 0 30px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
    shadowHover: "0 0 50px rgba(34,211,238,0.28), inset 0 0 30px rgba(34,211,238,0.04)",
    borderHover: "rgba(34,211,238,0.5)",
  },
};

interface BentoCardProps {
  cardKey: BentoCardKey;
  title: string;
  subtitle: string;
  icon: string;
  line1: string;
  line2?: string;
  accent: string;
  onClick: () => void;
  chart?: ReactNode;
}

const textCls = {
  title: "text-sm font-bold text-white truncate",
  subtitle: "text-[11px] text-white/45 truncate",
  line1: "text-base font-bold truncate",
  line2: "text-[11px] text-white/50 truncate",
  knowMore: "text-[11px] font-medium text-[#60c8ff]",
};

export default function BentoCard({
  cardKey,
  title,
  subtitle,
  icon,
  line1,
  line2,
  accent,
  onClick,
  chart,
}: BentoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const shimmerRef = useRef<HTMLDivElement>(null);
  const idleTlRef = useRef<gsap.core.Timeline | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const styles = CARD_STYLES[cardKey];

  const setupIdle = useCallback(() => {
    const card = cardRef.current;
    const shimmer = shimmerRef.current;
    if (!card) return;

    idleTlRef.current?.kill();
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0 });

    switch (cardKey) {
      case "finances":
        tl.to(card, { scale: 1.005, duration: 2, ease: "sine.inOut" }).to(card, { scale: 1, duration: 2, ease: "sine.inOut" });
        break;
      case "school":
        tl.to(card, { y: -4, duration: 2, ease: "sine.inOut" }).to(card, { y: 0, duration: 2, ease: "sine.inOut" });
        break;
      case "fitness":
        tl.to(card, { scale: 1.012, duration: 0.4, ease: "power2.inOut" })
          .to(card, { scale: 1, duration: 0.4, ease: "power2.inOut" })
          .to({}, { duration: 1.2 });
        break;
      case "reading":
        if (shimmer) {
          tl.fromTo(shimmer, { xPercent: -100 }, { xPercent: 100, duration: 5, ease: "none", repeat: -1 });
        }
        break;
      case "projects":
        tl.to(card, { scale: 1.008, duration: 0.6, ease: "sine.inOut" }).to(card, { scale: 1, duration: 0.6, ease: "sine.inOut" });
        tl.to({}, { duration: 2 });
        break;
      case "content":
        tl.to(card, { scale: 1.004, duration: 2.5, ease: "sine.inOut" }).to(card, { scale: 1, duration: 2.5, ease: "sine.inOut" });
        break;
    }

    idleTlRef.current = tl;
  }, [cardKey]);

  const handleMouseEnter = useCallback(() => {
    const card = cardRef.current;
    const iconEl = iconRef.current;
    if (!card) return;

    idleTlRef.current?.pause();
    setIsHovered(true);

    const duration = 0.28;
    const ease = "power2.out";

    switch (cardKey) {
      case "finances":
        gsap.to(card, { scale: 1.03, boxShadow: styles.shadowHover, borderColor: styles.borderHover, duration, ease });
        if (iconEl) gsap.to(iconEl, { scale: 1.08, duration: 0.2, ease });
        break;
      case "school":
        gsap.to(card, { y: -6, boxShadow: styles.shadowHover, borderColor: styles.borderHover, duration, ease });
        if (iconEl) gsap.to(iconEl, { y: -2, scale: 1.1, duration: 0.2, ease: "back.out(1.2)" });
        break;
      case "fitness":
        gsap.to(card, { scale: 1.04, boxShadow: styles.shadowHover, borderColor: styles.borderHover, duration, ease });
        if (iconEl) gsap.to(iconEl, { scale: 1.2, duration: 0.2, ease: "back.out(1.5)" });
        break;
      case "reading":
        gsap.to(card, { y: -4, scale: 1.01, boxShadow: styles.shadowHover, borderColor: styles.borderHover, duration, ease });
        if (iconEl) gsap.to(iconEl, { rotation: 5, duration: 0.25, ease: "sine.out" });
        break;
      case "projects":
        gsap.to(card, { scale: 1.03, rotation: 0.5, boxShadow: styles.shadowHover, borderColor: styles.borderHover, duration, ease });
        if (iconEl) gsap.to(iconEl, { scale: 1.15, duration: 0.2, ease: "power2.out" });
        break;
      case "content":
        gsap.to(card, { scale: 1.02, boxShadow: styles.shadowHover, borderColor: styles.borderHover, duration, ease });
        if (iconEl) gsap.to(iconEl, { scale: 1.1, duration: 0.2, ease: "sine.out" });
        break;
    }
  }, [cardKey, styles.shadowHover, styles.borderHover]);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    const iconEl = iconRef.current;
    if (!card) return;

    setIsHovered(false);
    gsap.to(card, {
      scale: 1,
      y: 0,
      rotation: 0,
      boxShadow: styles.shadowRest,
      borderColor: "rgba(255,255,255,0.08)",
      duration: 0.35,
      ease: "power2.out",
      onComplete: () => { idleTlRef.current?.restart(); },
    });
    if (iconEl) gsap.to(iconEl, { y: 0, scale: 1, rotation: 0, duration: 0.25, ease: "power2.out" });
  }, [styles.shadowRest]);

  useEffect(() => {
    setupIdle();
    return () => { idleTlRef.current?.kill(); };
  }, [setupIdle]);

  const renderTitle = () => {
    if (!isHovered) return <h2 className={textCls.title}>{title}</h2>;
    const key = `title-${cardKey}-${isHovered}`;
    switch (cardKey) {
      case "finances":
        return (
          <HyperText key={key} as="h2" className={textCls.title} duration={500} animateOnHover={false} startOnView={false}>
            {title}
          </HyperText>
        );
      case "school":
        return (
          <TextAnimate key={key} as="h2" animation="blurInUp" by="character" className={textCls.title} startOnView={false} duration={0.25}>
            {title}
          </TextAnimate>
        );
      case "fitness":
        return (
          <TextAnimate key={key} as="h2" animation="scaleUp" by="word" className={textCls.title} startOnView={false} duration={0.2}>
            {title}
          </TextAnimate>
        );
      case "reading":
        return (
          <TextAnimate key={key} as="h2" animation="slideLeft" by="character" className={textCls.title} startOnView={false} duration={0.2}>
            {title}
          </TextAnimate>
        );
      case "projects":
        return (
          <HyperText key={key} as="h2" className={textCls.title} duration={400} animateOnHover={false} startOnView={false}>
            {title}
          </HyperText>
        );
      case "content":
        return (
          <TextAnimate key={key} as="h2" animation="blurInDown" by="word" className={textCls.title} startOnView={false} duration={0.25}>
            {title}
          </TextAnimate>
        );
    }
  };

  const renderSubtitle = () => {
    if (!isHovered) return <p className={textCls.subtitle}>{subtitle}</p>;
    switch (cardKey) {
      case "school":
        return (
          <TextAnimate as="p" animation="slideDown" by="word" className={textCls.subtitle} startOnView={false} duration={0.2}>
            {subtitle}
          </TextAnimate>
        );
      default:
        return (
          <TextAnimate as="p" animation="fadeIn" by="word" className={textCls.subtitle} startOnView={false} duration={0.2}>
            {subtitle}
          </TextAnimate>
        );
    }
  };

  const renderLine1 = () => {
    if (!isHovered) return <p className={textCls.line1} style={{ color: accent }}>{line1}</p>;
    switch (cardKey) {
      case "finances":
        return (
          <TextAnimate as="p" animation="slideUp" by="word" className={textCls.line1} style={{ color: accent }} startOnView={false} duration={0.2}>
            {line1}
          </TextAnimate>
        );
      case "school":
        return (
          <TextAnimate as="p" animation="blurIn" by="character" className={textCls.line1} style={{ color: accent }} startOnView={false} duration={0.22}>
            {line1}
          </TextAnimate>
        );
      case "fitness":
        return (
          <TextAnimate as="p" animation="scaleUp" by="word" className={textCls.line1} style={{ color: accent }} startOnView={false} duration={0.18}>
            {line1}
          </TextAnimate>
        );
      case "reading":
        return (
          <TypingAnimation className={textCls.line1} style={{ color: accent }} startOnView={false} showCursor={false} typeSpeed={40}>
            {line1}
          </TypingAnimation>
        );
      case "projects":
        return (
          <TextAnimate as="p" animation="slideRight" by="word" className={textCls.line1} style={{ color: accent }} startOnView={false} duration={0.2}>
            {line1}
          </TextAnimate>
        );
      case "content":
        return (
          <TypingAnimation className={textCls.line1} style={{ color: accent }} startOnView={false} showCursor={false} typeSpeed={35}>
            {line1}
          </TypingAnimation>
        );
    }
  };

  const renderLine2 = () => {
    if (line2 == null) return null;
    if (!isHovered) return <p className={textCls.line2}>{line2}</p>;
    return (
      <TextAnimate as="p" animation="fadeIn" by="word" className={textCls.line2} startOnView={false} duration={0.2}>
        {line2}
      </TextAnimate>
    );
  };

  const renderKnowMore = () => {
    if (!isHovered) {
      return (
        <p className={`mt-2 shrink-0 flex items-center gap-1 ${textCls.knowMore}`}>
          Know more <span aria-hidden>→</span>
        </p>
      );
    }
    switch (cardKey) {
      case "finances":
        return (
          <TextAnimate as="p" animation="slideRight" by="word" className={`mt-2 shrink-0 ${textCls.knowMore}`} startOnView={false} duration={0.2}>
            Know more →
          </TextAnimate>
        );
      case "reading":
        return (
          <TypingAnimation className={`mt-2 shrink-0 ${textCls.knowMore}`} startOnView={false} showCursor={false} typeSpeed={30}>
            Know more →
          </TypingAnimation>
        );
      default:
        return (
          <TextAnimate as="p" animation="slideUp" by="word" className={`mt-2 shrink-0 ${textCls.knowMore}`} startOnView={false} duration={0.2}>
            Know more →
          </TextAnimate>
        );
    }
  };

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="rounded-xl flex flex-col overflow-hidden min-h-0 cursor-pointer relative"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: styles.shadowRest,
      }}
    >
      {cardKey === "reading" && (
        <div
          ref={shimmerRef}
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background:
              "linear-gradient(105deg, transparent 0%, rgba(192,132,252,0.06) 45%, rgba(192,132,252,0.12) 50%, rgba(192,132,252,0.06) 55%, transparent 100%)",
            width: "50%",
          }}
        />
      )}
      <div className="relative z-10 p-3 flex-1 flex flex-col min-h-0 justify-between">
        <div className="flex items-start justify-between gap-2 shrink-0">
          <div className="min-w-0 flex-1">
            {renderTitle()}
            {renderSubtitle()}
          </div>
          <span ref={iconRef} className="text-lg shrink-0 opacity-90 inline-block" aria-hidden>
            {icon}
          </span>
        </div>
        <div className="min-h-0 flex flex-col justify-center shrink-0">
          {renderLine1()}
          {renderLine2()}
        </div>
        {chart != null && (
          <div className="min-h-0 flex-1 w-full mt-1" style={{ minHeight: 52 }}>
            {chart}
          </div>
        )}
        {renderKnowMore()}
      </div>
    </div>
  );
}
