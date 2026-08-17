import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Bookmark,
  ChevronDown,
  Compass,
  KanbanSquare,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, Navigate, NavLink, Outlet, useNavigate } from "react-router";
import { timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/use-auth";
import { useProfileTheme } from "@/hooks/use-theme";
import { getMyProfile, listNotifications, markAllNotificationsRead, markNotificationRead, useDb } from "@/lib/db";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/app/for-you", label: "For You", icon: Sparkles },
  { to: "/app/explore", label: "Explore", icon: Compass },
  { to: "/app/saved", label: "Saved", icon: Bookmark },
  { to: "/app/pipeline", label: "Pipeline", icon: KanbanSquare },
  { to: "/app/peers", label: "Peers", icon: Users },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )
          }
        >
          <item.icon className="size-[18px]" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarContent() {
  const { user, signOut } = useAuth();
  const profile = useDb(() => getMyProfile(), []);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex h-full flex-col">
      <Link to="/" className="px-2 pb-6 pt-1">
        <Logo />
      </Link>
      <NavItems />
      <div className="mt-auto flex flex-col gap-3">
        <Link
          to="/app/settings"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Settings className="size-[18px]" />
          Settings
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                {(profile?.name ?? user?.name ?? "A").slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{profile?.name ?? user?.name ?? "Student"}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {profile?.grade ? `Grade ${profile.grade}` : "Set up your profile"}
                </span>
              </span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/app/settings">Settings</Link>
            </DropdownMenuItem>
            {profile && !profile.onboardingComplete && (
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/onboarding">Finish setup</Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={handleSignOut}>
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function NotificationsMenu() {
  const [version, setVersion] = useState(0);
  const notifications = useDb(() => listNotifications(), [version]);
  const refresh = () => setVersion((v) => v + 1);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {notifications && notifications.unread > 0 && (
            <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {notifications.unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <p className="text-sm font-semibold">Notifications</p>
          {notifications && notifications.unread > 0 && (
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => void markAllNotificationsRead().then(refresh)}
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {!notifications && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">Loading…</p>
          )}
          {notifications && notifications.items.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              You&apos;re all caught up.
            </p>
          )}
          {notifications?.items.map((n) => (
            <button
              key={n.id}
              type="button"
              className="flex w-full flex-col gap-0.5 border-b px-3 py-2.5 text-left transition-colors hover:bg-accent"
              onClick={() => {
                if (!n.read) {
                  void markNotificationRead(n.id).then(refresh);
                }
                setOpen(false);
                navigate(n.href);
              }}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                <span className="truncate">{n.title}</span>
              </span>
              <span className="line-clamp-2 pl-3.5 text-xs text-muted-foreground">{n.body}</span>
              <span className="pl-3.5 text-[10px] text-muted-foreground/70">{timeAgo(n.createdAt)}</span>
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopBar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72">
          <SidebarContent />
        </SheetContent>
      </Sheet>
      <Logo />
      <NotificationsMenu />
    </header>
  );
}

export function AppShell() {
  useProfileTheme();
  const profile = useDb(() => getMyProfile(), []);

  // First visit / incomplete setup → straight to profile setup.
  if (profile === null || (profile && !profile.onboardingComplete)) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AnimatePresence mode="wait">
        <motion.div
          key="shell"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="flex min-h-screen"
        >
          <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-sidebar px-4 py-5 lg:block">
            <SidebarContent />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main className="flex-1">
              <Outlet />
            </main>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default AppShell;
