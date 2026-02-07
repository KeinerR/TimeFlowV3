import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const Login = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(formData.email, formData.password);
      toast.success(t('auth.welcomeBack'));
      
      // Redirect based on role
      const redirectMap = {
        super_admin: '/admin',
        admin: '/admin',
        business: '/business',
        staff: '/staff',
        client: '/client'
      };
      navigate(redirectMap[user.role] || '/');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-transparent to-transparent" />
      
      <Card className="w-full max-w-md relative z-10 animate-slide-up">
        <CardHeader className="text-center space-y-2">
          <Link to="/" className="inline-block">
            <h1 className="text-2xl font-heading font-bold text-brand">TimeFlow</h1>
          </Link>
          <CardTitle className="text-2xl font-heading">{t('auth.welcomeBack')}</CardTitle>
          <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                data-testid="login-email-input"
                placeholder="ejemplo@correo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  data-testid="login-password-input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <Button
              type="submit"
              data-testid="login-submit-btn"
              className="w-full btn-brand"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                t('auth.signIn')
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{t('auth.noAccount')} </span>
            <Link to="/register" className="text-brand hover:underline font-medium">
              {t('auth.signUp')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
