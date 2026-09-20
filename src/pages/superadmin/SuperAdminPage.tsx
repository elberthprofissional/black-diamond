import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Loading } from "../../components/ui/Loading";
import { Modal } from "../../components/ui/Modal";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  createShop,
  fetchSystemStats,
  inviteMember,
  listAllMembers,
  listAllShops,
  setShopActive,
  toErrorMessage,
} from "../../services/api";
import { isValidEmail, isValidName } from "../../utils/validation";
import type { Barbershop, Member } from "../../types";

export function SuperAdminPage() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { data, loading, error, reload } = useAsyncData(async () => {
    const [stats, shops, members] = await Promise.all([
      fetchSystemStats(),
      listAllShops(),
      listAllMembers(),
    ]);
    return { stats, shops, members };
  }, []);

  const ownersByShop = useMemo(() => {
    const map = new Map<string, Member[]>();
    for (const m of data?.members ?? []) {
      if (m.role !== "owner") continue;
      const list = map.get(m.barbershop_id) ?? [];
      list.push(m);
      map.set(m.barbershop_id, list);
    }
    return map;
  }, [data?.members]);

  const [createOpen, setCreateOpen] = useState(false);
  const [create, setCreate] = useState({ name: "", slug: "", description: "", whatsapp: "" });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);

  const [inviteShop, setInviteShop] = useState<Barbershop | null>(null);
  const [invite, setInvite] = useState({ name: "", email: "", password: "" });
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);

  const [toggleShop, setToggleShop] = useState<Barbershop | null>(null);
  const [toggleBusy, setToggleBusy] = useState(false);

  const doCreate = async () => {
    if (!create.name.trim() || !create.slug.trim()) {
      setCreateError("Preencha nome e slug.");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(create.slug)) {
      setCreateError("Slug: minúsculas, números e hífens.");
      return;
    }
    setCreateBusy(true);
    setCreateError(null);
    try {
      await createShop({
        name: create.name.trim(),
        slug: create.slug.trim(),
        description: create.description.trim() || undefined,
        whatsapp: create.whatsapp.replace(/\D/g, "") || undefined,
      });
      showToast("Barbearia criada. Agora convide o dono.", "success");
      setCreateOpen(false);
      setCreate({ name: "", slug: "", description: "", whatsapp: "" });
      reload();
    } catch (e) {
      setCreateError(toErrorMessage(e));
    } finally {
      setCreateBusy(false);
    }
  };

  const doInvite = async () => {
    if (!inviteShop) return;
    if (!isValidName(invite.name) || !isValidEmail(invite.email) || invite.password.length < 6) {
      setInviteError("Preencha nome, email válido e senha com ao menos 6 caracteres.");
      return;
    }
    setInviteBusy(true);
    setInviteError(null);
    try {
      await inviteMember({
        shopId: inviteShop.id,
        name: invite.name.trim(),
        email: invite.email.trim(),
        role: "owner",
        tempPassword: invite.password,
      });
      showToast(`Dono criado para ${inviteShop.name}.`, "success");
      setInviteShop(null);
      setInvite({ name: "", email: "", password: "" });
      reload();
    } catch (e) {
      setInviteError(toErrorMessage(e));
    } finally {
      setInviteBusy(false);
    }
  };

  const doToggle = async () => {
    if (!toggleShop) return;
    setToggleBusy(true);
    try {
      await setShopActive(toggleShop.id, !toggleShop.is_active);
      showToast("Status alterado.", "success");
      setToggleShop(null);
      reload();
    } catch (e) {
      showToast(toErrorMessage(e), "error");
    } finally {
      setToggleBusy(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="system-page">
      <header className="system-topbar">
        <div className="system-topbar__brand">
          <span className="sidebar__logo">◆</span>
          <strong>BLACK DIAMOND</strong>
          <span className="badge badge--ghost">SUPERADMIN</span>
        </div>
        <div className="system-topbar__right">
          <span className="muted">{profile?.full_name}</span>
          <Link to="/admin" className="btn btn--ghost btn--sm">
            Meu painel
          </Link>
          <button type="button" className="btn btn--subtle btn--sm" onClick={handleSignOut}>
            Sair
          </button>
        </div>
      </header>

      <main className="system-content">
        <div className="page-heading page-heading--row">
          <div>
            <h2>Sistema global</h2>
            <p className="text-muted">Todas as barbearias, donos e métricas da plataforma.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>+ Nova barbearia</Button>
        </div>

        {loading ? (
          <Loading label="Carregando visão global..." />
        ) : error ? (
          <EmptyState icon="!" title="Erro ao carregar" description={error} action={<button onClick={reload} className="btn btn--ghost">Tentar de novo</button>} />
        ) : (
          <>
            <div className="stat-grid">
              <div className="stat-card">
                <span className="stat-card__label">Barbearias</span>
                <strong className="stat-card__value">{data?.stats.shops ?? 0}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-card__label">Membros</span>
                <strong className="stat-card__value">{data?.stats.members ?? 0}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-card__label">Agendamentos</span>
                <strong className="stat-card__value">{data?.stats.appointments ?? 0}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-card__label">Clientes</span>
                <strong className="stat-card__value">{data?.stats.clients ?? 0}</strong>
              </div>
            </div>

            <section className="card">
              <div className="card__head">
                <h3>Barbearias cadastradas</h3>
                <span className="muted">{data?.shops.length ?? 0} no total</span>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Barbearia</th>
                      <th>Página pública</th>
                      <th>Dono(s)</th>
                      <th>Status</th>
                      <th aria-label="Ações"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.shops ?? []).map((s) => {
                      const owners = ownersByShop.get(s.id) ?? [];
                      return (
                        <tr key={s.id} className={!s.is_active ? "row-muted" : ""}>
                          <td>
                            <strong>{s.name}</strong>
                            {s.description ? <span className="table-sub">{s.description}</span> : null}
                          </td>
                          <td>
                            <Link className="link-btn" to={`/agendar/${s.slug}`} target="_blank">
                              /agendar/{s.slug}
                            </Link>
                          </td>
                          <td>
                            {owners.length === 0 ? (
                              <span className="muted">sem dono</span>
                            ) : (
                              owners.map((o) => (
                                <span key={o.id} className="inline-avatar">
                                  <Avatar name={o.full_name} src={o.avatar_url} size="sm" />
                                  {o.full_name}
                                </span>
                              ))
                            )}
                          </td>
                          <td>
                            {s.is_active ? (
                              <span className="badge badge--concluido">Ativa</span>
                            ) : (
                              <span className="badge badge--cancelado">Inativa</span>
                            )}
                          </td>
                          <td>
                            <div className="btn-row">
                              {owners.length === 0 ? (
                                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setInviteShop(s)}>
                                  Convidar dono
                                </button>
                              ) : null}
                              <button type="button" className="btn btn--subtle btn--sm" onClick={() => setToggleShop(s)}>
                                {s.is_active ? "Desativar" : "Ativar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {(data?.shops ?? []).length === 0 ? (
                <EmptyState icon="🏢" title="Nenhuma barbearia" description="Crie a primeira barbearia para começar a operar." />
              ) : null}
            </section>
          </>
        )}
      </main>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nova barbearia"
        footer={
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={doCreate} loading={createBusy}>
              Criar
            </Button>
          </div>
        }
      >
        <div className="form-stack">
          <Input label="Nome" name="sys-name" value={create.name} onChange={(e) => setCreate({ ...create, name: e.target.value })} />
          <Input label="Slug" name="sys-slug" value={create.slug} onChange={(e) => setCreate({ ...create, slug: e.target.value })} hint="URL pública: /agendar/{slug}" />
          <Input label="Descrição (opcional)" name="sys-desc" value={create.description} onChange={(e) => setCreate({ ...create, description: e.target.value })} />
          <Input label="WhatsApp (opcional)" name="sys-wa" value={create.whatsapp} onChange={(e) => setCreate({ ...create, whatsapp: e.target.value })} />
          {createError ? <p className="form-error">{createError}</p> : null}
        </div>
      </Modal>

      <Modal
        open={inviteShop !== null}
        onClose={() => setInviteShop(null)}
        title={`Convidar dono · ${inviteShop?.name ?? ""}`}
        footer={
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setInviteShop(null)}>
              Cancelar
            </Button>
            <Button onClick={doInvite} loading={inviteBusy}>
              Criar acesso
            </Button>
          </div>
        }
      >
        <div className="form-stack">
          <p className="text-muted">O dono fará login com este email e a senha temporária.</p>
          <Input label="Nome" name="inv-name" value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} />
          <Input label="Email" type="email" name="inv-email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
          <Input label="Senha temporária" name="inv-pass" value={invite.password} onChange={(e) => setInvite({ ...invite, password: e.target.value })} />
          {inviteError ? <p className="form-error">{inviteError}</p> : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={toggleShop !== null}
        title={toggleShop?.is_active ? "Desativar barbearia" : "Reativar barbearia"}
        description={
          toggleShop?.is_active
            ? "A página pública ficará indisponível e novos agendamentos serão bloqueados."
            : "A página pública volta a ficar disponível para agendamentos."
        }
        confirmLabel={toggleShop?.is_active ? "Desativar" : "Reativar"}
        danger={toggleShop?.is_active ?? false}
        busy={toggleBusy}
        onCancel={() => setToggleShop(null)}
        onConfirm={() => void doToggle()}
      />
    </div>
  );
}