"use client";
import React, { useEffect, useState } from 'react';
import { supabase, fetchSystems, System } from '@/lib/supabaseClient';
import SystemCard from '@/components/SystemCard';

export default function RcmPage() {
  const [systems, setSystems] = useState<System[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  // Load current user's roles
  async function loadUserRoles() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', user.id);
    if (error) {
      console.error('Error loading roles', error);
      return [];
    }
    const roleIds = data.map((r: any) => r.role_id);
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('name')
      .in('id', roleIds);
    if (roleError) {
      console.error('Error fetching role names', roleError);
      return [];
    }
    return roleData?.map((r: any) => r.name) ?? [];
  }

  useEffect(() => {
    async function init() {
      const [systemsData, roles] = await Promise.all([fetchSystems(), loadUserRoles()]);
      setSystems(systemsData);
      setUserRoles(roles);
      setLoading(false);
    }
    init();

    const subscription = supabase
      .channel('public:systems')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'systems' }, (payload) => {
        // Re-fetch systems on any change for simplicity
        fetchSystems().then(setSystems);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const canControl = (system: System) => {
    if (userRoles.includes('admin') || userRoles.includes('superadmin')) return true;
    if (system.type === 'web_server' && userRoles.includes('devops')) return true;
    if (system.type === 'ci_pipeline' && userRoles.includes('devops')) return true;
    if (system.type === 'seo_crawler' && userRoles.includes('seo')) return true;
    if (system.type === 'marketing_campaign' && userRoles.includes('marketing')) return true;
    return false;
  };

  const handleAction = async (systemId: string, action: string) => {
    const { error } = await supabase
      .from('actions')
      .insert({ system_id: systemId, action_type: action, performed_by: (await supabase.auth.getUser()).data?.user?.id });
    if (error) console.error('Action error', error);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-pureWhite p-8">
      <h1 className="text-3xl font-bold text-deepOrange mb-4">RCM Dashboard</h1>
      {loading ? (
        <p>Loading systems…</p>
      ) : (
        <div className="w-full flex flex-col items-center">
          {systems.map((sys) => (
            <SystemCard
              key={sys.id}
              system={sys}
              canControl={canControl(sys)}
              onAction={(action) => handleAction(sys.id, action)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
