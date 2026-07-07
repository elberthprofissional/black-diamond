import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, X } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

const InstallAnswer = () => (
  <div className="grid grid-cols-2 gap-3">
    <div className="bg-white/[0.03] rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
        <span className="text-[11px] font-semibold text-white">iPhone</span>
      </div>
      <ol className="text-[11px] text-zinc-400 space-y-1.5 list-decimal list-inside leading-relaxed">
        <li>
          Abra o site pelo <strong className="text-zinc-300">Safari</strong>
        </li>
        <li>Toque no ícone de compartilhar</li>
        <li>Selecione "Adicionar à Tela de Início"</li>
      </ol>
    </div>
    <div className="bg-white/[0.03] rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#3DDC84">
          <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
        </svg>
        <span className="text-[11px] font-semibold text-white">Android</span>
      </div>
      <ol className="text-[11px] text-zinc-400 space-y-1.5 list-decimal list-inside leading-relaxed">
        <li>
          Abra o site pelo <strong className="text-zinc-300">Chrome</strong>
        </li>
        <li>Toque nos três pontinhos</li>
        <li>Selecione "Instalar aplicativo"</li>
      </ol>
    </div>
  </div>
);

const faqItems: FAQItem[] = [
  {
    question: 'Como instalar o aplicativo?',
    answer: <InstallAnswer />,
  },
  {
    question: 'Como cadastrar um cliente?',
    answer:
      'Vá na aba "Clientes" e clique em "Novo Cliente". Preencha o nome, telefone e e-mail (opcional). O cliente será salvo e poderá ser selecionado ao criar agendamentos.',
  },
  {
    question: 'Como adicionar fotos na galeria?',
    answer:
      'Vá em Configurações > Galeria e clique em "Adicionar". Selecione as fotos do seu celular ou computador. As fotos aparecerão automaticamente na página inicial para os clientes.',
  },
  {
    question: 'Como configurar os horários de atendimento?',
    answer:
      'Vá em Configurações > Horários. Ative ou desative os dias com o toggle. Defina o horário de abertura e fechamento de cada dia. Use "Aplicar para todos" pra copiar o mesmo horário pra vários dias de uma vez.',
  },
  {
    question: 'Como cadastrar serviços?',
    answer:
      'Vá em Configurações > Serviços. Clique em "Adicionar" e preencha o nome, preço e duração do serviço. Você pode reordenar, editar ou remover serviços a qualquer momento.',
  },
  {
    question: 'Como funcionam as notificações?',
    answer:
      'As notificações te avisam quando um cliente agenda um horário. Ative em Configurações > Notificações. No iPhone, é necessário instalar o aplicativo primeiro. No Android, funciona direto pelo Chrome.',
  },
];

export default function HelpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="relative z-10 w-full sm:max-w-[420px] max-h-[80vh] bg-[#1C1C1E] sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2.5">
                <HelpCircle size={18} className="text-[#C5A059]" />
                <span className="text-[15px] font-semibold text-white">Ajuda</span>
              </div>
              <button
                onClick={onClose}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* FAQ List */}
            <div className="overflow-y-auto flex-1 p-4 space-y-1">
              {faqItems.map((item, i) => (
                <div key={i} className="border-b border-white/[0.04] last:border-b-0">
                  <button
                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                    className="w-full flex items-center justify-between py-3.5 text-left cursor-pointer group"
                  >
                    <span className="text-[13px] font-medium text-zinc-300 group-hover:text-white transition-colors pr-4">
                      {item.question}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-zinc-500 shrink-0 transition-transform duration-200 ${
                        openIndex === i ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {openIndex === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pb-3.5">
                          {typeof item.answer === 'string' ? (
                            <p className="text-[12px] text-zinc-500 leading-relaxed">
                              {item.answer}
                            </p>
                          ) : (
                            item.answer
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center pb-3 pt-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/10" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
