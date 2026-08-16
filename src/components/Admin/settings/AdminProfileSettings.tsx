import { lazy, Suspense, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  ArrowLeft,
  Shield,
  Clock,
  Image as ImageIcon,
  UserX,
  Gift,
  Tag,
  Bell,
  Scissors,
  Crown,
  Users,
} from 'lucide-react';
import SettingsList from './SettingsList';
import { useBarberContext } from '../../../contexts/BarberContext';

const SettingsConta = lazy(() => import('./SettingsConta'));
const SettingsGaleria = lazy(() => import('./SettingsGaleria'));
const SettingsNotificacoes = lazy(() => import('./SettingsNotificacoes'));
const SettingsDados = lazy(() => import('./SettingsDados'));
const SettingsServicos = lazy(() => import('./SettingsServicos'));
const SettingsHorarios = lazy(() => import('./SettingsHorarios'));
const SettingsBarbeiros = lazy(() => import('./SettingsBarbeiros'));
const SettingsFaltas = lazy(() => import('./SettingsFaltas'));
const SettingsFidelidade = lazy(() => import('./SettingsFidelidade'));
const SettingsCupons = lazy(() => import('./SettingsCupons'));
const SettingsMensalista = lazy(() => import('./SettingsMensalista'));

const sectionTitle = (section: string | null) => {
  const titles: Record<string, string> = {
    conta: 'Conta',
    galeria: 'Galeria',
    servicos: 'Serviços',
    horarios: 'Horários',
    barbeiros: 'Barbeiros',
    faltas: 'Controle de Faltas',
    fidelidade: 'Fidelidade',
    cupons: 'Cupons',
    mensalista: 'Mensalista',
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
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'dados', label: 'Segurança', icon: Shield },
];

interface Props {
  settingsSection: string | null;
  setSettingsSection: (s: string | null) => void;
}

const Fallback = () => <div className="skeleton-pulse h-32" />;

/** Seções de negócio — apenas o dono gerencia. Barbeiros comuns ficam com Conta e Notificações. */
const OWNER_ONLY_IDS = new Set([
  'galeria',
  'servicos',
  'horarios',
  'barbeiros',
  'faltas',
  'fidelidade',
  'cupons',
  'mensalista',
  'dados',
]);

const AdminProfileSettings: FC<Props> = ({ settingsSection, setSettingsSection }) => {
  const { isOwner } = useBarberContext();
  // Telas de negócio só para o dono — barbeiros comuns não veem nem acessam.
  const navItems = isOwner ? NAV_ITEMS : NAV_ITEMS.filter((item) => !OWNER_ONLY_IDS.has(item.id)); // Guard: barbeiro comum não pode abrir seção de dono por URL/estado residual
  const effectiveSection =
    settingsSection && !isOwner && OWNER_ONLY_IDS.has(settingsSection) ? 'conta' : settingsSection;

  return (
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
            {sectionTitle(effectiveSection)}
          </h1>
        </div>
      </div>

      {/* Mobile: list or section */}
      <div className="lg:hidden">
        {settingsSection === null && (
          <SettingsList onSelect={setSettingsSection} isOwner={isOwner} />
        )}
        <Suspense fallback={<Fallback />}>
          {effectiveSection === 'conta' && <SettingsConta />}
          {effectiveSection === 'galeria' && <SettingsGaleria />}
          {effectiveSection === 'servicos' && <SettingsServicos />}
          {effectiveSection === 'horarios' && <SettingsHorarios />}
          {effectiveSection === 'barbeiros' && <SettingsBarbeiros />}
          {effectiveSection === 'faltas' && <SettingsFaltas />}
          {effectiveSection === 'fidelidade' && <SettingsFidelidade />}
          {effectiveSection === 'cupons' && <SettingsCupons />}
          {effectiveSection === 'mensalista' && <SettingsMensalista />}
          {effectiveSection === 'notificacoes' && <SettingsNotificacoes />}
          {effectiveSection === 'dados' && <SettingsDados />}
        </Suspense>
      </div>

      {/* Desktop: sidebar + content */}
      <div className="hidden lg:flex gap-8 items-start">
        <div className="w-[200px] shrink-0 sticky top-6 self-start">
          <div className="space-y-2">
            <h2 className="label-gold px-3 mb-4">Configurações</h2>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = (effectiveSection || 'conta') === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSettingsSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] transition-all cursor-pointer ${active ? 'bg-white/5 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'}`}
                >
                  <Icon size={15} className={active ? 'text-gold' : 'text-zinc-500'} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 min-w-0 min-h-[600px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={effectiveSection || 'conta'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              <Suspense fallback={<Fallback />}>
                {(!effectiveSection || effectiveSection === 'conta') && <SettingsConta />}
                {effectiveSection === 'galeria' && <SettingsGaleria />}
                {effectiveSection === 'servicos' && <SettingsServicos />}
                {effectiveSection === 'horarios' && <SettingsHorarios />}
                {effectiveSection === 'barbeiros' && <SettingsBarbeiros />}
                {effectiveSection === 'faltas' && <SettingsFaltas />}
                {effectiveSection === 'fidelidade' && <SettingsFidelidade />}
                {effectiveSection === 'cupons' && <SettingsCupons />}
                {effectiveSection === 'mensalista' && <SettingsMensalista />}
                {effectiveSection === 'notificacoes' && <SettingsNotificacoes />}
                {effectiveSection === 'dados' && <SettingsDados />}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default AdminProfileSettings;
