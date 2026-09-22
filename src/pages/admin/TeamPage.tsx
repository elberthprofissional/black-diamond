import { Users } from "lucide-react";
import { useState } from "react";
import { Avatar } from "../../components/ui/Avatar";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loading } from "../../components/ui/Loading";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { PhotoPicker } from "../../components/PhotoPicker";
import { HoursEditor, normalizeHours } from "../../components/HoursEditor";
import type { HourRow } from "../../components/HoursEditor";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  inviteMember,
  listBarberHours,
  listMembers,
  replaceBarberHours,
  toErrorMessage,
  updateMember,
} from "../../services/api";
import { isValidEmail, isValidName } from "../../utils/validation";
import type { Member } from "../../types";

export function TeamPage() {
  const { activeMembership } = useAuth();
  const shopId = activeMembership?.barbershop_id ?? "";
  const { showToast } = useToast();

  const { data: members, loading, error, reload } = useAsyncData(
    () => listMembers(shopId),
    [shopId]
  );

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({
    name: "",
    email: "",
    role: "barber" as "owner" | "barber",
    password: "",
    bio: "",
  });
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);

  const [editMember, setEditMember] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", bio: "", avatar_url: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  const [hoursMember, setHoursMember] = useState<Member | null>(null);
  const [hoursRows, setHoursRows] = useState<HourRow[] | null>(null);
  const [hoursBusy, setHoursBusy] = useState(false);

  const [deactivate, setDeactivate] = useState<Member | null>(null);
  const [deactivateBusy, setDeactivateBusy] = useState(false);

  const openEdit = (m: Member) => {
    setEditMember(m);
    setEditForm({
      full_name: m.full_name,
      bio: m.bio ?? "",
      avatar_url: m.avatar_url ?? "",
    });
    setEditError(null);
  };

  const openHours = async (m: Member) => {
    setHoursMember(m);
    setHoursRows(null);
    try {
      const rows = await listBarberHours(m.id);
      setHoursRows(normalizeHours(rows));
    } catch (e) {
      showToast(toErrorMessage(e), "error");
      setHoursMember(null);
    }
  };

  const doInvite = async () => {
    const errs: string[] = [];
    if (!isValidName(invite.name)) errs.push("Informe o nome.");
    if (!isValidEmail(invite.email)) errs.push("Email inválido.");
    if (invite.password.length < 6) errs.push("Senha temporária com ao menos 6 caracteres.");
    if (errs.length) {
      setInviteError(errs.join(" "));
      return;
    }

    setInviteBusy(true);
    setInviteError(null);
    try {
      await inviteMember({
        shopId,
        name: invite.name.trim(),
        email: invite.email.trim(),
        role: invite.role,
        tempPassword: invite.password,
        bio: invite.bio.trim() || null,
      });
      showToast(`${invite.name} adicionado à equipe.`, "success");
      setInviteOpen(false);
      setInvite({ name: "", email: "", role: "barber", password: "", bio: "" });
      reload();
    } catch (e) {
      setInviteError(toErrorMessage(e));
    } finally {
      setInviteBusy(false);
    }
  };

  const doEdit = async () => {
    if (!editMember) return;
    if (!isValidName(editForm.full_name)) {
      setEditError("Informe o nome.");
      return;
    }
    setEditBusy(true);
    setEditError(null);
    try {
      await updateMember(editMember.id, {
        full_name: editForm.full_name.trim(),
        bio: editForm.bio.trim() || null,
        avatar_url: editForm.avatar_url.trim() || null,
      });
      showToast("Perfil atualizado.", "success");
      setEditMember(null);
      reload();
    } catch (e) {
      setEditError(toErrorMessage(e));
    } finally {
      setEditBusy(false);
    }
  };

  const doSaveHours = async () => {
    if (!hoursMember || !hoursRows) return;
    setHoursBusy(true);
    try {
      await replaceBarberHours(hoursMember.id, shopId, hoursRows);
      showToast("Horários salvos.", "success");
      setHoursMember(null);
      reload();
    } catch (e) {
      showToast(toErrorMessage(e), "error");
    } finally {
      setHoursBusy(false);
    }
  };

  const doDeactivate = async () => {
    if (!deactivate) return;
    setDeactivateBusy(true);
    try {
      await updateMember(deactivate.id, { is_active: !deactivate.is_active });
      showToast("Status atualizado.", "success");
      setDeactivate(null);
      reload();
    } catch (e) {
      showToast(toErrorMessage(e), "error");
    } finally {
      setDeactivateBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-heading page-heading--row">
        <div>
          <h2>Equipe</h2>
          <p className="text-muted">
            Cadastre profissionais e conceda acesso. Cada barbeiro entra com o próprio login.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>+ Adicionar</Button>
      </div>

      {loading ? (
        <Loading label="Carregando equipe..." />
      ) : error ? (
        <EmptyState icon="!" title="Erro ao carregar" description={error} action={<button onClick={reload} className="btn btn--ghost">Tentar de novo</button>} />
      ) : (members ?? []).length === 0 ? (
        <EmptyState icon={<Users size={22} strokeWidth={1.5} />} title="Time vazio" description="Adicione o primeiro barbeiro para começar." action={<Button onClick={() => setInviteOpen(true)}>+ Adicionar</Button>} />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Profissional</th>
                <th>Função</th>
                <th>Status</th>
                <th aria-label="Ações"></th>
              </tr>
            </thead>
            <tbody>
              {(members ?? []).map((m) => (
                <tr key={m.id} className={!m.is_active ? "row-muted" : ""}>
                  <td>
                    <span className="inline-avatar">
                      <Avatar name={m.full_name} src={m.avatar_url} size="sm" />
                      <span>
                        <strong>{m.full_name}</strong>
                        {m.user_id ? (
                          <span className="table-sub">acesso criado</span>
                        ) : (
                          <span className="table-sub">sem acesso ainda</span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className="badge badge--ghost">
                      {m.role === "owner" ? "Dono" : "Barbeiro"}
                    </span>
                  </td>
                  <td>
                    {m.is_active ? (
                      <span className="badge badge--concluido">Ativo</span>
                    ) : (
                      <span className="badge badge--cancelado">Inativo</span>
                    )}
                  </td>
                  <td>
                    <div className="btn-row">
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(m)}>
                        Editar
                      </button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => void openHours(m)}>
                        Horários
                      </button>
                      <button
                        type="button"
                        className="btn btn--subtle btn--sm"
                        onClick={() => setDeactivate(m)}
                      >
                        {m.is_active ? "Desativar" : "Reativar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Convite */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Adicionar à equipe"
        footer={
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={doInvite} loading={inviteBusy}>
              Criar acesso
            </Button>
          </div>
        }
      >
        <div className="form-stack">
          <p className="text-muted">
            A pessoa vai entrar com o email e a senha temporária criada agora. Ela pode trocar a senha depois.
          </p>
          <Input label="Nome" name="inv-name" value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} />
          <Input label="Email" type="email" name="inv-email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
          <div className="form-grid-2">
            <Select label="Função" name="inv-role" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as "owner" | "barber" })}>
              <option value="barber">Barbeiro</option>
              <option value="owner">Dono</option>
            </Select>
            <Input label="Senha temporária" type="text" name="inv-pass" value={invite.password} onChange={(e) => setInvite({ ...invite, password: e.target.value })} />
          </div>
          <Input label='Sobre (opcional)' name="inv-bio" value={invite.bio} onChange={(e) => setInvite({ ...invite, bio: e.target.value })} />
          {inviteError ? <p className="form-error">{inviteError}</p> : null}
        </div>
      </Modal>

      {/* Editar perfil */}
      <Modal
        open={editMember !== null}
        onClose={() => setEditMember(null)}
        title="Editar profissional"
        footer={
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setEditMember(null)}>
              Cancelar
            </Button>
            <Button onClick={doEdit} loading={editBusy}>
              Salvar
            </Button>
          </div>
        }
      >
        <div className="form-stack">
          <Input label="Nome" name="edit-name" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
          <PhotoPicker
            name="edit-avatar"
            value={editForm.avatar_url || null}
            onChange={(url) => setEditForm({ ...editForm, avatar_url: url })}
          />
          <Input label="Sobre mim" name="edit-bio" value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} />
          {editError ? <p className="form-error">{editError}</p> : null}
        </div>
      </Modal>

      {/* Horários do profissional */}
      <Modal
        open={hoursMember !== null}
        onClose={() => setHoursMember(null)}
        title={`Horários · ${hoursMember?.full_name ?? ""}`}
        footer={
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setHoursMember(null)}>
              Cancelar
            </Button>
            <Button onClick={doSaveHours} loading={hoursBusy}>
              Salvar
            </Button>
          </div>
        }
      >
        {hoursRows ? (
          <HoursEditor rows={hoursRows} onChange={setHoursRows} />
        ) : (
          <Loading label="Carregando horários..." />
        )}
      </Modal>

      <ConfirmDialog
        open={deactivate !== null}
        title={deactivate?.is_active ? "Desativar profissional" : "Reativar profissional"}
        description={
          deactivate?.is_active
            ? `${deactivate?.full_name} deixa de receber novos agendamentos na página pública (o histórico é mantido).`
            : `${deactivate?.full_name} volta a ser listado na página pública e pode receber agendamentos.`
        }
        confirmLabel={deactivate?.is_active ? "Desativar" : "Reativar"}
        danger={deactivate?.is_active ?? false}
        busy={deactivateBusy}
        onCancel={() => setDeactivate(null)}
        onConfirm={() => void doDeactivate()}
      />
    </div>
  );
}