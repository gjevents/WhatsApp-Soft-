import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { BarChart3, CheckCircle2, CircleDashed, Contact2, Download, ExternalLink, FileText, Gauge, LayoutDashboard, MessageSquareText, Pencil, Phone, Settings, Trash2, UploadCloud, Users, Zap } from 'lucide-react';
import { Route, Routes, Link, NavLink } from 'react-router-dom';
import axios from 'axios';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { io } from 'socket.io-client';
import type { AppSettings, Campaign, Contact, ContactGroup, DashboardData, MediaFile } from './types';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const WHATSAPP_SOCKET_URL = import.meta.env.VITE_WHATSAPP_SOCKET_URL || window.location.origin;

const navItems = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Contacts', to: '/contacts', icon: Contact2 },
  { label: 'Groups', to: '/groups', icon: Users },
  { label: 'Create Campaign', to: '/campaigns/new', icon: MessageSquareText },
  { label: 'Campaigns', to: '/campaigns', icon: Gauge },
  { label: 'Media', to: '/media', icon: UploadCloud },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
  { label: 'WhatsApp', to: '/whatsapp', icon: Phone },
  { label: 'Settings', to: '/settings', icon: Settings },
];

const emptyContactForm = { name: '', mobile: '', consent_status: 'OPTED_IN' as const };

