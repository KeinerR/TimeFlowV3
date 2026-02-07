import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Search, Users, MoreHorizontal, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const UsersPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'client',
    business_ids: []
  });

  const roles = ['client', 'staff', 'business', 'admin'];
  if (user?.role === 'super_admin') roles.push('super_admin');

  useEffect(() => {
    fetchData();
  }, [roleFilter]);

  const fetchData = async () => {
    try {
      const params = roleFilter !== 'all' ? `?role=${roleFilter}` : '';
      const [usersRes, businessesRes] = await Promise.all([
        axios.get(`${API}/users${params}`),
        user?.role === 'super_admin' || user?.role === 'admin'
          ? axios.get(`${API}/businesses`)
          : Promise.resolve({ data: [] })
      ]);
      setUsers(usersRes.data);
      setBusinesses(businessesRes.data);
    } catch (error) {
      toast.error(t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedUser) {
        await axios.put(`${API}/users/${selectedUser.id}`, {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          role: formData.role,
          is_active: true
        });
        if (formData.business_ids.length > 0) {
          await axios.put(`${API}/users/${selectedUser.id}/businesses`, formData.business_ids);
        }
        toast.success(t('common.save'));
      } else {
        await axios.post(`${API}/users?role=${formData.role}&business_ids=${formData.business_ids.join(',')}`, {
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone
        });
        toast.success(t('users.new'));
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('errors.serverError'));
    }
  };

  const toggleStatus = async (u) => {
    try {
      await axios.put(`${API}/users/${u.id}`, { is_active: !u.is_active });
      toast.success(u.is_active ? t('common.disable') : t('common.enable'));
      fetchData();
    } catch (error) {
      toast.error(t('errors.serverError'));
    }
  };

  const openEditDialog = (u) => {
    setSelectedUser(u);
    setFormData({
      email: u.email,
      password: '',
      first_name: u.first_name,
      last_name: u.last_name,
      phone: u.phone || '',
      role: u.role,
      business_ids: u.businesses || []
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedUser(null);
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone: '',
      role: 'client',
      business_ids: []
    });
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      super_admin: 'bg-purple-500/10 text-purple-500',
      admin: 'bg-blue-500/10 text-blue-500',
      business: 'bg-brand/10 text-brand',
      staff: 'bg-success/10 text-success',
      client: 'bg-muted text-muted-foreground'
    };
    return colors[role] || colors.client;
  };

  const filteredUsers = users.filter(u =>
    u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div data-testid="users-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-heading font-bold">{t('users.title')}</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="btn-brand" data-testid="new-user-btn">
              <Plus className="w-4 h-4 mr-2" />
              {t('users.new')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedUser ? t('users.edit') : t('users.new')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!selectedUser && (
                <>
                  <div className="space-y-2">
                    <Label>{t('common.email')}</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      data-testid="user-email-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('auth.password')}</Label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      data-testid="user-password-input"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('auth.firstName')}</Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                    data-testid="user-firstname-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('auth.lastName')}</Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                    data-testid="user-lastname-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('common.phone')}</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  data-testid="user-phone-input"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('users.role')}</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => setFormData({ ...formData, role: v })}
                  disabled={user?.role !== 'super_admin' && (formData.role === 'super_admin' || formData.role === 'admin')}
                >
                  <SelectTrigger data-testid="user-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r} value={r}>{t(`users.roles.${r}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {businesses.length > 0 && (
                <div className="space-y-2">
                  <Label>{t('users.assignBusiness')}</Label>
                  <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg max-h-40 overflow-y-auto">
                    {businesses.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.business_ids.includes(b.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, business_ids: [...formData.business_ids, b.id] });
                            } else {
                              setFormData({ ...formData, business_ids: formData.business_ids.filter(id => id !== b.id) });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{b.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" className="btn-brand" data-testid="user-submit-btn">
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-users"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-48" data-testid="role-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>{t(`users.roles.${r}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand" />
            </div>
          ) : filteredUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead>{t('common.email')}</TableHead>
                  <TableHead>{t('users.role')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id} data-testid={`user-row-${u.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
                          <span className="font-medium text-brand">
                            {u.first_name?.[0]}{u.last_name?.[0]}
                          </span>
                        </div>
                        <p className="font-medium">{u.first_name} {u.last_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(u.role)}>
                        {t(`users.roles.${u.role}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={u.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
                        {u.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`user-actions-${u.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(u)}>
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleStatus(u)}>
                            {u.is_active ? t('common.disable') : t('common.enable')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('common.noData')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersPage;
