import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

// Thin re-export so the rest of the app imports one local module instead of
// reaching into next-themes directly, and so the shared defaults (class
// attribute, system default, no flash-of-transition on toggle) live in one
// place.
export const ThemeProvider = ({ children, ...props }: ComponentProps<typeof NextThemesProvider>) => {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange {...props}>
      {children}
    </NextThemesProvider>
  );
};
