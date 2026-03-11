import { CheckCircle2, LayoutDashboard, Wallet, LogOut, Dumbbell } from "lucide-react";
import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Tasks", url: "/tasks", icon: CheckCircle2 },
  { title: "Finance", url: "/finance", icon: Wallet },
  { title: "Gym", url: "/gym", icon: Dumbbell },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="border-r border-border/50 shadow-xl shadow-black/20">
      <SidebarContent>
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 font-display font-bold text-xl tracking-tight text-foreground">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="text-primary-foreground text-sm">PH</span>
            </div>
            Productivity
          </div>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground font-medium text-xs uppercase tracking-wider mt-4">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="mt-2 space-y-1">
              {items.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} className="transition-all duration-200">
                      <Link href={item.url} className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg
                        ${isActive 
                          ? "bg-primary/10 text-primary hover:bg-primary/15" 
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"}
                      `}>
                        <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-border/50">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-secondary" size="sm">
          <LogOut className="w-4 h-4 mr-2" />
          Log out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
