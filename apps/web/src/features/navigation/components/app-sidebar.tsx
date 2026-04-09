"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/routing";
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
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@ramcar/ui";
import { ChevronRight, ChevronsUpDown, LogOut, User } from "lucide-react";
import { logout } from "@/features/auth/actions/logout";
import { getItemsForPlatform } from "@ramcar/shared";
import type { SidebarItem } from "@ramcar/shared";
import { iconMap } from "./icon-map";

const items = getItemsForPlatform("web");

export function AppSidebar() {
  const pathname = usePathname();
  const t = useTranslations("sidebar");

  // Strip locale prefix from pathname for matching (e.g., /es/dashboard → /dashboard)
  const normalizedPath = pathname.replace(/^\/(en|es)/, "") || "/";

  return (
    <Sidebar collapsible="icon" className="">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex">
                <Image
                  alt="icon"
                  src="/assets/images/icon.png"
                  width={80}
                  height={80}
                />
                <span className="font-semibold">RamcarSoft</span>
              </div>
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
                    currentPath={normalizedPath}
                    t={t}
                  />
                ) : (
                  <SimpleMenuItem
                    key={item.key}
                    item={item}
                    currentPath={normalizedPath}
                    t={t}
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
                    <AvatarFallback className="rounded-lg">A</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Admin</span>
                    <span className="truncate text-xs text-muted-foreground">admin@ramcar.com</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" side="top" align="start" sideOffset={4}>
                <DropdownMenuItem asChild>
                  <Link href="/account">
                    <User />
                    {t("account")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut />
                  {t("logout")}
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
  t,
}: {
  item: SidebarItem;
  currentPath: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const Icon = iconMap[item.icon];
  const isActive = currentPath === item.route;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={t(item.key)}>
        <Link href={item.route}>
          {Icon && <Icon />}
          <span>{t(item.key)}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function CollapsibleMenuItem({
  item,
  currentPath,
  t,
}: {
  item: SidebarItem;
  currentPath: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const Icon = iconMap[item.icon];
  const isChildActive = item.subItems?.some((sub) => currentPath === sub.route) ?? false;
  const isParentActive = currentPath === item.route || isChildActive;

  return (
    <Collapsible asChild defaultOpen={isParentActive} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={isParentActive} tooltip={t(item.key)}>
            {Icon && <Icon />}
            <span>{t(item.key)}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.subItems?.map((sub) => (
              <SidebarMenuSubItem key={sub.key}>
                <SidebarMenuSubButton asChild isActive={currentPath === sub.route}>
                  <Link href={sub.route}>
                    <span>{t(`${item.key}_${sub.key}`)}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
