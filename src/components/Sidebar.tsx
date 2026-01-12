import { useState } from "react";
import { 
  LayoutGrid, 
  Bot
} from "lucide-react";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

const NavItem = ({ icon, label, isActive, onClick }: NavItemProps) => (
  <button
    onClick={onClick}
    className={`nav-item w-full relative ${isActive ? 'nav-item-active' : ''}`}
  >
    <span className="w-5 h-5">{icon}</span>
    <span className="uppercase text-xs tracking-wider font-semibold">{label}</span>
    {isActive && (
      <span className="absolute right-4 w-2 h-2 rounded-full bg-destructive animate-pulse-ring" />
    )}
  </button>
);

const Sidebar = () => {
  const [activeItem, setActiveItem] = useState("dashboard");

  const navItems = [
    { id: "dashboard", icon: <LayoutGrid className="w-5 h-5" />, label: "Dashboard" },
  ];

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <Bot className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">Dr. Robo</h1>
            <p className="text-xs text-muted-foreground">Clinical Assistant</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            isActive={activeItem === item.id}
            onClick={() => setActiveItem(item.id)}
          />
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-sidebar-border" />
    </aside>
  );
};

export default Sidebar;
