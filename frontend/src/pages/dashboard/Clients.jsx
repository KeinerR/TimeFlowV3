import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Search, Users, Loader2, Plus, Eye, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';



const Clients = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientAppointments, setClientAppointments] = useState([]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: ''
  });

  const canCreateClient = ['super_admin', 'admin', 'business', 'staff'].includes(user?.role);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await api.get(`/users?role=client`);
      setClients(res.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/users?role=client`, {
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone
      });
      toast.success(t('clients.new') + ' - ' + t('common.save'));
      setDialogOpen(false);
      resetForm();
      fetchClients();
    } catch (error) {
      let errorMessage = t('errors.serverError');
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          errorMessage = detail.map(d => d.msg || d.message || JSON.stringify(d)).join(', ');
        } else if (typeof detail === 'object') {
          errorMessage = detail.msg || detail.message || JSON.stringify(detail);
        }
      }
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone: ''
    });
  };

  const openClientDetail = async (client) => {
    setSelectedClient(client);
    setDetailDialogOpen(true);
    try {
      const res = await api.get(`/appointments?client_id=${client.id}`);
      setClientAppointments(res.data);
    } catch (error) {
      console.error('Error fetching client appointments:', error);
    }
  };

  const toggleStatus = async (client) => {
    try {
      await api.put(`/users/${client.id}`, { is_active: !client.is_active });
      toast.success(client.is_active ? t('common.disable') : t('common.enable'));
      fetchClients();
    } catch (error) {
      toast.error(t('errors.serverError'));
    }
  };

  const filteredClients = clients.filter(c =>
    c.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div data-testid="clients-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-heading font-bold">{t('clients.title')}</h1>
        {canCreateClient && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="btn-brand" data-testid="new-client-btn">
                <Plus className="w-4 h-4 mr-2" />
                {t('clients.new')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('clients.new')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('common.email')}</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    data-testid="client-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('auth.password')}</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    data-testid="client-password-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('auth.firstName')}</Label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                      data-testid="client-firstname-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('auth.lastName')}</Label>
                    <Input
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                      data-testid="client-lastname-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('common.phone')}</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    data-testid="client-phone-input"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" className="btn-brand" data-testid="client-submit-btn">
                    {t('common.save')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-clients"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand" />
            </div>
          ) : filteredClients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead>{t('common.email')}</TableHead>
                  <TableHead>{t('common.phone')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id} data-testid={`client-row-${client.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
                          <span className="font-medium text-brand">
                            {client.first_name?.[0]}{client.last_name?.[0]}
                          </span>
                        </div>
                        <p className="font-medium">{client.first_name} {client.last_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge className={client.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
                        {client.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`client-actions-${client.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openClientDetail(client)}>
                            <Eye className="w-4 h-4 mr-2" />
                            {t('appointments.details')}
                          </DropdownMenuItem>
                          {canCreateClient && (
                            <DropdownMenuItem onClick={() => toggleStatus(client)}>
                              {client.is_active ? t('common.disable') : t('common.enable')}
                            </DropdownMenuItem>
                          )}
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

      {/* Client Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('appointments.details')}</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-brand">
                    {selectedClient.first_name?.[0]}{selectedClient.last_name?.[0]}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedClient.first_name} {selectedClient.last_name}</h3>
                  <p className="text-muted-foreground">{selectedClient.email}</p>
                  {selectedClient.phone && <p className="text-sm">{selectedClient.phone}</p>}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">{t('clients.history')}</h4>
                {clientAppointments.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {clientAppointments.map((apt) => (
                      <div key={apt.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{apt.service?.name}</span>
                          <Badge className={apt.status === 'attended' ? 'bg-success/10 text-success' : 'bg-muted'}>
                            {t(`appointments.status.${apt.status}`)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {apt.date && new Date(apt.date).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">{t('common.noData')}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">{t('clients.totalVisits')}</p>
                  <p className="text-2xl font-bold">{clientAppointments.filter(a => a.status === 'attended').length}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">{t('common.status')}</p>
                  <p className="text-2xl font-bold">{selectedClient.is_active ? t('common.active') : t('common.inactive')}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;
