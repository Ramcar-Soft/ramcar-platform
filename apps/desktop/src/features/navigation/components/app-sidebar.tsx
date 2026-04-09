import { useTranslation } from "react-i18next";

// Helper for dynamic i18n keys — i18next strict mode requires literal key types,
// but sidebar keys are computed from config at runtime.
function useSidebarTranslation() {
  const { t } = useTranslation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (key: string): string => (t as any)(key);
}
import { useAppStore } from "@ramcar/store";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail,
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ramcar/ui";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";

const Collapsible = CollapsiblePrimitive.Root;
const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;
const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;
import { ChevronRight, ChevronsUpDown, LogOut, User } from "lucide-react";
import { getItemsForRole } from "@ramcar/shared";
import type { SidebarItem } from "@ramcar/shared";
import { iconMap } from "./icon-map";

interface AppSidebarProps {
  onLogout: () => void;
}

export function AppSidebar({ onLogout }: AppSidebarProps) {
  const { t } = useTranslation();
  const currentPath = useAppStore((s) => s.currentPath);
  const navigate = useAppStore((s) => s.navigate);
  const user = useAppStore((s) => s.user);
  const items = user ? getItemsForRole(user.role, "desktop") : [];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <span className="font-semibold">RamcarSoft</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) =>
                item.subItems && item.subItems.length > 0 ? (
                  <CollapsibleMenuItem
                    key={item.key}
                    item={item}
                    currentPath={currentPath}
                    navigate={navigate}
                  />
                ) : (
                  <SimpleMenuItem
                    key={item.key}
                    item={item}
                    currentPath={currentPath}
                    navigate={navigate}
                  />
                ),
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      {(user?.fullName?.[0] ?? "G").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.fullName ?? "Guard"}</span>
                    <span className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" side="top" align="start" sideOffset={4}>
                <DropdownMenuItem onClick={() => navigate("/account")}>
                  <User />
                  {t("sidebar.account")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut />
                  {t("sidebar.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function SimpleMenuItem({
  item,
  currentPath,
  navigate,
}: {
  item: SidebarItem;
  currentPath: string;
  navigate: (path: string) => void;
}) {
  const t = useSidebarTranslation();
  const Icon = iconMap[item.icon];
  const isActive = currentPath === item.route;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={t(`sidebar.${item.key}`)}
        onClick={() => navigate(item.route)}
      >
        {Icon && <Icon />}
        <span>{t(`sidebar.${item.key}`)}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function CollapsibleMenuItem({
  item,
  currentPath,
  navigate,
}: {
  item: SidebarItem;
  currentPath: string;
  navigate: (path: string) => void;
}) {
  const t = useSidebarTranslation();
  const Icon = iconMap[item.icon];
  const isChildActive = item.subItems?.some((sub) => currentPath === sub.route) ?? false;
  const isParentActive = currentPath === item.route || isChildActive;

  return (
    <Collapsible asChild defaultOpen={isParentActive} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={isParentActive} tooltip={t(`sidebar.${item.key}`)}>
            {Icon && <Icon />}
            <span>{t(`sidebar.${item.key}`)}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.subItems?.map((sub) => (
              <SidebarMenuSubItem key={sub.key}>
                <SidebarMenuSubButton
                  isActive={currentPath === sub.route}
                  onClick={() => navigate(sub.route)}
                >
                  <span>{t(`sidebar.${item.key}_${sub.key}`)}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
