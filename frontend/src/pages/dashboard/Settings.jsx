import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { User, Globe, Moon, Sun, Save, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Settings = () => {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.put(`${API}/auth/me`, formData);
      updateUser(res.data);
      toast.success(t('common.save'));
    } catch (error) {
      toast.error(t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = async (lang) => {
    try {
      await axios.put(`${API}/auth/me/language?language=${lang}`);
      i18n.changeLanguage(lang);
      toast.success(t('common.save'));
    } catch (error) {
      console.error('Error updating language:', error);
    }
  };

  return (
    <div data-testid="settings-page" className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-heading font-bold">{t('common.settings')}</h1>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t('common.profile')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('auth.firstName')}</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  data-testid="settings-firstname-input"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('auth.lastName')}</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  data-testid="settings-lastname-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('common.email')}</Label>
              <Input value={user?.email} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>{t('common.phone')}</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                data-testid="settings-phone-input"
              />
            </div>

            <Button type="submit" className="btn-brand" disabled={loading} data-testid="settings-save-btn">
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {t('common.save')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            {t('common.theme')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('common.dark')}</p>
              <p className="text-sm text-muted-foreground">
                {theme === 'dark' ? 'Modo oscuro activado' : 'Modo claro activado'}
              </p>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
              data-testid="theme-switch"
            />
          </div>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            {t('common.language')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={i18n.language} onValueChange={handleLanguageChange}>
            <SelectTrigger data-testid="language-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Información de Cuenta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('users.role')}</span>
            <span className="font-medium">{t(`users.roles.${user?.role}`)}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">ID</span>
            <span className="font-mono text-sm">{user?.id}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
