import { useEffect, useState } from "react";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Loading } from "../../components/ui/Loading";
import { PhotoPicker } from "../../components/PhotoPicker";
import { HoursEditor, normalizeHours } from "../../components/HoursEditor";
import type { HourRow } from "../../components/HoursEditor";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  listBarberHours,
  listMembers,
  replaceBarberHours,
  toErrorMessage,
  updateMember,
} from "../../services/api";
import type { Member } from "../../types";

export function ProfilePage() {
  const { activeMembership } = useAuth();
  const shopId = activeMembership?.barbershop_id ?? "";
  const memberId = activeMembership?.member_id ?? "";
  const { showToast } = useToast();

  const { data, loading, error, reload } = useAsyncData(async () => {
    const members = await listMembers(shopId);
    const me = members.find((m) => m.id === memberId) ?? null;
    const hours = me ? await listBarberHours(me.id) : [];
    return { me, hours };
  }, [shopId, memberId]);

  const [form, setForm] = useState({ avatar_url: "", bio: "" });
  const [hours, setHours] = useState<HourRow[] | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [hoursBusy, setHoursBusy] = useState(false);

  useEffect(() => {
    if (!data?.me) return;
    setForm({
      avatar_url: data.me.avatar_url ?? "",
      bio: data.me.bio ?? "",
    });
    setHours(normalizeHours(data.hours));
  }, [data]);

  if (loading) return <Loading label="Carregando perfil..." />;
  if (error) {
    return (
      <EmptyState
        icon="!"
        title="Erro ao carregar"
        description={error}
        action={<button onClick={reload} className="btn btn--ghost">Tentar de novo</button>}
      />
    );
  }
  if (!data?.me) {
    return <EmptyState icon="👤" title="Perfil não encontrado" description="Verifique o vínculo da sua conta com a barbearia." />;
  }

  const me: Member = data.me;

  const saveProfile = async () => {
    setSaveBusy(true);
    try {
      await updateMember(me.id, {
        avatar_url: form.avatar_url.trim() || null,
        bio: form.bio.trim() || null,
      });
      showToast("Perfil atualizado.", "success");
      reload();
    } catch (e) {
      showToast(toErrorMessage(e), "error");
    } finally {
      setSaveBusy(false);
    }
  };

  const saveHours = async () => {
    if (!hours) return;
    setHoursBusy(true);
    try {
      await replaceBarberHours(me.id, shopId, hours);
      showToast("Disponibilidade salva.", "success");
      reload();
    } catch (e) {
      showToast(toErrorMessage(e), "error");
    } finally {
      setHoursBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-heading">
        <h2>Meu perfil</h2>
        <p className="text-muted">
          Sua foto, descrição e disponibilidade aparecem na página pública da barbearia.
        </p>
      </div>

      <div className="profile-card">
        <Avatar name={me.full_name} src={me.avatar_url} size="lg" />
        <div>
          <h3>{me.full_name}</h3>
          <span className="badge badge--ghost">{me.role === "owner" ? "Dono" : "Barbeiro"}</span>
        </div>
      </div>

      <div className="settings-grid">
        <section className="card">
          <div className="card__head">
            <h3>Dados exibidos</h3>
          </div>
          <div className="form-stack">
            <PhotoPicker
              name="pf-avatar"
              value={form.avatar_url || null}
              onChange={(url) => setForm({ ...form, avatar_url: url })}
            />
            <Input label="Sobre mim" name="pf-bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Uma breve apresentação para os clientes" />
            <Button onClick={saveProfile} loading={saveBusy}>
              Salvar perfil
            </Button>
          </div>
        </section>

        <section className="card">
          <div className="card__head">
            <h3>Minha disponibilidade</h3>
            <span className="muted">Onde não marcar {me.full_name.split(" ")[0]}?</span>
          </div>
          {hours ? (
            <>
              <HoursEditor rows={hours} onChange={setHours} />
              <div style={{ marginTop: 16 }}>
                <Button onClick={saveHours} loading={hoursBusy}>
                  Salvar disponibilidade
                </Button>
              </div>
            </>
          ) : (
            <Loading label="Carregando horários..." />
          )}
        </section>
      </div>
    </div>
  );
}