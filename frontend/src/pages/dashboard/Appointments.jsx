import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Plus, Calendar as CalendarIcon, Search, Filter, MoreHorizontal, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Appointments = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [clients, setClients] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    business_id: '',
    service_id: '',
    staff_id: '',
    client_id: '',
    date: null,
    time: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const [aptsRes, servicesRes, staffRes, businessesRes] = await Promise.all([
        axios.get(`${API}/appointments${params}`),
        axios.get(`${API}/services`),
        axios.get(`${API}/staff`),
        user?.role === 'super_admin' || user?.role === 'admin' 
          ? axios.get(`${API}/businesses`)
          : Promise.resolve({ data: [] })
      ]);

      setAppointments(aptsRes.data);
      setServices(servicesRes.data);
      setStaffList(staffRes.data);
      setBusinesses(businessesRes.data);

      if (user?.role !== 'client') {
        const clientsRes = await axios.get(`${API}/users?role=client`);
        setClients(clientsRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dateTime = new Date(formData.date);
      const [hours, minutes] = formData.time.split(':');
      dateTime.setHours(parseInt(hours), parseInt(minutes));

      await axios.post(`${API}/appointments`, {
        business_id: formData.business_id || user?.businesses?.[0],
        service_id: formData.service_id,
        staff_id: formData.staff_id,
        client_id: formData.client_id || user?.id,
        date: dateTime.toISOString(),
        notes: formData.notes
      });

      toast.success(t('appointments.new') + ' - ' + t('common.save'));
      setDialogOpen(false);
      setFormData({ business_id: '', service_id: '', staff_id: '', client_id: '', date: null, time: '', notes: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('errors.serverError'));
    }
  };

  const updateStatus = async (id, status, price_final = null) => {
    try {
      const data = { status };
      if (price_final) data.price_final = price_final;
      
      await axios.put(`${API}/appointments/${id}`, data);
      toast.success(t(`appointments.status.${status}`));
      fetchData();
    } catch (error) {
      toast.error(t('errors.serverError'));
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'bg-warning/10 text-warning border-warning/20',
      confirmed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      attended: 'bg-success/10 text-success border-success/20',
      cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
      no_show: 'bg-muted text-muted-foreground border-muted',
      rescheduled: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
    };
    return variants[status] || variants.pending;
  };

  const filteredAppointments = appointments.filter(apt => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      apt.client?.first_name?.toLowerCase().includes(search) ||
      apt.client?.last_name?.toLowerCase().includes(search) ||
      apt.service?.name?.toLowerCase().includes(search)
    );
  });

  const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

  return (
    <div data-testid="appointments-page" className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">{t('appointments.title')}</h1>
        </div>
        {user?.role !== 'client' && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-brand" data-testid="new-appointment-dialog-btn">
                <Plus className="w-4 h-4 mr-2" />
                {t('appointments.new')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('appointments.new')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {(user?.role === 'super_admin' || user?.role === 'admin') && businesses.length > 0 && (
                  <div className="space-y-2">
                    <Label>{t('nav.businesses')}</Label>
                    <Select
                      value={formData.business_id}
                      onValueChange={(v) => setFormData({ ...formData, business_id: v })}
                    >
                      <SelectTrigger data-testid="apt-business-select">
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
                  <Label>{t('appointments.service')}</Label>
                  <Select
                    value={formData.service_id}
                    onValueChange={(v) => setFormData({ ...formData, service_id: v })}
                    required
                  >
                    <SelectTrigger data-testid="apt-service-select">
                      <SelectValue placeholder={t('landing.booking.selectService')} />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('appointments.staff')}</Label>
                  <Select
                    value={formData.staff_id}
                    onValueChange={(v) => setFormData({ ...formData, staff_id: v })}
                    required
                  >
                    <SelectTrigger data-testid="apt-staff-select">
                      <SelectValue placeholder={t('landing.booking.selectStaff')} />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.user?.first_name} {s.user?.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {user?.role !== 'client' && (
                  <div className="space-y-2">
                    <Label>{t('appointments.client')}</Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={(v) => setFormData({ ...formData, client_id: v })}
                    >
                      <SelectTrigger data-testid="apt-client-select">
                        <SelectValue placeholder={t('clients.title')} />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.first_name} {c.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('appointments.date')}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start" data-testid="apt-date-btn">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.date ? format(formData.date, 'PPP', { locale: i18n.language === 'es' ? es : enUS }) : t('appointments.date')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.date}
                          onSelect={(date) => setFormData({ ...formData, date })}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('appointments.time')}</Label>
                    <Select
                      value={formData.time}
                      onValueChange={(v) => setFormData({ ...formData, time: v })}
                      required
                    >
                      <SelectTrigger data-testid="apt-time-select">
                        <SelectValue placeholder={t('appointments.time')} />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('appointments.notes')}</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    data-testid="apt-notes-input"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" className="btn-brand" data-testid="apt-submit-btn">
                    {t('common.save')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
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
                data-testid="search-appointments"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48" data-testid="status-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="pending">{t('appointments.status.pending')}</SelectItem>
                <SelectItem value="confirmed">{t('appointments.status.confirmed')}</SelectItem>
                <SelectItem value="attended">{t('appointments.status.attended')}</SelectItem>
                <SelectItem value="cancelled">{t('appointments.status.cancelled')}</SelectItem>
                <SelectItem value="no_show">{t('appointments.status.no_show')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand" />
            </div>
          ) : filteredAppointments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('appointments.client')}</TableHead>
                  <TableHead>{t('appointments.service')}</TableHead>
                  <TableHead>{t('appointments.staff')}</TableHead>
                  <TableHead>{t('appointments.date')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.map((apt) => (
                  <TableRow key={apt.id} data-testid={`apt-row-${apt.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{apt.client?.first_name} {apt.client?.last_name}</p>
                        <p className="text-sm text-muted-foreground">{apt.client?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{apt.service?.name}</TableCell>
                    <TableCell>{apt.staff?.user?.first_name} {apt.staff?.user?.last_name}</TableCell>
                    <TableCell>
                      {apt.date && format(new Date(apt.date), 'PPp', { locale: i18n.language === 'es' ? es : enUS })}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(apt.status)}>
                        {t(`appointments.status.${apt.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {user?.role !== 'client' && apt.status !== 'attended' && apt.status !== 'cancelled' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`apt-actions-${apt.id}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {apt.status === 'pending' && (
                              <DropdownMenuItem onClick={() => updateStatus(apt.id, 'confirmed')}>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {t('appointments.actions.confirm')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => updateStatus(apt.id, 'attended')}>
                              <CheckCircle className="w-4 h-4 mr-2 text-success" />
                              {t('appointments.actions.markAttended')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(apt.id, 'no_show')}>
                              <Clock className="w-4 h-4 mr-2" />
                              {t('appointments.actions.markNoShow')}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => updateStatus(apt.id, 'cancelled')}
                              className="text-destructive"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              {t('appointments.actions.cancel')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('common.noData')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Appointments;
