import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, Phone } from "lucide-react";
import { useUserProfile, getUserData } from "@/lib/rbac"; // Import des hooks

// Données de base de l'équipe
const baseTeam = [
  { id: 1, username: "admin", role: "admin", dept: "Direction" },
  { id: 2, username: "manager", role: "manager", dept: "hotel" },
  { id: 3, username: "reception", role: "reception", dept: "hotel" },
  { id: 4, username: "serveur", role: "server", dept: "restaurant" },
  { id: 5, username: "cuisine", role: "kitchen", dept: "restaurant" },
  { id: 6, username: "bar", role: "bar", dept: "pub" },
  { id: 7, username: "spa", role: "spa", dept: "spa" },
  { id: 8, username: "compta", role: "accounting", dept: "Comptabilité" },
];

export default function Team() {
  const currentUser = useUserProfile(); // Pour les mises à jour en temps réel
  
  // Obtenir les données utilisateur mises à jour
  const getUpdatedUserData = (username: string) => {
    const userData = getUserData(username);
    return {
      name: userData?.name || username,
      email: userData?.email || `${username}@hotel-vatola.com`,
      phone: userData?.phone || '',
      avatar: userData?.avatar
    };
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Équipe</h1>
            <p className="text-muted-foreground">Utilisateurs et rôles</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5"/> Membres de l'équipe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {baseTeam.map(user => {
                  const userData = getUpdatedUserData(user.username);
                  
                  return (
                    <div key={user.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                          {userData.avatar ? (
                            <img 
                              src={userData.avatar} 
                              alt={userData.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            userData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                          )}
                        </div>
                        <div>
                          <div className="font-semibold">{userData.name}</div>
                          <div className="text-sm text-muted-foreground capitalize">{user.dept}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        {userData.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span className="truncate">{userData.email}</span>
                          </div>
                        )}
                        
                        {userData.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{userData.phone}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3">
                        <Badge variant="outline" className="capitalize">
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}