function App() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [whatsappStatus, setWhatsappStatus] = useState<{ status: string; qr?: string | null; message?: string }>({ status: 'DISCONNECTED' });
  const [contactForm, setContactForm] = useState(emptyContactForm);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ connected_phone: '', default_delay_seconds: 5 });

  const loadDashboard = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/dashboard`);
      setDashboard(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadContacts = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/contacts`);
      setContacts(data.items || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadCampaigns = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/campaigns`);
      setCampaigns(data.items || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadWhatsAppState = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/whatsapp/status`);
      setWhatsappStatus(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadGroups = async () => {
    const { data } = await axios.get(`${API_URL}/groups`);
    setGroups(data.items || []);
  };

  const loadSettings = async () => {
    const { data } = await axios.get(`${API_URL}/settings`);
    setSettings(data);
  };

  useEffect(() => {
    loadDashboard();
    loadContacts();
    loadCampaigns();
    loadWhatsAppState();
    loadGroups();
    loadSettings();

    const socket = io(WHATSAPP_SOCKET_URL, { path: '/socket.io' });
    socket.on('whatsapp-state', (payload) => {
      setWhatsappStatus(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const eligibleContacts = useMemo(() => contacts.filter((contact) => contact.consent_status === 'OPTED_IN'), [contacts]);

  const handleCreateContact = async () => {
    const payload = { ...contactForm, name: contactForm.name.trim(), mobile: contactForm.mobile.trim() };
    if (!payload.name || !payload.mobile) {
      alert('Contact name and mobile number are required.');
      return;
    }
    try {
      await axios.post(`${API_URL}/contacts`, payload);
      setContactForm(emptyContactForm);
      loadContacts();
      loadDashboard();
    } catch (error: any) {
      const responseData = error?.response?.data;
      const validationMessage = responseData && Object.entries(responseData)
        .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
        .join('\n');
      alert(responseData?.error || validationMessage || 'Unable to create contact');
    }
  };

  const handleEditContact = async (contact: Contact) => {
    const name = window.prompt('Contact name', contact.name);
    if (name === null || !name.trim()) return;
    try {
      await axios.put(`${API_URL}/contacts/${contact.id}`, { ...contact, name: name.trim() });
      loadContacts();
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Unable to edit contact');
    }
  };

  const handleDeleteContact = async (contact: Contact) => {
    if (!window.confirm(`Delete ${contact.name}?`)) return;
    try {
      await axios.delete(`${API_URL}/contacts/${contact.id}`);
      loadContacts();
      loadGroups();
      loadDashboard();
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Unable to delete contact');
    }
  };

  const handleConnectWhatsApp = async () => {
    try {
      if (!settings.connected_phone.trim()) {
        alert('Save the WhatsApp number in Settings before connecting.');
        return;
      }
      await axios.post(`${API_URL}/whatsapp/connect`, { phone: settings.connected_phone });
      loadWhatsAppState();
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Unable to connect');
    }
  };

  const handleDisconnectWhatsApp = async () => {
    try {
      await axios.post(`${API_URL}/whatsapp/disconnect`);
      loadWhatsAppState();
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Unable to disconnect');
    }
  };

  const chartData = [
    { name: 'Total', value: dashboard?.total_contacts || 0 },
    { name: 'Campaigns', value: dashboard?.total_campaigns || 0 },
    { name: 'Sent', value: dashboard?.messages_sent || 0 },
    { name: 'Failed', value: dashboard?.messages_failed || 0 },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="w-72 border-r border-slate-800 bg-slate-900/80 p-5">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-600 p-2"><Zap size={18} /></div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-violet-300">GJ Events</p>
              <h1 className="text-xl font-bold">Automation</h1>
            </div>
          </div>
        </div>
        <nav className="space-y-2">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/campaigns' || to === '/'}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-violet-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-6">
        <Routes>
          <Route path="/" element={<DashboardPage dashboard={dashboard} chartData={chartData} />} />
          <Route path="/contacts" element={<ContactsPage contacts={contacts} contactForm={contactForm} setContactForm={setContactForm} onCreate={handleCreateContact} onEdit={handleEditContact} onDelete={handleDeleteContact} />} />
          <Route path="/groups" element={<GroupWorkspacePage contacts={eligibleContacts} groups={groups} onSaved={loadGroups} />} />
          <Route path="/campaigns/new" element={<CreateCampaignPage eligibleContacts={eligibleContacts} groups={groups} selectedIds={selectedIds} setSelectedIds={setSelectedIds} defaultDelay={settings.default_delay_seconds} />} />
          <Route path="/campaigns" element={<CampaignsPage campaigns={campaigns} onRefresh={loadCampaigns} />} />
          <Route path="/whatsapp" element={<WhatsAppPage whatsappStatus={whatsappStatus} onConnect={handleConnectWhatsApp} onDisconnect={handleDisconnectWhatsApp} />} />
          <Route path="/settings" element={<SettingsPage settings={settings} onSaved={loadSettings} />} />
          <Route path="/media" element={<MediaLibraryPage />} />
          <Route path="/reports" element={<ReportsDashboardPage />} />
        </Routes>
      </main>
    </div>
  );
}

function DashboardPage({ dashboard, chartData }: { dashboard: DashboardData | null; chartData: any[] }) {
  const cards = [
    { label: 'Total Contacts', value: dashboard?.total_contacts || 0, icon: Users },
    { label: 'Total Campaigns', value: dashboard?.total_campaigns || 0, icon: Gauge },
    { label: 'Messages Sent', value: dashboard?.messages_sent || 0, icon: CheckCircle2 },
    { label: 'Messages Failed', value: dashboard?.messages_failed || 0, icon: CircleDashed },
    { label: 'Messages Pending', value: dashboard?.messages_pending || 0, icon: FileText },
    { label: 'WhatsApp Status', value: dashboard?.whatsapp_status || 'DISCONNECTED', icon: Phone },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-violet-300">Overview</p>
          <h2 className="mt-1 text-3xl font-bold">GJ Events Dashboard</h2>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-slate-950/40">
            <div className="mb-2 flex items-center justify-between text-slate-400">
              <span>{label}</span>
              <Icon size={18} />
            </div>
            <div className="text-3xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="mb-4 text-lg font-semibold">Performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  cursor={false}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '10px', color: '#e2e8f0', boxShadow: '0 10px 25px rgba(2, 6, 23, 0.45)' }}
                  labelStyle={{ color: '#cbd5e1' }}
                  itemStyle={{ color: '#ddd6fe' }}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} activeBar={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="mb-4 text-lg font-semibold">Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '10px', color: '#e2e8f0', boxShadow: '0 10px 25px rgba(2, 6, 23, 0.45)' }}
                  labelStyle={{ color: '#cbd5e1' }}
                  itemStyle={{ color: '#bbf7d0' }}
                />
                <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactsPage({ contacts, contactForm, setContactForm, onCreate, onEdit, onDelete }: { contacts: Contact[]; contactForm: any; setContactForm: any; onCreate: () => void; onEdit: (contact: Contact) => void; onDelete: (contact: Contact) => void; }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-violet-300">Contacts</p>
            <h2 className="mt-1 text-3xl font-bold">Manage contacts</h2>
          </div>
          <div className="rounded-lg bg-violet-600/20 px-3 py-2 text-sm font-medium text-violet-200">{contacts.length} Contacts</div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="mb-4 text-xl font-semibold">Add Contact</h3>
          <div className="space-y-4">
            <input required value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3" placeholder="Contact Name" />
            <input required value={contactForm.mobile} onChange={(e) => setContactForm({ ...contactForm, mobile: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3" placeholder="Mobile Number" />
            <select value={contactForm.consent_status} onChange={(e) => setContactForm({ ...contactForm, consent_status: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3">
              <option value="OPTED_IN">OPTED_IN</option>
              <option value="PENDING">PENDING</option>
              <option value="OPTED_OUT">OPTED_OUT</option>
            </select>
            <button onClick={onCreate} className="w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white">Add Contact</button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="mb-4 text-xl font-semibold">Contacts List</h3>
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div>
                  <div className="font-medium">{contact.name}</div>
                  <div className="text-sm text-slate-400">{contact.mobile}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-violet-600/20 px-2 py-1 text-xs text-violet-200">{contact.consent_status}</span>
                  <button title="Edit contact" onClick={() => onEdit(contact)} className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"><Pencil size={16} /></button>
                  <button title="Delete contact" onClick={() => onDelete(contact)} className="rounded-lg p-2 text-red-300 hover:bg-red-950"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateCampaignPage({ eligibleContacts, groups, selectedIds, setSelectedIds, defaultDelay }: { eligibleContacts: Contact[]; groups: ContactGroup[]; selectedIds: number[]; setSelectedIds: any; defaultDelay: number; }) {
  const [campaignName, setCampaignName] = useState('');
  const [message, setMessage] = useState('Hello {{name}},\n\nGJ Events is pleased to announce our latest event services.\n\nContact us for more information.');
  const [delay, setDelay] = useState(defaultDelay);
  const [files, setFiles] = useState<File[]>([]);
  const [groupId, setGroupId] = useState('');

  const toggleContact = (id: number) => {
    setSelectedIds((prev: number[]) => prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]);
  };

  const handleCreateCampaign = async () => {
    try {
      if (!campaignName.trim()) return alert('Campaign name is required.');
      if (!groupId && selectedIds.length === 0) return alert('Select at least one contact to send the campaign.');
      const form = new FormData();
      form.append('name', campaignName.trim());
      form.append('message', message);
      form.append('delay_seconds', String(delay));
      form.append('selected_contact_ids', JSON.stringify(selectedIds));
      if (groupId) form.append('group_id', groupId);
      const mediaIds = await Promise.all(files.map(async (file) => {
        const mediaForm = new FormData();
        mediaForm.append('file', file);
        const { data } = await axios.post(`${API_URL}/media/upload`, mediaForm);
        return data.media.id;
      }));
      form.append('media_ids', JSON.stringify(mediaIds));
      const { data: campaign } = await axios.post(`${API_URL}/campaigns`, form);
      await axios.post(`${API_URL}/campaigns/${campaign.id}/send`);
      alert('Campaign created and sending started.');
      setCampaignName('');
      setSelectedIds([]);
      setFiles([]);
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Unable to create campaign');
    }
  };

  return <div className="space-y-6"><div className="grid gap-6 xl:grid-cols-[1fr_360px]"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="mb-5 text-2xl font-bold">Create campaign</h2><div className="space-y-4"><input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="Campaign name" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3" /><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={7} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3" /><select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3"><option value="">Choose a group</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select><label className="block text-sm text-slate-300">Delay between messages<input type="number" min={0} value={delay} onChange={(event) => setDelay(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3" /></label><input type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} className="w-full text-sm text-slate-400" /><button onClick={handleCreateCampaign} className="rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white">Create campaign</button></div></div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h3 className="mb-4 text-xl font-semibold">Selected contacts</h3><div className="space-y-3">{eligibleContacts.map((contact) => <label key={contact.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3"><span><span className="block font-medium">{contact.name}</span><span className="text-sm text-slate-400">{contact.mobile}</span></span><input type="checkbox" checked={selectedIds.includes(contact.id)} onChange={() => toggleContact(contact.id)} /></label>)}</div></div></div></div>;
}

function CampaignsPage({ campaigns, onRefresh }: { campaigns: Campaign[]; onRefresh: () => void }) {
  useEffect(() => {
    const timer = window.setInterval(onRefresh, 3000);
    return () => window.clearInterval(timer);
  }, [onRefresh]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-sm uppercase tracking-[0.2em] text-violet-300">Campaigns</p>
        <h2 className="mt-1 text-3xl font-bold">Campaign History</h2>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-lg font-semibold">{campaign.name}</div>
                <div className="text-sm text-slate-400">{new Date(campaign.created_at).toLocaleDateString()} • {campaign.total_recipients} recipients</div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="rounded-full bg-violet-600/15 px-2 py-1 text-violet-200">Sent: {campaign.sent_count}</span>
                <span className="rounded-full bg-amber-600/15 px-2 py-1 text-amber-200">Failed: {campaign.failed_count}</span>
                <span className="rounded-full bg-emerald-600/15 px-2 py-1 text-emerald-200">{campaign.status}</span>
              </div>
              <div className="w-full md:max-w-xs">
                <div className="mb-1 flex justify-between text-xs text-slate-400"><span>Progress</span><span>{campaign.sent_count + campaign.failed_count} / {campaign.total_recipients}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${campaign.total_recipients ? ((campaign.sent_count + campaign.failed_count) / campaign.total_recipients) * 100 : 0}%` }} /></div>
                <div className="mt-2 max-h-24 overflow-y-auto text-xs text-slate-400">{campaign.recipients?.map((recipient) => <div key={recipient.id} className="flex justify-between"><span>{recipient.name}</span><span className={recipient.status === 'SENT' ? 'text-emerald-400' : recipient.status === 'FAILED' ? 'text-red-400' : 'text-amber-400'}>{recipient.status}</span></div>)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WhatsAppPage({ whatsappStatus, onConnect, onDisconnect }: { whatsappStatus: { status: string; qr?: string | null; message?: string }; onConnect: () => void; onDisconnect: () => void; }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-sm uppercase tracking-[0.2em] text-violet-300">WhatsApp</p>
        <h2 className="mt-1 text-3xl font-bold">Connection</h2>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className={`inline-flex h-3 w-3 rounded-full ${whatsappStatus.status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            <span className="text-lg font-semibold">{whatsappStatus.status}</span>
          </div>
          {whatsappStatus.qr ? (
            <div className="flex justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-4">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(whatsappStatus.qr)}`} alt="WhatsApp QR" />
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-700 bg-slate-950 p-6 text-slate-300">{whatsappStatus.message || 'No QR available.'}</div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="mb-4 text-xl font-semibold">Actions</h3>
          <div className="space-y-3">
            <button onClick={onConnect} className="w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white">Connect WhatsApp</button>
            <button onClick={onDisconnect} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-semibold text-white">Disconnect</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupsPage({ contacts, groups, onSaved }: { contacts: Contact[]; groups: ContactGroup[]; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [maxMembers, setMaxMembers] = useState(60);
  const [selected, setSelected] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);
  const assignedIds = new Set(groups.flatMap((group) => group.contacts.map((contact) => contact.id)));
  const availableContacts = contacts.filter((contact) => !assignedIds.has(contact.id));
  const createGroup = async () => {
    try {
      if (!name.trim() || selected.length === 0) {
        alert('Enter a group name and select at least one contact.');
        return;
      }
      if (selected.length > maxMembers) {
        alert(`Select no more than ${maxMembers} contacts.`);
        return;
      }
      await axios.post(`${API_URL}/groups`, { name, max_members: maxMembers, contact_ids: selected });
      setName('');
        setMaxMembers(60);
      setSelected([]);
      setCreating(false);
      onSaved();
    } catch (error: any) { alert(error?.response?.data?.error || 'Unable to create group'); }
  };
  return <div className="space-y-6"><div className="flex items-center justify-between"><div><p className="text-sm uppercase tracking-[0.2em] text-violet-300">Groups</p><h2 className="mt-1 text-3xl font-bold">Contact groups</h2></div><button onClick={() => setCreating(true)} className="rounded-xl bg-violet-600 px-4 py-3 font-semibold">Create Group</button></div>{creating && <div className="rounded-2xl border border-violet-500/40 bg-slate-900 p-5"><div className="mb-5 flex items-center justify-between"><h3 className="text-xl font-semibold">Create a new group</h3><button onClick={() => { setCreating(false); setSelected([]); setName(''); }} className="text-sm text-slate-400">Cancel</button></div><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter group name" className="mb-5 w-full rounded-xl border border-slate-700 bg-slate-950 p-3" /><h3 className="mb-3 text-lg font-semibold">Add contacts</h3><p className="mb-4 text-sm text-slate-400">Contacts already assigned to another group are hidden and cannot be reused.</p><div className="grid gap-2 md:grid-cols-2">{availableContacts.map((contact) => <label key={contact.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3"><span><span className="block font-medium">{contact.name}</span><span className="text-sm text-slate-400">{contact.mobile}</span></span><input type="checkbox" checked={selected.includes(contact.id)} onChange={() => setSelected((current) => current.includes(contact.id) ? current.filter((id) => id !== contact.id) : [...current, contact.id])} /></label>)}</div><button onClick={createGroup} className="mt-5 rounded-xl bg-violet-600 px-5 py-3 font-semibold">Save Group ({selected.length} contacts)</button></div>}<div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h3 className="mb-4 text-xl font-semibold">Your groups</h3><div className="space-y-2">{groups.map((group) => <div key={group.id} className="rounded-xl border border-slate-800 p-3"><span className="font-medium">{group.name}</span><span className="ml-3 text-sm text-slate-400">{group.member_count} members</span></div>)}</div></div></div>;
}

function GroupManagerPageFixed({ contacts, groups, onSaved }: { contacts: Contact[]; groups: ContactGroup[]; onSaved: () => void }) {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [pendingContactIds, setPendingContactIds] = useState<number[]>([]);
  const createGroup = async () => {
    const name = window.prompt('Group name');
    if (!name?.trim()) return;
    try {
      await axios.post(`${API_URL}/groups`, { name: name.trim(), max_members: 60, contact_ids: [] });
      await onSaved();
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Unable to create group');
    }
  };
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) || null;
  const assignedToOtherGroups = new Set(groups.filter((group) => group.id !== selectedGroupId).flatMap((group) => group.contacts.map((contact) => contact.id)));
  const availableContacts = contacts.filter((contact) => !assignedToOtherGroups.has(contact.id) && !selectedGroup?.contacts.some((member) => member.id === contact.id));

  const selectGroup = (id: number) => {
    setSelectedGroupId(id);
    setPendingContactIds([]);
  };

  const updateGroup = async (group: ContactGroup, contactIds: number[], name = group.name, maxMembers = group.max_members) => {
    try {
      await axios.put(`${API_URL}/groups/${group.id}`, { name, max_members: maxMembers, contact_ids: contactIds });
      setPendingContactIds([]);
      await onSaved();
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Unable to update group');
    }
  };

  const addContacts = async () => {
    if (!selectedGroup || pendingContactIds.length === 0) return;
    await updateGroup(selectedGroup, [...selectedGroup.contacts.map((contact) => contact.id), ...pendingContactIds]);
  };

  const editGroup = async (group: ContactGroup) => {
    const name = window.prompt('Group name', group.name);
    if (name === null || !name.trim()) return;
    const limit = window.prompt('Maximum contacts', String(group.max_members));
    if (limit === null) return;
    await updateGroup(group, group.contacts.map((contact) => contact.id), name.trim(), Number(limit));
  };

  const removeContact = async (contact: Contact) => {
    if (!selectedGroup) return;
    await updateGroup(selectedGroup, selectedGroup.contacts.filter((member) => member.id !== contact.id).map((member) => member.id));
  };

  const deleteGroup = async (group: ContactGroup) => {
    if (!window.confirm(`Delete ${group.name}? Contacts will remain in your contact list.`)) return;
    try {
      await axios.delete(`${API_URL}/groups/${group.id}`);
      setSelectedGroupId(null);
      await onSaved();
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Unable to delete group');
    }
  };

  return <div className="space-y-6"><div><p className="text-sm uppercase tracking-[0.2em] text-violet-300">Groups</p><h2 className="mt-1 text-3xl font-bold">Contact groups</h2><p className="mt-2 text-slate-400">Select a group to view and manage its members.</p></div><div className="grid gap-6 xl:grid-cols-[360px_1fr]"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h3 className="mb-4 text-xl font-semibold">Your groups</h3><div className="space-y-2">{groups.map((group) => <button key={group.id} onClick={() => selectGroup(group.id)} className={`w-full rounded-xl border p-3 text-left transition ${selectedGroupId === group.id ? 'border-violet-500 bg-violet-600/20' : 'border-slate-800 bg-slate-950 hover:border-slate-600'}`}><div className="flex items-center justify-between"><span className="font-medium">{group.name}</span><span className="text-sm text-slate-400">{group.member_count}/{group.max_members}</span></div></button>)}</div>{groups.length === 0 && <p className="text-sm text-slate-400">No groups created yet.</p>}</div>{selectedGroup ? <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-2xl font-semibold">{selectedGroup.name}</h3><p className="mt-1 text-sm text-slate-400">{selectedGroup.member_count} of {selectedGroup.max_members} members</p></div><div className="flex gap-2"><button onClick={() => editGroup(selectedGroup)} className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"><Pencil size={15} /> Edit group</button><button onClick={() => deleteGroup(selectedGroup)} className="flex items-center gap-2 rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300 hover:bg-red-950"><Trash2 size={15} /> Delete group</button></div></div><div className="mt-6 space-y-2">{selectedGroup.contacts.map((contact) => <div key={contact.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3"><div><div className="font-medium">{contact.name}</div><div className="text-sm text-slate-400">{contact.mobile}</div></div><button title="Remove contact from group" onClick={() => removeContact(contact)} className="rounded-lg p-2 text-red-300 hover:bg-red-950"><Trash2 size={16} /></button></div>)}</div><div className="mt-6 border-t border-slate-800 pt-5"><h4 className="mb-3 font-semibold">Add contacts</h4><div className="grid gap-2 md:grid-cols-2">{availableContacts.map((contact) => <label key={contact.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3"><span><span className="block font-medium">{contact.name}</span><span className="text-sm text-slate-400">{contact.mobile}</span></span><input type="checkbox" disabled={selectedGroup.member_count + pendingContactIds.length >= selectedGroup.max_members && !pendingContactIds.includes(contact.id)} checked={pendingContactIds.includes(contact.id)} onChange={() => setPendingContactIds((current) => current.includes(contact.id) ? current.filter((id) => id !== contact.id) : [...current, contact.id])} /></label>)}</div><button onClick={addContacts} disabled={pendingContactIds.length === 0} className="mt-4 rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Add {pendingContactIds.length || ''} Contacts</button></div></div> : <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-slate-400">Click a group to see its member list.</div>}</div></div>;
}

function GroupManagerPage({ contacts, groups, onSaved }: { contacts: Contact[]; groups: ContactGroup[]; onSaved: () => void }) {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) || null;
  const assignedToOtherGroups = new Set(groups.filter((group) => group.id !== selectedGroupId).flatMap((group) => group.contacts.map((contact) => contact.id)));
  const availableContacts = contacts.filter((contact) => !assignedToOtherGroups.has(contact.id));

  const updateGroup = async (group: ContactGroup, changes: { name?: string; max_members?: number; contact_ids?: number[] }) => {
    try {
      await axios.put(`${API_URL}/groups/${group.id}`, {
        name: group.name,
        max_members: group.max_members,
        contact_ids: group.contacts.map((contact) => contact.id),
        ...changes,
      });
      await onSaved();
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Unable to update group');
    }
  };

  const editGroup = async (group: ContactGroup) => {
    const name = window.prompt('Group name', group.name);
    if (name === null || !name.trim()) return;
    const limit = window.prompt('Maximum contacts', String(group.max_members));
    if (limit === null) return;
    await updateGroup(group, { name: name.trim(), max_members: Number(limit) });
  };

  const deleteGroup = async (group: ContactGroup) => {
    if (!window.confirm(`Delete ${group.name}? Contacts will remain in your contact list.`)) return;
    try {
      await axios.delete(`${API_URL}/groups/${group.id}`);
      setSelectedGroupId(null);
      await onSaved();
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Unable to delete group');
    }
  };

  return <div className="space-y-6"><div><p className="text-sm uppercase tracking-[0.2em] text-violet-300">Groups</p><h2 className="mt-1 text-3xl font-bold">Contact groups</h2><p className="mt-2 text-slate-400">Select a group to view and manage its members.</p></div><div className="grid gap-6 xl:grid-cols-[360px_1fr]"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h3 className="mb-4 text-xl font-semibold">Your groups</h3><div className="space-y-2">{groups.map((group) => <button key={group.id} onClick={() => setSelectedGroupId(group.id)} className={`w-full rounded-xl border p-3 text-left transition ${selectedGroupId === group.id ? 'border-violet-500 bg-violet-600/20' : 'border-slate-800 bg-slate-950 hover:border-slate-600'}`}><div className="flex items-center justify-between"><span className="font-medium">{group.name}</span><span className="text-sm text-slate-400">{group.member_count}/{group.max_members}</span></div></button>)}</div>{groups.length === 0 && <p className="text-sm text-slate-400">No groups created yet.</p>}</div>{selectedGroup ? <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-2xl font-semibold">{selectedGroup.name}</h3><p className="mt-1 text-sm text-slate-400">{selectedGroup.member_count} of {selectedGroup.max_members} members</p></div><div className="flex gap-2"><button onClick={() => editGroup(selectedGroup)} className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"><Pencil size={15} /> Edit name/limit</button><button onClick={() => deleteGroup(selectedGroup)} className="flex items-center gap-2 rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300 hover:bg-red-950"><Trash2 size={15} /> Delete group</button></div></div><div className="mt-6 space-y-2">{selectedGroup.contacts.map((contact) => <div key={contact.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3"><div><div className="font-medium">{contact.name}</div><div className="text-sm text-slate-400">{contact.mobile}</div></div><button title="Remove contact from group" onClick={() => updateGroup(selectedGroup, { contact_ids: selectedGroup.contacts.filter((member) => member.id !== contact.id).map((member) => member.id) })} className="rounded-lg p-2 text-red-300 hover:bg-red-950"><Trash2 size={16} /></button></div>)}</div><div className="mt-6 border-t border-slate-800 pt-5"><h4 className="mb-3 font-semibold">Add contacts</h4><div className="grid gap-2 md:grid-cols-2">{availableContacts.filter((contact) => !selectedGroup.contacts.some((member) => member.id === contact.id)).map((contact) => <label key={contact.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3"><span><span className="block font-medium">{contact.name}</span><span className="text-sm text-slate-400">{contact.mobile}</span></span><input type="checkbox" disabled={selectedGroup.member_count >= selectedGroup.max_members} checked={selectedGroup.contacts.some((member) => member.id === contact.id)} onChange={() => { const ids = [...selectedGroup.contacts.map((member) => member.id), contact.id]; updateGroup(selectedGroup, { contact_ids: ids }); }} /></label>)}</div></div></div> : <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-slate-400">Click a group to see its member list.</div>}</div></div>;
}

function GroupWorkspacePage({ contacts, groups, onSaved }: { contacts: Contact[]; groups: ContactGroup[]; onSaved: () => void }) {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [pendingContactIds, setPendingContactIds] = useState<number[]>([]);
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) || null;
  const assignedToOtherGroups = new Set(groups.filter((group) => group.id !== selectedGroupId).flatMap((group) => group.contacts.map((contact) => contact.id)));
  const availableContacts = contacts.filter((contact) => !assignedToOtherGroups.has(contact.id) && !selectedGroup?.contacts.some((member) => member.id === contact.id));

  const createGroup = async () => {
    const name = window.prompt('Group name');
    if (!name?.trim()) return;
    try {
      const { data } = await axios.post(`${API_URL}/groups`, { name: name.trim(), max_members: 60, contact_ids: [] });
      setSelectedGroupId(data.id);
      await onSaved();
    } catch (error: any) { alert(error?.response?.data?.error || 'Unable to create group'); }
  };

  const updateGroup = async (group: ContactGroup, changes: { name?: string; max_members?: number; contact_ids?: number[] }) => {
    try {
      await axios.put(`${API_URL}/groups/${group.id}`, {
        name: group.name,
        max_members: group.max_members,
        contact_ids: group.contacts.map((contact) => contact.id),
        ...changes,
      });
      setPendingContactIds([]);
      await onSaved();
    } catch (error: any) { alert(error?.response?.data?.error || 'Unable to update group'); }
  };

  const editGroup = async (group: ContactGroup) => {
    const name = window.prompt('Group name', group.name);
    if (name === null || !name.trim()) return;
    const maxMembers = window.prompt('Maximum contacts', String(group.max_members));
    if (maxMembers === null) return;
    await updateGroup(group, { name: name.trim(), max_members: Number(maxMembers) });
  };

  const deleteGroup = async (group: ContactGroup) => {
    if (!window.confirm(`Delete ${group.name}? Contacts will remain in your contact list.`)) return;
    try {
      await axios.delete(`${API_URL}/groups/${group.id}`);
      setSelectedGroupId(null);
      await onSaved();
    } catch (error: any) { alert(error?.response?.data?.error || 'Unable to delete group'); }
  };

  const addContacts = async () => {
    if (!selectedGroup || pendingContactIds.length === 0) return;
    await updateGroup(selectedGroup, { contact_ids: [...selectedGroup.contacts.map((contact) => contact.id), ...pendingContactIds] });
  };

  const removeContact = async (contact: Contact) => {
    if (!selectedGroup) return;
    await updateGroup(selectedGroup, { contact_ids: selectedGroup.contacts.filter((member) => member.id !== contact.id).map((member) => member.id) });
  };

  return <div className="space-y-6"><div className="flex items-center justify-between"><div><p className="text-sm uppercase tracking-[0.2em] text-violet-300">Groups</p><h2 className="mt-1 text-3xl font-bold">Contact groups</h2><p className="mt-2 text-slate-400">Select a group to view and manage all members.</p></div><button onClick={createGroup} className="rounded-xl bg-violet-600 px-4 py-3 font-semibold">Create Group</button></div><div className="grid gap-6 xl:grid-cols-[360px_1fr]"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h3 className="mb-4 text-xl font-semibold">Your groups</h3><div className="space-y-2">{groups.map((group) => <button key={group.id} onClick={() => { setSelectedGroupId(group.id); setPendingContactIds([]); }} className={`w-full rounded-xl border p-3 text-left transition ${selectedGroupId === group.id ? 'border-violet-500 bg-violet-600/20' : 'border-slate-800 bg-slate-950 hover:border-slate-600'}`}><div className="flex items-center justify-between"><span className="font-medium">{group.name}</span><span className="text-sm text-slate-400">{group.member_count}/{group.max_members}</span></div></button>)}</div>{groups.length === 0 && <p className="text-sm text-slate-400">No groups created yet.</p>}</div>{selectedGroup ? <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-2xl font-semibold">{selectedGroup.name}</h3><p className="mt-1 text-sm text-slate-400">{selectedGroup.member_count} of {selectedGroup.max_members} members</p></div><div className="flex gap-2"><button onClick={() => editGroup(selectedGroup)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800">Edit group</button><button onClick={() => deleteGroup(selectedGroup)} className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300 hover:bg-red-950">Delete group</button></div></div><div className="mt-6 space-y-2">{selectedGroup.contacts.map((contact) => <div key={contact.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3"><div><div className="font-medium">{contact.name}</div><div className="text-sm text-slate-400">{contact.mobile}</div></div><button onClick={() => removeContact(contact)} className="text-sm text-red-300 hover:text-red-200">Remove</button></div>)}</div>{selectedGroup.contacts.length === 0 && <p className="mt-5 text-sm text-slate-400">No members in this group.</p>}<div className="mt-6 border-t border-slate-800 pt-5"><h4 className="mb-3 font-semibold">Add members</h4><div className="grid gap-2 md:grid-cols-2">{availableContacts.map((contact) => <label key={contact.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3"><span><span className="block font-medium">{contact.name}</span><span className="text-sm text-slate-400">{contact.mobile}</span></span><input type="checkbox" checked={pendingContactIds.includes(contact.id)} onChange={() => setPendingContactIds((current) => current.includes(contact.id) ? current.filter((id) => id !== contact.id) : [...current, contact.id])} /></label>)}</div><button onClick={addContacts} disabled={pendingContactIds.length === 0} className="mt-4 rounded-xl bg-violet-600 px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50">Add selected members</button></div></div> : <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-400">Select a group to view its members.</div>}</div></div>;
}

function MediaLibraryPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const loadFiles = async () => { const { data } = await axios.get(`${API_URL}/media/upload`); setFiles(data.items || []); };
  useEffect(() => { loadFiles().catch(() => alert('Unable to load media files')); }, []);
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { const form = new FormData(); form.append('file', file); await axios.post(`${API_URL}/media/upload`, form); await loadFiles(); event.target.value = ''; } catch (error: any) { alert(error?.response?.data?.error || 'Unable to upload file'); } finally { setUploading(false); }
  };
  const getFileUrl = (file: MediaFile) => file.url || `/media/${file.storage_path?.replaceAll('\\', '/')}`;
  const renderPreview = (file: MediaFile) => {
    const url = getFileUrl(file);
    if (file.file_type.match(/^(jpg|jpeg|png|webp)$/)) return <img src={url} alt={file.original_name || file.file_name} className="h-20 w-20 rounded-lg object-cover" />;
    if (file.file_type === 'mp4') return <video src={url} controls className="h-20 w-32 rounded-lg object-cover" />;
    if (file.file_type === 'pdf') return <iframe src={url} title={file.original_name || file.file_name} className="h-20 w-32 rounded-lg border-0" />;
    return <FileText className="text-slate-400" size={32} />;
  };
  return <div className="space-y-6"><div><p className="text-sm uppercase tracking-[0.2em] text-violet-300">Media</p><h2 className="mt-1 text-3xl font-bold">Media storage</h2></div><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-violet-500 bg-violet-600/10 p-5 text-violet-200 hover:bg-violet-600/20"><UploadCloud size={20} /><span>{uploading ? 'Uploading...' : 'Upload media file'}</span><input type="file" onChange={upload} className="hidden" /></label><div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h3 className="mb-4 text-xl font-semibold">Stored files</h3><div className="space-y-2">{files.map((file) => { const url = getFileUrl(file); return <div key={file.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950 p-3"><div className="flex min-w-0 items-center gap-3">{renderPreview(file)}<div className="min-w-0"><div className="truncate font-medium">{file.original_name || file.file_name}</div><div className="text-sm text-slate-400">{file.file_type} · {Math.round(file.file_size / 1024)} KB</div></div></div><div className="flex items-center gap-2"><a href={url} target="_blank" rel="noreferrer" title="View file" className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"><ExternalLink size={17} /></a><a href={file.download_url || url} download={file.original_name || file.file_name} title="Download file" className="rounded-lg bg-violet-600 p-2 text-white hover:bg-violet-500"><Download size={17} /></a></div></div>; })}</div>{files.length === 0 && <p className="text-sm text-slate-400">No files uploaded yet.</p>}</div></div>;
}

function ReportsDashboardPage() {
  const [report, setReport] = useState<any[]>([]);
  useEffect(() => { axios.get(`${API_URL}/reports`).then(({ data }) => setReport(data.campaigns || [])).catch(() => alert('Unable to load reports')); }, []);
  return <div className="space-y-6"><div><p className="text-sm uppercase tracking-[0.2em] text-violet-300">Reports</p><h2 className="mt-1 text-3xl font-bold">Campaign reports</h2></div><div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 p-5"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-slate-700 text-slate-400"><tr><th className="p-3">Campaign</th><th className="p-3">Status</th><th className="p-3">Total</th><th className="p-3">Sent</th><th className="p-3">Failed</th><th className="p-3">Success rate</th></tr></thead><tbody>{report.map((item) => <tr key={item.id} className="border-b border-slate-800"><td className="p-3 font-medium">{item.name}</td><td className="p-3">{item.status}</td><td className="p-3">{item.total}</td><td className="p-3 text-emerald-300">{item.sent}</td><td className="p-3 text-red-300">{item.failed}</td><td className="p-3">{item.success_rate}%</td></tr>)}</tbody></table>{report.length === 0 && <p className="p-3 text-slate-400">No campaign reports yet.</p>}</div></div>;
}

function SettingsPage({ settings, onSaved }: { settings: AppSettings; onSaved: () => void }) {
  const [form, setForm] = useState(settings);
  useEffect(() => setForm(settings), [settings]);
  const save = async () => { await axios.put(`${API_URL}/settings`, form); onSaved(); alert('Settings saved'); };
  return <div className="space-y-6"><div><p className="text-sm uppercase tracking-[0.2em] text-violet-300">Settings</p><h2 className="mt-1 text-3xl font-bold">Workspace settings</h2></div><div className="max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="space-y-4"><label className="block text-sm">WhatsApp number used for login<input value={form.connected_phone} onChange={(e) => setForm({ ...form, connected_phone: e.target.value })} placeholder="919876543210" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3" /></label><label className="block text-sm">Default gap between messages (seconds)<input type="number" min={0} value={form.default_delay_seconds} onChange={(e) => setForm({ ...form, default_delay_seconds: Number(e.target.value) })} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3" /></label><button onClick={save} className="rounded-xl bg-violet-600 px-4 py-3 font-semibold">Save settings</button></div></div></div>;
}

function MediaPage() {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-3xl font-bold">Media</h2><p className="mt-3 text-slate-400">Upload and review files for campaigns.</p></div>;
}

function ReportsPage() {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-3xl font-bold">Reports</h2><p className="mt-3 text-slate-400">See campaign analytics and outcomes.</p></div>;
}

export default App;
