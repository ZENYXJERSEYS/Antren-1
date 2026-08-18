import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signIn, signUp } from "@/lib/local-auth";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/logo.svg";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/app/for-you",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("incorrect email or password")) {
    return "Incorrect email or password. Please try again.";
  }
  if (m.includes("already registered") || m.includes("already exists")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (m.includes("password should be at least") || m.includes("at least 6")) {
    return "Password must be at least 6 characters.";
  }
  return message;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirect);
    }
  }, [isAuthenticated, navigate, redirect]);

  const switchMode = (next: "signIn" | "signUp") => {
    setMode(next);
    setError(null);
    setShowPassword(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (mode === "signIn") {
        const result = await signIn(email, password, rememberMe);
        if (result.error) throw new Error(result.error);
        navigate(redirect);
        return;
      }

      // Sign up → go to onboarding
      const result = await signUp(email, password);
      if (result.error) throw new Error(result.error);
      navigate("/onboarding");
    } catch (err) {
      console.error("Auth error:", err);
      setError(
        err instanceof Error
          ? friendlyError(err.message)
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const segmented = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "bg-background text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="flex items-center justify-center h-full flex-col">
          <Card className="w-full max-w-sm border shadow-md pb-0">
            <CardHeader className="text-center">
              <div className="flex justify-center">
                <img
                  src={logo}
                  alt="Antren"
                  width={64}
                  height={64}
                  className="rounded-lg mb-4 mt-4 cursor-pointer"
                  onClick={() => navigate("/")}
                />
              </div>
              <div className="mb-1 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => switchMode("signIn")}
                  className={segmented(mode === "signIn")}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("signUp")}
                  className={segmented(mode === "signUp")}
                >
                  Create account
                </button>
              </div>
              <CardTitle className="text-xl">
                {mode === "signIn" ? "Welcome back" : "Create your account"}
              </CardTitle>
              <CardDescription>
                {mode === "signIn"
                  ? "Sign in with your email and password"
                  : "Join Antren — it takes less than a minute"}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit} className="flex flex-col">
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      autoComplete="email"
                      autoFocus
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-10"
                      autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                      minLength={mode === "signUp" ? 6 : undefined}
                      disabled={isLoading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-2.5 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="remember-me"
                    className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none"
                  >
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                      disabled={isLoading}
                    />
                    Remember me
                  </label>
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {mode === "signIn" ? "Signing in..." : "Creating account..."}
                    </>
                  ) : (
                    <>
                      {mode === "signIn" ? "Sign in" : "Create account"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>

            <div className="py-4 px-6 text-xs text-center text-muted-foreground bg-muted border-t rounded-b-lg">
              Opportunities without limits —{" "}
              <span className="font-medium text-primary">Antren</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
