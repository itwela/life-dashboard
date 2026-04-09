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
    shadowRest: "0 0 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(196,145,42,0.06)",
    shadowHover: "0 0 40px rgba(196,145,42,0.22), 0 8px 32px rgba(0,0,0,0.5)",
    borderHover: "rgba(196,145,42,0.45)",
  },
  school: {
    shadowRest: "0 0 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(122,176,90,0.06)",
    shadowHover: "0 12px 40px rgba(122,176,90,0.18), 0 0 30px rgba(122,176,90,0.12)",
    borderHover: "rgba(122,176,90,0.45)",
  },
  fitness: {
    shadowRest: "0 0 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(232,115,74,0.06)",
    shadowHover: "0 0 45px rgba(232,115,74,0.28), 0 10px 35px rgba(0,0,0,0.45)",
    borderHover: "rgba(232,115,74,0.5)",
  },
  reading: {
    shadowRest: "0 0 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(160,133,196,0.06)",
    shadowHover: "0 10px 38px rgba(160,133,196,0.18), 0 0 25px rgba(160,133,196,0.1)",
    borderHover: "rgba(160,133,196,0.45)",
  },
  projects: {
    shadowRest: "0 0 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,168,58,0.06)",
    shadowHover: "0 0 42px rgba(212,168,58,0.25), 0 8px 30px rgba(0,0,0,0.45)",
    borderHover: "rgba(212,168,58,0.5)",
  },
  content: {
    shadowRest: "0 0 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(90,158,138,0.06)",
    shadowHover: "0 0 50px rgba(90,158,138,0.22), inset 0 0 30px rgba(90,158,138,0.04)",
    borderHover: "rgba(90,158,138,0.45)",
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
  title: "text-sm font-medium truncate",
  subtitle: "text-[11px] truncate",
  line1: "text-base font-semibold truncate",
  line2: "text-[11px] truncate",
  knowMore: "text-[11px] font-medium",
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
  const textTlRef = useRef<gsap.core.Timeline | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const line1Ref = useRef<HTMLParagraphElement>(null);
  const line2Ref = useRef<HTMLParagraphElement>(null);
  const knowMoreRef = useRef<HTMLParagraphElement>(null);
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
        gsap.to(card, { scale: 1.03, rotation: 0.5, boxShadow: styles.shadowHover, borderColor: styles.borderHover, duration, ease });
        if (iconEl) gsap.to(iconEl, { scale: 1.15, duration: 0.2, ease: "power2.out" });
        break;
      case "projects":
        gsap.to(card, { scale: 1.03, rotation: 0.5, boxShadow: styles.shadowHover, borderColor: styles.borderHover, duration, ease });
        if (iconEl) gsap.to(iconEl, { scale: 1.15, duration: 0.2, ease: "power2.out" });
        break;
      case "content":
        gsap.to(card, { scale: 1.03, rotation: 0.5, boxShadow: styles.shadowHover, borderColor: styles.borderHover, duration, ease });
        if (iconEl) gsap.to(iconEl, { scale: 1.15, duration: 0.2, ease: "power2.out" });
        break;
    }
    // Reading / content: animate text in with GSAP (same DOM, no layout shift)
    if (cardKey === "reading") {
      textTlRef.current?.kill();
      const els = [titleRef.current, subtitleRef.current, line1Ref.current, line2Ref.current, knowMoreRef.current].filter(Boolean) as HTMLElement[];
      if (els.length) {
        textTlRef.current = gsap.timeline();
        textTlRef.current.fromTo(els, { x: -18, opacity: 0 }, { x: 0, opacity: 1, duration: 0.24, stagger: 0.045, ease: "power2.out" });
      }
    }
    if (cardKey === "content") {
      textTlRef.current?.kill();
      const els = [titleRef.current, subtitleRef.current, line1Ref.current, line2Ref.current, knowMoreRef.current].filter(Boolean) as HTMLElement[];
      if (els.length) {
        textTlRef.current = gsap.timeline();
        textTlRef.current.fromTo(els, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.24, stagger: 0.045, ease: "power2.out" });
      }
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
      borderColor: "rgba(122,176,90,0.1)",
      duration: 0.35,
      ease: "power2.out",
      onComplete: () => { idleTlRef.current?.restart(); },
    });
    if (iconEl) gsap.to(iconEl, { y: 0, scale: 1, rotation: 0, duration: 0.25, ease: "power2.out" });
    if (cardKey === "reading" || cardKey === "content") {
      textTlRef.current?.kill();
      const els = [titleRef.current, subtitleRef.current, line1Ref.current, line2Ref.current, knowMoreRef.current].filter(Boolean) as HTMLElement[];
      if (els.length) gsap.set(els, { x: 0, y: 0, opacity: 1 });
    }
  }, [cardKey, styles.shadowRest]);

  useEffect(() => {
    setupIdle();
    return () => { idleTlRef.current?.kill(); };
  }, [setupIdle]);

  const renderTitle = () => {
    const titleStyle = { color: "rgba(232,224,204,0.92)", fontFamily: "var(--font-cormorant)", fontSize: "15px", fontWeight: 500, fontStyle: "italic" as const };
    // Reading and content: keep static text + ref for GSAP hover animation (no layout reflow)
    if (!isHovered || cardKey === "reading" || cardKey === "content") {
      return <h2 ref={titleRef} className={textCls.title} style={titleStyle}>{title}</h2>;
    }
    const key = `title-${cardKey}-${isHovered}`;
    switch (cardKey) {
      case "finances":
        return (
          <HyperText key={key} as="h2" className={textCls.title} style={titleStyle} duration={500} animateOnHover={false} startOnView={false}>
            {title}
          </HyperText>
        );
      case "school":
        return (
          <TextAnimate key={key} as="h2" animation="blurInUp" by="character" className={textCls.title} style={titleStyle} startOnView={false} duration={0.25}>
            {title}
          </TextAnimate>
        );
      case "fitness":
        return (
          <TextAnimate key={key} as="h2" animation="scaleUp" by="word" className={textCls.title} style={titleStyle} startOnView={false} duration={0.2}>
            {title}
          </TextAnimate>
        );
      case "projects":
        return (
          <HyperText key={key} as="h2" className={textCls.title} style={titleStyle} duration={400} animateOnHover={false} startOnView={false}>
            {title}
          </HyperText>
        );
      default:
        return <h2 className={textCls.title} style={titleStyle}>{title}</h2>;
    }
  };

  const renderSubtitle = () => {
    const subStyle = { color: "rgba(232,224,204,0.72)", fontSize: "11px", letterSpacing: "0.04em" };
    if (!isHovered || cardKey === "reading" || cardKey === "content") {
      return <p ref={subtitleRef} className={textCls.subtitle} style={{ ...subStyle, color: "rgba(232,224,204,0.78)" }}>{subtitle}</p>;
    }
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
    if (!isHovered || cardKey === "reading" || cardKey === "content") {
      return <p ref={line1Ref} className={textCls.line1} style={{ color: accent }}>{line1}</p>;
    }
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
      case "projects":
        return (
          <TextAnimate as="p" animation="slideRight" by="word" className={textCls.line1} style={{ color: accent }} startOnView={false} duration={0.2}>
            {line1}
          </TextAnimate>
        );
      default:
        return <p className={textCls.line1} style={{ color: accent }}>{line1}</p>;
    }
  };

  const renderLine2 = () => {
    const line2Style = { color: "rgba(232,224,204,0.78)", fontSize: "11px" };
    if (line2 == null) return null;
    if (!isHovered || cardKey === "reading" || cardKey === "content") {
      return <p ref={line2Ref} className={textCls.line2} style={line2Style}>{line2}</p>;
    }
    return (
      <TextAnimate as="p" animation="fadeIn" by="word" className={textCls.line2} startOnView={false} duration={0.2}>
        {line2}
      </TextAnimate>
    );
  };

  const renderKnowMore = () => {
    if (!isHovered || cardKey === "reading" || cardKey === "content") {
      return (
        <p ref={knowMoreRef} className={`mt-2 shrink-0 flex items-center gap-1 ${textCls.knowMore}`} style={{ color: "rgba(196,145,42,0.82)", fontFamily: "var(--font-cormorant)", fontSize: "13px", fontStyle: "italic" }}>
          Explore <span aria-hidden>→</span>
        </p>
      );
    }
    switch (cardKey) {
      case "finances":
        return (
          <TextAnimate as="p" animation="slideRight" by="word" className={`mt-2 shrink-0 ${textCls.knowMore}`} style={{ color: "rgba(196,145,42,0.8)", fontFamily: "var(--font-cormorant)", fontSize: "13px", fontStyle: "italic" }} startOnView={false} duration={0.2}>
            Explore →
          </TextAnimate>
        );
      case "school":
      case "projects":
        return (
          <TextAnimate as="p" animation="slideUp" by="word" className={`mt-2 shrink-0 ${textCls.knowMore}`} style={{ color: "rgba(196,145,42,0.8)", fontFamily: "var(--font-cormorant)", fontSize: "13px", fontStyle: "italic" }} startOnView={false} duration={0.2}>
            Explore →
          </TextAnimate>
        );
      default:
        return (
          <p className={`mt-2 shrink-0 flex items-center gap-1 ${textCls.knowMore}`} style={{ color: "rgba(196,145,42,0.65)", fontFamily: "var(--font-cormorant)", fontSize: "13px", fontStyle: "italic" }}>
            Explore <span aria-hidden>→</span>
          </p>
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
        background: "linear-gradient(135deg, rgba(14,22,10,0.94) 0%, rgba(8,14,6,0.98) 100%)",
        border: "1px solid rgba(122,176,90,0.1)",
        boxShadow: styles.shadowRest,
      }}
    >
      {/* Botanical leaf watermark */}
      <div className="absolute pointer-events-none z-0" style={{ top: "8px", right: "8px", width: "38px", height: "46px", opacity: 0.055, color: accent }}>
        <svg viewBox="0 0 38 46" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
          <path d="M19 44 C19 36 19 24 19 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <path d="M19 36 C19 30 13 24 7 22" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
          <path d="M19 36 C19 30 25 24 31 22" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
          <path d="M19 26 C19 20 14 15 9 13" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
          <path d="M19 26 C19 20 24 15 29 13" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
          <path d="M19 16 C19 11 15 7 11 5" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round"/>
          <path d="M19 16 C19 11 23 7 27 5" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round"/>
        </svg>
      </div>

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
        <div className="shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {renderTitle()}
              {renderSubtitle()}
            </div>
            <span ref={iconRef} className="text-lg shrink-0 opacity-90 inline-block" aria-hidden>
              {icon}
            </span>
          </div>
          <div className="flex flex-col shrink-0">
            {renderLine1()}
            {renderLine2()}
          </div>
        </div>
        {chart != null && (
          <div className="min-h-0 flex-1 w-full mt-1" style={{ minHeight: "52px" }}>
            {chart}
          </div>
        )}
        <div className="shrink-0 flex items-end">
          {renderKnowMore()}
        </div>
      </div>
    </div>
  );
}
