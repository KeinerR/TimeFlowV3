import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { Plus, Search, Building2, MoreHorizontal, Loader2, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Businesses = () => {
  const { t } = useTranslation();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: ''
  });
  const [paymentConfig, setPaymentConfig] = useState({
    payu: { enabled: false, merchant_id: '', api_key: '', api_login: '', account_id: '' },
    transfer: { enabled: false, bank_name: '', account_number: '', account_type: '', holder_name: '' }
  });

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      const res = await axios.get(`${API}/businesses`);
      setBusinesses(res.data);
    } catch (error) {
      toast.error(t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedBusiness) {
        await axios.put(`${API}/businesses/${selectedBusiness.id}`, formData);
        toast.success(t('common.save'));
      } else {
        await axios.post(`${API}/businesses`, formData);
        toast.success(t('businesses.new'));
      }
      setDialogOpen(false);
      resetForm();
      fetchBusinesses();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('errors.serverError'));
    }
  };

  const handlePaymentConfig = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/businesses/${selectedBusiness.id}/payment-config`, paymentConfig);
      toast.success(t('common.save'));
      setConfigDialogOpen(false);
      fetchBusinesses();
    } catch (error) {
      toast.error(t('errors.serverError'));
    }
  };

  const toggleStatus = async (business) => {
    try {
      await axios.put(`${API}/businesses/${business.id}`, { is_active: !business.is_active });
      toast.success(business.is_active ? t('common.disable') : t('common.enable'));
      fetchBusinesses();
    } catch (error) {
      toast.error(t('errors.serverError'));
    }
  };

  const openEditDialog = (business) => {
    setSelectedBusiness(business);
    setFormData({
      name: business.name,
      description: business.description || '',
      address: business.address || '',
      phone: business.phone || '',
      email: business.email || ''
    });
    setDialogOpen(true);
  };

  const openConfigDialog = (business) => {
    setSelectedBusiness(business);
    setPaymentConfig(business.payment_config || {
      payu: { enabled: false, merchant_id: '', api_key: '', api_login: '', account_id: '' },
      transfer: { enabled: false, bank_name: '', account_number: '', account_type: '', holder_name: '' }
    });
    setConfigDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedBusiness(null);
    setFormData({ name: '', description: '', address: '', phone: '', email: '' });
  };

  const filteredBusinesses = businesses.filter(b =>
    b.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div data-testid="businesses-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-heading font-bold">{t('businesses.title')}</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="btn-brand" data-testid="new-business-btn">
              <Plus className="w-4 h-4 mr-2" />
              {t('businesses.new')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedBusiness ? t('businesses.edit') : t('businesses.new')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t('common.name')}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="business-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('common.description')}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="business-desc-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('common.phone')}</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    data-testid="business-phone-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('common.email')}</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    data-testid="business-email-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('common.address')}</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  data-testid="business-address-input"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" className="btn-brand" data-testid="business-submit-btn">
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('businesses.paymentConfig')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentConfig} className="space-y-6">
            {/* PayU Config */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{t('businesses.payu')}</Label>
                <Switch
                  checked={paymentConfig.payu?.enabled}
                  onCheckedChange={(checked) => setPaymentConfig({
                    ...paymentConfig,
                    payu: { ...paymentConfig.payu, enabled: checked }
                  })}
                  data-testid="payu-toggle"
                />
              </div>
              {paymentConfig.payu?.enabled && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-brand">
                  <div className="space-y-2">
                    <Label>Merchant ID</Label>
                    <Input
                      value={paymentConfig.payu?.merchant_id || ''}
                      onChange={(e) => setPaymentConfig({
                        ...paymentConfig,
                        payu: { ...paymentConfig.payu, merchant_id: e.target.value }
                      })}
                      data-testid="payu-merchant-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account ID</Label>
                    <Input
                      value={paymentConfig.payu?.account_id || ''}
                      onChange={(e) => setPaymentConfig({
                        ...paymentConfig,
                        payu: { ...paymentConfig.payu, account_id: e.target.value }
                      })}
                      data-testid="payu-account-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      value={paymentConfig.payu?.api_key || ''}
                      onChange={(e) => setPaymentConfig({
                        ...paymentConfig,
                        payu: { ...paymentConfig.payu, api_key: e.target.value }
                      })}
                      data-testid="payu-apikey-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>API Login</Label>
                    <Input
                      value={paymentConfig.payu?.api_login || ''}
                      onChange={(e) => setPaymentConfig({
                        ...paymentConfig,
                        payu: { ...paymentConfig.payu, api_login: e.target.value }
                      })}
                      data-testid="payu-apilogin-input"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Transfer Config */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{t('businesses.transfer')}</Label>
                <Switch
                  checked={paymentConfig.transfer?.enabled}
                  onCheckedChange={(checked) => setPaymentConfig({
                    ...paymentConfig,
                    transfer: { ...paymentConfig.transfer, enabled: checked }
                  })}
                  data-testid="transfer-toggle"
                />
              </div>
              {paymentConfig.transfer?.enabled && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-brand">
                  <div className="space-y-2">
                    <Label>Banco</Label>
                    <Input
                      value={paymentConfig.transfer?.bank_name || ''}
                      onChange={(e) => setPaymentConfig({
                        ...paymentConfig,
                        transfer: { ...paymentConfig.transfer, bank_name: e.target.value }
                      })}
                      data-testid="transfer-bank-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Cuenta</Label>
                    <Input
                      value={paymentConfig.transfer?.account_type || ''}
                      onChange={(e) => setPaymentConfig({
                        ...paymentConfig,
                        transfer: { ...paymentConfig.transfer, account_type: e.target.value }
                      })}
                      data-testid="transfer-type-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Número de Cuenta</Label>
                    <Input
                      value={paymentConfig.transfer?.account_number || ''}
                      onChange={(e) => setPaymentConfig({
                        ...paymentConfig,
                        transfer: { ...paymentConfig.transfer, account_number: e.target.value }
                      })}
                      data-testid="transfer-number-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Titular</Label>
                    <Input
                      value={paymentConfig.transfer?.holder_name || ''}
                      onChange={(e) => setPaymentConfig({
                        ...paymentConfig,
                        transfer: { ...paymentConfig.transfer, holder_name: e.target.value }
                      })}
                      data-testid="transfer-holder-input"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfigDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" className="btn-brand" data-testid="payment-config-submit">
                {t('common.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-businesses"
            />
          </div>
        </CardContent>
      </Card>

      {/* Businesses Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand" />
            </div>
          ) : filteredBusinesses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead>{t('common.phone')}</TableHead>
                  <TableHead>{t('common.email')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBusinesses.map((business) => (
                  <TableRow key={business.id} data-testid={`business-row-${business.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-brand" />
                        </div>
                        <div>
                          <p className="font-medium">{business.name}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-xs">{business.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{business.phone || '-'}</TableCell>
                    <TableCell>{business.email || '-'}</TableCell>
                    <TableCell>
                      <Badge className={business.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
                        {business.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`business-actions-${business.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(business)}>
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openConfigDialog(business)}>
                            <Settings className="w-4 h-4 mr-2" />
                            {t('businesses.paymentConfig')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleStatus(business)}>
                            {business.is_active ? t('common.disable') : t('common.enable')}
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
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('common.noData')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Businesses;
