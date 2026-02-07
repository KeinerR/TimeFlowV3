import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todayAppointments: 0,
    weekAppointments: 0,
    totalClients: 0,
    monthIncome: 0
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [appointmentsRes, reportsRes] = await Promise.all([
        axios.get(`${API}/appointments`),
        user?.role !== 'client' && user?.role !== 'staff' 
          ? axios.get(`${API}/reports/appointments`)
          : Promise.resolve({ data: {} })
      ]);

      const appointments = appointmentsRes.data;
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const todayApts = appointments.filter(a => a.date?.startsWith(today));
      const weekApts = appointments.filter(a => a.date >= weekAgo);

      setStats({
        todayAppointments: todayApts.length,
        weekAppointments: weekApts.length,
        totalClients: reportsRes.data?.total || 0,
        monthIncome: 0
      });

      setRecentAppointments(appointments.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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

  const basePath = `/${user?.role === 'super_admin' ? 'admin' : user?.role}`;

  return (
    <div data-testid="dashboard-page" className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">
            {t('dashboard.welcome')}, {user?.first_name}!
          </h1>
          <p className="text-muted-foreground">
            {t('dashboard.overview')}
          </p>
        </div>
        {user?.role !== 'client' && (
          <Link to={`${basePath}/appointments`}>
            <Button className="btn-brand" data-testid="new-appointment-btn">
              <Plus className="w-4 h-4 mr-2" />
              {t('dashboard.newAppointment')}
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="stat-card" data-testid="stat-today">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.todayAppointments')}</p>
                <p className="text-3xl font-heading font-bold mt-1">{stats.todayAppointments}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-brand/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-brand" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card" data-testid="stat-week">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.weekAppointments')}</p>
                <p className="text-3xl font-heading font-bold mt-1">{stats.weekAppointments}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {user?.role !== 'client' && user?.role !== 'staff' && (
          <>
            <Card className="stat-card" data-testid="stat-clients">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('dashboard.totalClients')}</p>
                    <p className="text-3xl font-heading font-bold mt-1">{stats.totalClients}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card" data-testid="stat-income">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('dashboard.totalIncome')}</p>
                    <p className="text-3xl font-heading font-bold mt-1">${stats.monthIncome}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Recent Appointments */}
      <Card data-testid="recent-appointments-card">
        <CardHeader>
          <CardTitle className="font-heading">{t('dashboard.recentActivity')}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAppointments.length > 0 ? (
            <div className="space-y-4">
              {recentAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  data-testid={`appointment-${apt.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-brand" />
                    </div>
                    <div>
                      <p className="font-medium">{apt.service?.name || 'Servicio'}</p>
                      <p className="text-sm text-muted-foreground">
                        {apt.client?.first_name} {apt.client?.last_name} • {new Date(apt.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusBadge(apt.status)}>
                    {t(`appointments.status.${apt.status}`)}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('common.noData')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
