import { useState, useCallback, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronDown, Trash2, X } from 'lucide-react';
import type { WhatsAppTemplate } from '../../../lib/api';

interface ReminderModalProps {
  isOpen: boolean;
  clientName: string;
  templates: WhatsAppTemplate[];
  onDeleteTemplate: (id: string) => void;
  onSaveTemplate: (text: string) => void;
  onSendTemplate: (text: string) => void;
  onClose: () => void;
}

const ReminderModal: FC<ReminderModalProps> = ({
  isOpen,
  clientName,
  templates,
  onDeleteTemplate,
  onSaveTemplate,
  onSendTemplate,
  onClose,
}) => {
  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [customText, setCustomText] = useState('');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const handleClose = useCallback(() => {
    setMode('list');
    setCustomText('');
    setExpandedIdx(null);
    onClose();
  }, [onClose]);

  const handleSave = () => {
    if (!customText.trim()) return;
    onSaveTemplate(customText.trim());
    // Não limpa o texto nem volta pra lista — o usuário pode clicar "Enviar no WhatsApp" logo em seguida
  };

  const handleSend = (text: string) => {
    onSendTemplate(text);
    handleClose();
  };

  const handleSendCustom = () => {
    if (!customText.trim()) return;
    handleSend(customText.trim());
    setCustomText('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center sm:items-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full sm:w-[480px] sm:max-h-[80vh] h-[100dvh] sm:h-auto sm:rounded-2xl mt-auto sm:mt-0 bg-[#0E0E0E] border-t sm:border border-[#D4AF37]/20 shadow-2xl overflow-y-auto scrollbar-hide flex flex-col text-white"
          >
            <div className="sticky top-0 bg-[#0E0E0E]/95 backdrop-blur-md z-10 px-6 py-5 flex items-center justify-between border-b border-white/[0.04] shrink-0">
              <div className="flex items-center gap-3">
                {mode === 'create' && (
                  <button
                    onClick={() => setMode('list')}
                    aria-label="Voltar para lista de modelos"
                    className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}
                <div className="text-left">
                  <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-[0.25em] block">
                    {mode === 'create' ? 'Mensagem Personalizada' : 'Enviar Lembrete'}
                  </span>
                  <p className="text-sm font-semibold text-zinc-100 mt-1">{clientName}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                aria-label="Fechar lembrete"
                className="text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 bg-[#0E0E0E]">
              <div className="w-full space-y-6 text-left">
                {mode === 'list' ? (
                  <>
                    <div className="space-y-2 sm:space-y-3">
                      {templates.map((template, index) => {
                        const isExpanded = expandedIdx === index;
                        return (
                          <div
                            key={template.id}
                            onClick={() => setExpandedIdx(isExpanded ? null : index)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setExpandedIdx(isExpanded ? null : index);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            aria-expanded={isExpanded}
                            aria-label={`Modelo ${index + 1}`}
                            className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50 ${
                              isExpanded
                                ? 'bg-white/[0.04] border-white/20 shadow-lg'
                                : 'bg-white/[0.01] border-white/[0.04] hover:border-white/10 hover:bg-white/[0.02]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                {template.name || `Modelo #${index + 1}`}
                              </span>
                              <ChevronDown
                                size={14}
                                className={`text-zinc-500 transition-transform sm:w-4 sm:h-4 ${isExpanded ? 'rotate-180 text-white' : ''}`}
                              />
                            </div>

                            <p
                              className={`text-[11px] sm:text-xs text-zinc-400 leading-normal sm:leading-relaxed mt-2 sm:mt-3 whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-2'}`}
                            >
                              {template.body}
                            </p>

                            {isExpanded && (
                              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/[0.04] flex items-center justify-between">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteTemplate(template.id);
                                    if (expandedIdx === index) setExpandedIdx(null);
                                  }}
                                  className="text-zinc-500 hover:text-red-400 text-[9px] sm:text-xs font-bold uppercase flex items-center gap-1 sm:gap-1.5 cursor-pointer transition-colors"
                                >
                                  <Trash2 size={11} className="sm:w-3.5 sm:h-3.5" />
                                  <span>Excluir</span>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSend(template.body);
                                  }}
                                  className="px-3.5 py-1.5 sm:px-5 sm:py-2.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.04] text-white font-bold text-[9px] sm:text-[10px] uppercase tracking-wider sm:tracking-widest rounded-lg sm:rounded-xl flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all active:scale-95"
                                >
                                  <svg
                                    className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                  </svg>
                                  <span>Enviar</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => {
                        setCustomText('');
                        setMode('create');
                      }}
                      className="w-full py-4 border border-[#D4AF37]/20 hover:border-[#D4AF37]/40 bg-[#D4AF37]/[0.02] text-[#D4AF37] font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-[#D4AF37]/[0.05] active:scale-[0.98] transition-all cursor-pointer text-center"
                    >
                      + Criar Lembrete
                    </button>
                  </>
                ) : (
                  <>
                    <div className="space-y-3 text-left">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                        Mensagem Personalizada
                      </span>
                      <textarea
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        placeholder="Escreva a mensagem de lembrete..."
                        aria-label="Mensagem personalizada de lembrete"
                        className="w-full bg-black/40 border border-white/[0.06] rounded-2xl px-5 py-4 text-sm text-zinc-200 outline-none focus:border-[#D4AF37]/30 resize-none h-48 placeholder:text-zinc-700 leading-relaxed focus:bg-white/[0.01] transition-all"
                      />
                      <button
                        onClick={() => {
                          const link = window.location.origin + '/agendar';
                          setCustomText((prev) => (prev ? `${prev}\n\n${link}` : link));
                        }}
                        className="w-full py-2.5 border border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.04] text-zinc-400 hover:text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        Inserir link do site
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        onClick={handleSave}
                        disabled={
                          !customText.trim() || templates.some((t) => t.body === customText.trim())
                        }
                        className="w-full sm:flex-1 py-3 bg-white/[0.01] hover:bg-white/[0.04] border border-white/[0.08] text-zinc-400 disabled:opacity-20 hover:text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center active:scale-[0.98]"
                      >
                        Salvar nos Modelos
                      </button>
                      <button
                        onClick={handleSendCustom}
                        disabled={!customText.trim()}
                        className="w-full sm:flex-1 py-3 bg-[#D4AF37] disabled:opacity-30 hover:bg-[#b8962e] text-black font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 active:scale-[0.98]"
                      >
                        <svg
                          className="w-3.5 h-3.5 shrink-0"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        <span>Enviar no WhatsApp</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ReminderModal;
