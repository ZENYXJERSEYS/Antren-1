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

import {
  getSessionPersistence,
  setSessionPersistence,
  supabase,
} from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/logo.svg";
import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, Lock, Mail } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Incorrect email or password. Please try again.";
  }
  if (m.includes("email not confirmed")) {
    return "Please confirm your email address first — check your inbox for a confirmation link.";
  }
  if (m.includes("user already registered")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (m.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }
  if (m.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return message;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, user, isPasswordRecovery } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(getSessionPersistence);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated && !isPasswordRecovery) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, isPasswordRecovery, navigate, redirect]);

  const switchMode = (next: "signIn" | "signUp") => {
    setMode(next);
    setError(null);
    setNotice(null);
    setShowPassword(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsLoading(true);
    try {
      // Apply the "remember me" choice before the session is created.
      setSessionPersistence(rememberMe);
      const trimmedEmail = email.trim();

      if (mode === "signIn") {
        // Clear any stale persisted session so an old "remember me" login
        // can't resurface later (only relevant when not remembering this one).
        if (!rememberMe) {
          await supabase.auth.signOut({ scope: "local" });
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (error) throw error;
        navigate(redirect);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });
      if (error) throw error;

      if (data.session) {
        // Email confirmation is disabled — straight into profile setup.
        navigate("/onboarding");
        return;
      }

      // Supabase is emailing a confirmation link; user finishes signup there.
      setMode("signIn");
      setPassword("");
      setNotice(
        "Check your email to confirm your account, then sign in. If you don't see it, check spam.",
      );
    } catch (err) {
      console.error("Auth error:", err);
      setError(
        err instanceof Error ? friendlyAuthError(err.message) : "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Enter your email address to receive a reset link.");
      return;
    }
    setError(null);
    setNotice(null);
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      setNotice(
        "If an account exists for that email, we've sent a password reset link.",
      );
    } catch (err) {
      console.error("Password reset error:", err);
      setError(
        err instanceof Error ? friendlyAuthError(err.message) : "Failed to send the reset link. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirmPassword("");
      setNotice("Password updated. Welcome back!");
      navigate(redirect);
    } catch (err) {
      console.error("Password update error:", err);
      setError(
        err instanceof Error ? friendlyAuthError(err.message) : "Failed to update your password. Please try again.",
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
      {/* Auth Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="flex items-center justify-center h-full flex-col">
          <Card className="w-full max-w-sm border shadow-md pb-0">
            {isPasswordRecovery ? (
              <>
                <CardHeader className="text-center">
                  <div className="flex justify-center">
                    <div className="mb-4 mt-4 flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                      <KeyRound className="size-7 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                  <CardTitle className="text-xl">Set a new password</CardTitle>
                  <CardDescription>
                    Choose a strong password{user?.email ? ` for ${user.email}` : ""}
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleRecoverySubmit}>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="new-password">New password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="new-password"
                          name="new-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="At least 6 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-9 pr-10"
                          autoComplete="new-password"
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
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="confirm-password">Confirm password</Label>
                      <Input
                        id="confirm-password"
                        name="confirm-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Repeat your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-3"
                        autoComplete="new-password"
                        disabled={isLoading}
                        required
                      />
                    </div>
                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                    {notice && (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        {notice}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="flex-col gap-2">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading || password.length < 6 || password !== confirmPassword}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          Update password
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </>
            ) : (
              <>
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
                    <div className="flex items-center justify-between gap-2">
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
                      {mode === "signIn" && (
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-sm font-medium text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
                          disabled={isLoading}
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                    {notice && (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        {notice}
                      </p>
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
              </>
            )}

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
