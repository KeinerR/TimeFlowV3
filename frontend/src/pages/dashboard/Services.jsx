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
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Search, Scissors, MoreHorizontal, Loader2, Clock, DollarSign } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';



const Services = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_minutes: 30,
    price: '',
    business_id: '',
    staff_ids: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [servicesRes, businessesRes, staffRes] = await Promise.all([
        api.get(`/services`),
        user?.role === 'super_admin' || user?.role === 'admin' 
          ? api.get(`/businesses`)
          : Promise.resolve({ data: [] }),
        api.get(`/staff`)
      ]);
      setServices(servicesRes.data);
      setBusinesses(businessesRes.data);
      setStaffList(staffRes.data);
    } catch (error) {
      toast.error(t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : null,
        business_id: formData.business_id || user?.businesses?.[0]
      };

      if (selectedService) {
        await api.put(`/services/${selectedService.id}`, data);
        toast.success(t('common.save'));
      } else {
        await api.post(`/services`, data);
        toast.success(t('services.new'));
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('errors.serverError'));
    }
  };

  const toggleStatus = async (service) => {
    try {
      await api.put(`/services/${service.id}`, { is_active: !service.is_active });
      toast.success(service.is_active ? t('common.disable') : t('common.enable'));
      fetchData();
    } catch (error) {
      toast.error(t('errors.serverError'));
    }
  };

  const openEditDialog = (service) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      duration_minutes: service.duration_minutes,
      price: service.price || '',
      business_id: service.business_id,
      staff_ids: service.staff_ids || []
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedService(null);
    setFormData({
      name: '',
      description: '',
      duration_minutes: 30,
      price: '',
      business_id: '',
      staff_ids: []
    });
  };

  const filteredServices = services.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div data-testid="services-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-heading font-bold">{t('services.title')}</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="btn-brand" data-testid="new-service-btn">
              <Plus className="w-4 h-4 mr-2" />
              {t('services.new')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedService ? t('services.edit') : t('services.new')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {(user?.role === 'super_admin' || user?.role === 'admin') && businesses.length > 0 && (
                <div className="space-y-2">
                  <Label>{t('nav.businesses')}</Label>
                  <Select
                    value={formData.business_id}
                    onValueChange={(v) => setFormData({ ...formData, business_id: v })}
                    required
                  >
                    <SelectTrigger data-testid="service-business-select">
                      <SelectValue placeholder={t('landing.booking.selectBusiness')} />
                    </SelectTrigger>
                    <SelectContent>
                      {businesses.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>{t('services.name')}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="service-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('common.description')}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="service-desc-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('services.duration')}</Label>
                  <Input
                    type="number"
                    min="15"
                    step="15"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    required
                    data-testid="service-duration-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('services.price')}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="Opcional"
                    data-testid="service-price-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" className="btn-brand" data-testid="service-submit-btn">
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
              data-testid="search-services"
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
          ) : filteredServices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead>{t('common.duration')}</TableHead>
                  <TableHead>{t('common.price')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id} data-testid={`service-row-${service.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                          <Scissors className="w-5 h-5 text-brand" />
                        </div>
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-xs">{service.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {service.duration_minutes} {t('common.minutes')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {service.price ? (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          {service.price}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={service.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
                        {service.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`service-actions-${service.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(service)}>
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleStatus(service)}>
                            {service.is_active ? t('common.disable') : t('common.enable')}
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
              <Scissors className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('common.noData')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Services;
