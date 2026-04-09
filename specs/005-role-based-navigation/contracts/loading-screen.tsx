/**
 * Contract: LoadingScreen Component for @ramcar/ui
 *
 * A full-viewport loading animation using Tailwind CSS only.
 * Used by both web and desktop apps during auth state resolution.
 */

import type { ReactNode } from "react";

interface LoadingScreenProps {
  /**
   * Timeout in milliseconds before showing the "taking longer" message.
   * @default 10000
   */
  timeout?: number;

  /**
   * Callback when the user clicks the retry button (shown after timeout).
   * If not provided, the retry button reloads the page.
   */
  onRetry?: () => void;

  /**
   * Optional brand element (logo, icon) displayed above the spinner.
   */
  brand?: ReactNode;
}

/**
 * Full-viewport loading screen with:
 * - Centered spinner animation (Tailwind animate-spin or custom keyframe)
 * - Brand element above spinner (optional)
 * - After `timeout` ms: "Taking longer than expected" message + retry button
 * - Dark mode compatible via Tailwind dark: variants
 * - No external animation libraries
 *
 * Usage:
 *   <LoadingScreen />
 *   <LoadingScreen timeout={5000} onRetry={() => router.refresh()} />
 */
export declare function LoadingScreen(props: LoadingScreenProps): JSX.Element;
