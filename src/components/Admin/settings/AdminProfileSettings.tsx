import { lazy, Suspense, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  ArrowLeft,
  Shield,
  Clock,
  Image as ImageIcon,
  HelpCircle,
  UserX,
  Gift,
  Tag,
  Bell,
  Scissors,
  Users,
  Crown,
  CreditCard,
} from 'lucide-react';
import SettingsList from './SettingsList';

const SettingsConta = lazy(() => import('./SettingsConta'));
const SettingsGaleria = lazy(() => import('./SettingsGaleria'));
const SettingsNotificacoes = lazy(() => import('./SettingsNotificacoes'));
const SettingsDados = lazy(() => import('./SettingsDados'));
const SettingsServicos = lazy(() => import('./SettingsServicos'));
const SettingsHorarios = lazy(() => import('./SettingsHorarios'));
const SettingsFaltas = lazy(() => import('./SettingsFaltas'));
const SettingsFidelidade = lazy(() => import('./SettingsFidelidade'));
const SettingsCupons = lazy(() => import('./SettingsCupons'));
const SettingsBarbeiros = lazy(() => import('./SettingsBarbeiros'));
const SettingsMensalista = lazy(() => import('./SettingsMensalista'));
const SettingsAssinaturas = lazy(() => import('./SettingsAssinaturas'));

const sectionTitle = (section: string | null) => {
  const titles: Record<string, string> = {
    conta: 'Conta',
    galeria: 'Galeria',
    servicos: 'Serviços',
    horarios: 'Horários',
    faltas: 'Controle de Faltas',
    barbeiros: 'Barbeiros',
    fidelidade: 'Fidelidade',
    cupons: 'Cupons',
    mensalista: 'Mensalista',
    assinaturas: 'Assinaturas',
    notificacoes: 'Notificações',
    dados: 'Zona de Segurança',
  };
  return titles[section || ''] || 'Configurações';
};

const NAV_ITEMS = [
  { id: 'conta', label: 'Conta', icon: User },
  { id: 'galeria', label: 'Galeria', icon: ImageIcon },
  { id: 'servicos', label: 'Serviços', icon: Scissors },
  { id: 'horarios', label: 'Horários', icon: Clock },
  { id: 'barbeiros', label: 'Barbeiros', icon: Users },
  { id: 'faltas', label: 'Controle de Faltas', icon: UserX },
  { id: 'fidelidade', label: 'Fidelidade', icon: Gift },
  { id: 'cupons', label: 'Cupons', icon: Tag },
  { id: 'mensalista', label: 'Mensalista', icon: Crown },
  { id: 'assinaturas', label: 'Assinaturas', icon: CreditCard },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'dados', label: 'Segurança', icon: Shield },
];

interface Props {
  settingsSection: string | null;
  setSettingsSection: (s: string | null) => void;
  setShowHelp: (s: boolean) => void;
}

const Fallback = () => <div className="skeleton-pulse h-32" />;

const AdminProfileSettings: FC<Props> = ({ settingsSection, setSettingsSection, setShowHelp }) => (
  <>
    {/* Mobile header */}
    <div className="lg:hidden flex items-center gap-3 px-4 -mt-1 mb-4">
      <button
        onClick={() => {
          if (settingsSection) setSettingsSection(null);
          else setSettingsSection('__back');
        }}
        className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        aria-label="Voltar"
      >
        <ArrowLeft size={20} />
      </button>
      <div className="flex-1">
        <h1 className="text-lg font-bold tracking-tight text-white">
          {sectionTitle(settingsSection)}
        </h1>
      </div>
      <button
        onClick={() => setShowHelp(true)}
        className="text-zinc-500 hover:text-[#D4AF37] transition-colors cursor-pointer"
        aria-label="Ajuda"
      >
        <HelpCircle size={20} />
      </button>
    </div>

    {/* Mobile: list or section */}
    <div className="lg:hidden">
      {settingsSection === null && <SettingsList onSelect={setSettingsSection} />}
      <Suspense fallback={<Fallback />}>
        {settingsSection === 'conta' && <SettingsConta />}
        {settingsSection === 'galeria' && <SettingsGaleria />}
        {settingsSection === 'servicos' && <SettingsServicos />}
        {settingsSection === 'horarios' && <SettingsHorarios />}
        {settingsSection === 'barbeiros' && <SettingsBarbeiros />}
        {settingsSection === 'faltas' && <SettingsFaltas />}
        {settingsSection === 'fidelidade' && <SettingsFidelidade />}
        {settingsSection === 'cupons' && <SettingsCupons />}
        {settingsSection === 'mensalista' && <SettingsMensalista />}
        {settingsSection === 'assinaturas' && <SettingsAssinaturas />}
        {settingsSection === 'notificacoes' && <SettingsNotificacoes />}
        {settingsSection === 'dados' && <SettingsDados />}
      </Suspense>
    </div>

    {/* Desktop: sidebar + content */}
    <div className="hidden lg:flex gap-8 items-start">
      <div className="w-[200px] shrink-0 sticky top-6 self-start">
        <div className="space-y-2">
          <h2 className="label-gold px-3 mb-4">Configurações</h2>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = (settingsSection || 'conta') === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSettingsSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] transition-all cursor-pointer ${active ? 'bg-white/5 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'}`}
              >
                <Icon size={15} className={active ? 'text-[#D4AF37]' : 'text-zinc-500'} />
                {item.label}
              </button>
            );
          })}
          <button
            onClick={() => setShowHelp(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] transition-all cursor-pointer mt-4"
          >
            <HelpCircle size={15} />
            Ajuda
          </button>
        </div>
      </div>
      <div className="flex-1 min-w-0 min-h-[600px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={settingsSection || 'conta'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <Suspense fallback={<Fallback />}>
              {(!settingsSection || settingsSection === 'conta') && <SettingsConta />}
              {settingsSection === 'galeria' && <SettingsGaleria />}
              {settingsSection === 'servicos' && <SettingsServicos />}
              {settingsSection === 'horarios' && <SettingsHorarios />}
              {settingsSection === 'barbeiros' && <SettingsBarbeiros />}
              {settingsSection === 'faltas' && <SettingsFaltas />}
              {settingsSection === 'fidelidade' && <SettingsFidelidade />}
              {settingsSection === 'cupons' && <SettingsCupons />}
              {settingsSection === 'mensalista' && <SettingsMensalista />}
              {settingsSection === 'assinaturas' && <SettingsAssinaturas />}
              {settingsSection === 'notificacoes' && <SettingsNotificacoes />}
              {settingsSection === 'dados' && <SettingsDados />}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  </>
);

export default AdminProfileSettings;
