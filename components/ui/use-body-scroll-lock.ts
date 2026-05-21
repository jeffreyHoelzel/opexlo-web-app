"use client";

import { useEffect, useRef } from "react";

type ScrollLockStyles = {
  bodyOverflow: string;
  bodyPaddingRight: string;
  htmlOverflow: string;
};

let activeLockCount = 0;
let originalStyles: ScrollLockStyles | null = null;

function lockBodyScroll() {
  if (typeof document === "undefined") {
    return;
  }

  activeLockCount += 1;

  if (activeLockCount > 1) {
    return;
  }

  const body = document.body;
  const html = document.documentElement;
  originalStyles = {
    bodyOverflow: body.style.overflow,
    bodyPaddingRight: body.style.paddingRight,
    htmlOverflow: html.style.overflow,
  };

  const scrollbarWidth = window.innerWidth - html.clientWidth;
  if (scrollbarWidth > 0) {
    const computedBodyPaddingRight = Number.parseFloat(
      window.getComputedStyle(body).paddingRight,
    );
    const safePaddingRight = Number.isFinite(computedBodyPaddingRight)
      ? computedBodyPaddingRight
      : 0;
    body.style.paddingRight = `${safePaddingRight + scrollbarWidth}px`;
  }

  body.style.overflow = "hidden";
  html.style.overflow = "hidden";
}

function unlockBodyScroll() {
  if (typeof document === "undefined" || activeLockCount === 0) {
    return;
  }

  activeLockCount -= 1;

  if (activeLockCount > 0 || !originalStyles) {
    return;
  }

  const body = document.body;
  const html = document.documentElement;
  body.style.overflow = originalStyles.bodyOverflow;
  body.style.paddingRight = originalStyles.bodyPaddingRight;
  html.style.overflow = originalStyles.htmlOverflow;
  originalStyles = null;
}

export function useBodyScrollLock(isLocked: boolean) {
  const hasLockRef = useRef(false);

  useEffect(() => {
    if (!isLocked) {
      if (hasLockRef.current) {
        unlockBodyScroll();
        hasLockRef.current = false;
      }
      return;
    }

    lockBodyScroll();
    hasLockRef.current = true;

    return () => {
      if (!hasLockRef.current) {
        return;
      }

      unlockBodyScroll();
      hasLockRef.current = false;
    };
  }, [isLocked]);
}
