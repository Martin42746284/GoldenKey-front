import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Bell, Search, User, Settings, LogOut, X, Menu, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, useUserProfile } from "@/lib/rbac";
import { useState, useEffect, useRef } from "react";
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";
import { navigation } from "./sidebar";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

export function Header() {
  const { user, setRole, logout } = useAuth();
  const currentUser = useUserProfile(); // Utilise le hook pour les mises à jour en temps réel
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Mise à jour de l'heure toutes les secondes
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Nettoyage de l'intervalle lors du démontage du composant
    return () => clearInterval(timer);
  }, []);

  // Fermer les pop-ups en cliquant à l'extérieur
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const timeString = currentTime.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const dateString = currentTime.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Fonction pour obtenir les initiales
  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const [notifications, setNotifications] = useState<Array<{ id: number; title: string; body?: string | null; read: boolean; createdAt: string }>>([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  async function loadNotifications() {
    try {
      const items = await api.get<Array<{ id: number; title: string; body?: string | null; read: boolean; createdAt: string }>>("/api/notifications");
      setNotifications(items);
    } catch {}
  }

  async function markAllRead() {
    try {
      await api.post("/api/notifications/mark-all-read");
      await loadNotifications();
    } catch {}
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function removeNotification(id: number) {
    try {
      await api.del(`/api/notifications/${id}`);
      await loadNotifications();
    } catch {}
  }
  async function markRead(id: number) {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      await loadNotifications();
    } catch {}
  }

  return (
    <header className="h-16 border-b border-border px-4 md:px-6 flex items-center justify-between relative" style={{ backgroundColor: '#1f2d69' }}>
      {/* Mobile menu */}
      <div className="md:hidden mr-2">
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Menu className="h-5 w-5" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="p-2 max-h-[80vh]">
            <div className="p-4 overflow-y-auto max-h-[72vh] pr-1">
              <div className="mb-3">
                <div className="text-sm font-semibold text-foreground">Navigation</div>
              </div>
              <ul className="grid grid-cols-1 gap-2">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Button
                        aria-current={isActive ? "page" : undefined}
                        variant={isActive ? "default" : "ghost"}
                        className={cn("w-full justify-start text-base", isActive ? "bg-primary text-primary-foreground" : "")}
                        onClick={() => {
                          navigate(item.href);
                        }}
                      >
                        <item.icon className="h-5 w-5 mr-3" />
                        <span className="truncate">{item.name}</span>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
      {/* Search */}
      <div className="hidden md:flex items-center space-x-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white h-4 w-4" />
          <Input
            placeholder="Rechercher..."
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/70"
          />
        </div>
      </div>

      {/* Time & Date */}
<div className="flex flex-row justify-between items-center w-040 md:w-48 lg:w-64 mx-4">
  <div className="text-lg font-semibold text-white">{timeString}</div>
  <div className="text-sm text-white/90 capitalize">{dateString}</div>
</div>


      {/* Right Actions */}
      <div className="flex items-center space-x-4">

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative text-white hover:bg-white/10"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-5 w-5" />
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 text-white border-none"
            >
              {unreadCount}
            </Badge>
          </Button>
          
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-semibold text-gray-800 dark:text-white">Notifications</h3>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowNotifications(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map(notification => (
                    <div key={notification.id} className="p-3 border-b border-gray-100 dark:border-gray-600 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 cursor-pointer" onClick={() => markRead(notification.id)}>
                          <div className="font-medium text-gray-800 dark:text-white">{notification.title}</div>
                          {notification.body ? (
                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notification.body}</div>
                          ) : null}
                          <div className="mt-1">
                            <Badge variant="outline" className={notification.read ? "text-gray-500 border-gray-300" : "text-blue-600 border-blue-300"}>
                              {notification.read ? "Lu" : "Non lu"}
                            </Badge>
                          </div>
                        </div>
                        <button aria-label="Supprimer" className="shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => removeNotification(notification.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    Aucune notification
                  </div>
                )}
              </div>
              <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                <Button variant="ghost" className="w-full text-xs" onClick={markAllRead}>
                  Marquer tout comme lu
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/10 p-1"
            onClick={() => setShowProfile(!showProfile)}
          >
            <Avatar className="h-8 w-8 border-2 border-white/20">
              <AvatarImage 
                src={currentUser?.avatar} 
                alt={currentUser?.name || "User"} 
              />
              <AvatarFallback className="bg-white/20 text-white text-sm">
                {getInitials(currentUser?.name || "User")}
              </AvatarFallback>
            </Avatar>
          </Button>
          
          {showProfile && (
            <div className="absolute right-0 top-12 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage 
                      src={currentUser?.avatar} 
                      alt={currentUser?.name || "User"} 
                    />
                    <AvatarFallback className="bg-blue-500 text-white">
                      {getInitials(currentUser?.name || "User")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 dark:text-white truncate">
                      {currentUser?.name || "Utilisateur"}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {currentUser?.email || "user@example.com"}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                      {currentUser?.role || ""}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => {
                    setShowProfile(false);
                    // Redirection vers les paramètres
                    window.location.href = '/settings';
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Paramètres
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => {
                    logout();
                    setShowProfile(false);
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnexion
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
