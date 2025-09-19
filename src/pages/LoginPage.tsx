import React, { useState, useEffect, useRef } from 'react';
import { useAuth, Role, getUserData } from '../lib/rbac';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Lock, Hotel, Eye, EyeOff, ArrowRight, Moon, Stars } from 'lucide-react';

interface LoginFormData {
  username: string;
  password: string;
  role: Role | null;
}

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // États pour le formulaire
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
    role: null
  });
  
  // État pour gérer les erreurs
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  // Effet pour l'arrière-plan interactif avec effet de curseur fluide amélioré
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Configuration du canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particules pour l'effet de curseur fluide
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      life: number;
      maxLife: number;
      alpha: number;
      targetAlpha: number;
      vx: number;
      vy: number;
    }> = [];

    // Couleurs plus vibrantes et variées
    const colors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981', 
      '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316'
    ];

    let mouseX = 0;
    let mouseY = 0;
    let isMouseMoving = false;
    let mouseStopTimeout: NodeJS.Timeout;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      isMouseMoving = true;

      // Effacer le timeout précédent
      clearTimeout(mouseStopTimeout);
      
      // Créer des particules fluides autour du curseur
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5 + Math.random() * 0.5;
        const distance = Math.random() * 30 + 10;
        
        particles.push({
          x: mouseX + Math.cos(angle) * distance,
          y: mouseY + Math.sin(angle) * distance,
          size: Math.random() * 20 + 8,
          color: colors[Math.floor(Math.random() * colors.length)],
          speedX: Math.cos(angle) * 0.5 + (Math.random() - 0.5) * 2,
          speedY: Math.sin(angle) * 0.5 + (Math.random() - 0.5) * 2,
          life: 0,
          maxLife: Math.random() * 80 + 60,
          alpha: 0,
          targetAlpha: Math.random() * 0.8 + 0.4,
          vx: 0,
          vy: 0
        });
      }

      // Définir un timeout pour arrêter l'effet quand la souris s'arrête
      mouseStopTimeout = setTimeout(() => {
        isMouseMoving = false;
      }, 100);
    };

    // Animation fluide des particules
    const animate = () => {
      // Fond semi-transparent pour l'effet de traînée
      ctx.fillStyle = 'rgba(15, 23, 42, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Mettre à jour et dessiner les particules
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // Animation fluide de l'alpha
        if (p.alpha < p.targetAlpha) {
          p.alpha += 0.05;
        } else {
          p.alpha -= 0.02;
        }

        // Mouvement fluide avec inertie
        if (isMouseMoving) {
          const dx = mouseX - p.x;
          const dy = mouseY - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            p.vx += dx * 0.0001;
            p.vy += dy * 0.0001;
          }
        }

        // Application de la friction pour un mouvement plus naturel
        p.vx *= 0.95;
        p.vy *= 0.95;
        
        p.x += p.speedX + p.vx;
        p.y += p.speedY + p.vy;
        p.life++;

        // Gravité légère
        p.speedY += 0.02;
        
        // Effet de flottement
        p.speedX += Math.sin(p.life * 0.05) * 0.1;

        // Dessiner la particule avec un gradient radial amélioré
        const gradient = ctx.createRadialGradient(
          p.x, p.y, 0, 
          p.x, p.y, p.size
        );
        
        const alphaNormalized = Math.max(0, Math.min(1, p.alpha));
        const alphaHex = Math.round(alphaNormalized * 255).toString(16).padStart(2, '0');
        
        gradient.addColorStop(0, `${p.color}${alphaHex}`);
        gradient.addColorStop(0.5, `${p.color}${Math.round(alphaNormalized * 100).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, `${p.color}00`);
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Ajouter un effet de lueur
        ctx.shadowBlur = p.size;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Supprimer les particules anciennes
        if (p.life >= p.maxLife || p.alpha <= 0.01) {
          particles.splice(i, 1);
          i--;
        }
      }
      
      // Limiter le nombre de particules pour les performances
      if (particles.length > 200) {
        particles.splice(0, particles.length - 200);
      }
      
      requestAnimationFrame(animate);
    };

    animate();
    container.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      container.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(mouseStopTimeout);
    };
  }, []);

  // Gestion des champs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name as keyof LoginFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    
    if (loginError) {
      setLoginError('');
    }
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Partial<LoginFormData> = {};
    
    if (!formData.username.trim()) {
      newErrors.username = "Le nom d'utilisateur est requis";
    }
    if (!formData.password) {
      newErrors.password = "Le mot de passe est requis";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setLoginError('');
    
    try {
      const result = await login({
        username: formData.username,
        password: formData.password,
        role: formData.role!
      });
      
      if (result.success) {
        navigate('/');
      } else {
        setLoginError(result.error || 'Erreur de connexion');
      }
      
    } catch (error) {
      console.error('Erreur de connexion:', error);
      setLoginError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle mot de passe
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 relative overflow-hidden login-container"
    >
      {/* Canvas pour l'effet de curseur fluide */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 z-0"
      />
      
      {/* Étoiles en arrière-plan */}
      <div className="absolute inset-0 z-1 stars-bg"></div>
      
      {/* Contenu */}
      <div className="w-full max-w-md relative z-10">
        <Card className="overflow-hidden bg-slate-800/30 backdrop-blur-xl shadow-2xl border-0 rounded-2xl hover:shadow-2xl transition-all duration-500 hover-card border border-slate-700/50">
          {/* Section Logo */}
          <div className="text-center py-8 px-6 bg-gradient-to-r from-indigo-700/70 to-indigo-900/70 backdrop-blur-sm relative">
            <div className="absolute inset-0 opacity-20 pattern-dots"></div>
            <div className="mb-4 flex justify-center relative">
              <div className="w-16 h-16 bg-white/15 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-lg">
                <Moon className="w-8 h-8 text-white drop-shadow-lg" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-2 relative drop-shadow-lg">
              GoldenKey System
            </h1>
            <p className="text-white/90 text-sm font-medium">
              Système de Gestion Hôtelière
            </p>
          </div>

          {/* Formulaire */}
          <CardContent className="p-8 bg-slate-900/20 backdrop-blur-md">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-white mb-2">
                Connexion
              </h2>
              <p className="text-slate-300 text-sm">
                Accédez à votre espace de travail
              </p>
            </div>

            {loginError && (
              <div className="mb-4 rounded-lg border border-red-800/50 bg-red-900/20 backdrop-blur-sm px-4 py-3 text-sm text-red-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-2">{loginError}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-300 text-sm font-medium">
                  Nom d'utilisateur
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Entrez votre nom d'utilisateur"
                    className="pl-10 h-11 text-sm border-slate-600/50 bg-slate-700/30 backdrop-blur-sm text-white focus:border-indigo-500 focus:ring-indigo-500 rounded-lg transition-all duration-300 input-field"
                  />
                </div>
                {errors.username && (
                  <p className="text-xs text-red-400 mt-1">{errors.username}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 text-sm font-medium">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Entrez votre mot de passe"
                    className="pl-10 pr-10 h-11 text-sm border-slate-600/50 bg-slate-700/30 backdrop-blur-sm text-white focus:border-indigo-500 focus:ring-indigo-500 rounded-lg transition-all duration-300 input-field"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-400 focus:outline-none transition-colors duration-300"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-400 mt-1">{errors.password}</p>
                )}
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full h-11 text-sm bg-gradient-to-r from-indigo-600/80 to-indigo-700/80 hover:from-indigo-700/90 hover:to-indigo-800/90 backdrop-blur-sm text-white font-semibold rounded-lg shadow-md transition-all duration-300 hover:shadow-lg transform hover:-translate-y-0.5 button-hover-effect group border border-indigo-500/30"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connexion...
                  </div>
                ) : (
                  <>
                    <span>Se connecter</span>
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {/* Footer léger */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} GoldenKey System. Tous droits réservés.
          </p>
        </div>
      </div>

      <style>{`
        .login-container {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
        }
        
        .pattern-dots {
          background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        
        .hover-card {
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .hover-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        
        .input-field:focus {
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
          transform: translateY(-1px);
        }
        
        .button-hover-effect:hover {
          box-shadow: 0 15px 35px -5px rgba(79, 70, 229, 0.5);
        }
        
        .stars-bg {
          background-image: 
            radial-gradient(2px 2px at 20px 30px, rgba(238, 238, 238, 0.6), rgba(0,0,0,0)),
            radial-gradient(2px 2px at 40px 70px, rgba(255, 255, 255, 0.8), rgba(0,0,0,0)),
            radial-gradient(1px 1px at 90px 40px, rgba(221, 221, 221, 0.5), rgba(0,0,0,0)),
            radial-gradient(1px 1px at 130px 80px, rgba(255, 255, 255, 0.7), rgba(0,0,0,0)),
            radial-gradient(2px 2px at 160px 30px, rgba(221, 221, 221, 0.6), rgba(0,0,0,0)),
            radial-gradient(1px 1px at 200px 60px, rgba(238, 238, 238, 0.5), rgba(0,0,0,0)),
            radial-gradient(2px 2px at 230px 20px, rgba(255, 255, 255, 0.8), rgba(0,0,0,0)),
            radial-gradient(1px 1px at 270px 70px, rgba(221, 221, 221, 0.4), rgba(0,0,0,0)),
            radial-gradient(2px 2px at 300px 40px, rgba(238, 238, 238, 0.6), rgba(0,0,0,0)),
            radial-gradient(2px 2px at 330px 80px, rgba(255, 255, 255, 0.7), rgba(0,0,0,0)),
            radial-gradient(1px 1px at 360px 50px, rgba(221, 221, 221, 0.5), rgba(0,0,0,0)),
            radial-gradient(2px 2px at 390px 20px, rgba(238, 238, 238, 0.6), rgba(0,0,0,0));
          background-repeat: repeat;
          background-size: 400px 400px;
          animation: twinkle 25s linear infinite;
        }
        
        @keyframes twinkle {
          0% { 
            background-position: 0 0;
            opacity: 0.8;
          }
          50% {
            opacity: 1;
          }
          100% { 
            background-position: 400px 400px;
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;