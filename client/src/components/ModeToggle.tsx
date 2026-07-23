import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

// Light/dark toggle reachable from every page header. `resolvedTheme` is only
// meaningful after mount (it resolves "system" to an actual value client-side),
// so we gate the icon on a `mounted` flag to avoid a one-frame mismatch.
export const ModeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={handleToggle}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
};
