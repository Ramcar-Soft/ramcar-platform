import { Button, Card, CardHeader, CardTitle, CardContent } from "@ramcar/ui";
import { useAppStore } from "@ramcar/store";

interface HomePageProps {
  onLogout: () => Promise<void>;
}

export function HomePage({ onLogout }: HomePageProps) {
  const user = useAppStore((s) => s.user);

  if (!user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-medium">{user.fullName}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{user.email ?? "—"}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Role</p>
            <p className="font-medium capitalize">{user.role.replace("_", " ")}</p>
          </div>
          <Button variant="outline" onClick={onLogout} className="w-full">
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
