import { type FC } from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound: FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <h1 className="text-6xl font-black text-white tracking-tighter">404</h1>
        <p className="text-[12px] text-zinc-500 mt-4 mb-8">Página não encontrada</p>
        <button onClick={() => navigate('/')} className="btn-gold px-8 py-3 text-[10px]">
          Voltar ao início
        </button>
      </div>
    </div>
  );
};

export default NotFound;
